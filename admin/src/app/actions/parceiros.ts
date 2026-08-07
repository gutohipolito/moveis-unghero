"use server";

import { PartnerType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma, isDatabaseOffline } from "@/lib/prisma";
import { assertCompanyAccess, getAuthContext } from "@/lib/auth-guard";
import { getModuleAccess, getWriteAccess } from "@/lib/moduleAccess";
import { canManageParceiros } from "@/lib/permissions";
import { capitalizeText } from "@/lib/utils";
import { normalizeCidade } from "@/lib/address";
import { maybeRedactForRole } from "@/lib/viewerRedact";

function denyParceiroMutation(cargo: string | null | undefined): string | null {
  if (!canManageParceiros(cargo)) {
    return "Este cargo só pode visualizar projetistas e arquitetos.";
  }
  return null;
}

export interface ParceiroDTO {
  id: string;
  nome: string;
  tipo: PartnerType;
  email: string | null;
  telefone: string | null;
  cidade: string | null;
  cep: string | null;
  endereco: string | null;
  escritorio: string | null;
  registro_profissional: string | null;
  origem: string | null;
  observacoes: string | null;
  ativo: boolean;
  fotoUrl: string | null;
  imagens: string | null;
  portfolioUrl: string | null;
  projects?: {
    id: string;
    valor_previsto: any;
    status_geral: string;
    client: {
      nome: string;
    };
  }[];
  createdAt: Date;
}

const parceiroDetailInclude = {
  projects: {
    select: {
      id: true,
      valor_previsto: true,
      status_geral: true,
      client: {
        select: {
          nome: true,
        },
      },
    },
  },
  quotes: {
    select: {
      project: {
        select: {
          id: true,
          valor_previsto: true,
          status_geral: true,
          client: {
            select: {
              nome: true,
            },
          },
        },
      },
    },
  },
} as const;

function mapParceiroRow(p: {
  id: string;
  nome: string;
  tipo: PartnerType;
  email: string | null;
  telefone: string | null;
  cidade: string | null;
  cep: string | null;
  endereco: string | null;
  escritorio: string | null;
  registro_profissional: string | null;
  origem: string | null;
  observacoes: string | null;
  ativo: boolean;
  fotoUrl: string | null;
  imagens: string | null;
  portfolioUrl: string | null;
  createdAt: Date;
  projects: NonNullable<ParceiroDTO["projects"]>;
  quotes: { project: NonNullable<ParceiroDTO["projects"]>[number] | null }[];
}): ParceiroDTO {
  const byId = new Map<string, NonNullable<ParceiroDTO["projects"]>[number]>();
  for (const proj of p.projects) {
    byId.set(proj.id, proj);
  }
  for (const quote of p.quotes) {
    if (quote.project && !byId.has(quote.project.id)) {
      byId.set(quote.project.id, quote.project);
    }
  }
  const { quotes: _quotes, ...rest } = p;
  return {
    ...rest,
    projects: Array.from(byId.values()),
  } as unknown as ParceiroDTO;
}

export async function getParceiros(companyId: string) {
  const auth = await getModuleAccess("parceiros");
  if (!auth) {
    return { success: false as const, error: "Não autenticado", parceiros: [] as ParceiroDTO[] };
  }
  try {
    assertCompanyAccess(auth, companyId);
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Acesso negado",
      parceiros: [] as ParceiroDTO[],
    };
  }

  if (isDatabaseOffline()) {
    return { success: false as const, error: "Banco de dados indisponível.", parceiros: [] as ParceiroDTO[] };
  }

  try {
    const parceiros = await prisma.professionalPartner.findMany({
      where: { company_id: companyId },
      include: parceiroDetailInclude,
      orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    });

    const mapped: ParceiroDTO[] = parceiros.map(mapParceiroRow);

    return {
      success: true as const,
      parceiros: maybeRedactForRole(mapped, auth.cargo),
    };
  } catch (error) {
    console.error("Erro ao buscar parceiros:", error);
    return { success: false as const, error: "Falha ao carregar parceiros.", parceiros: [] as ParceiroDTO[] };
  }
}

export async function getParceiroById(partnerId: string) {
  const auth = await getModuleAccess("parceiros");
  if (!auth) {
    return { success: false as const, error: "Não autenticado.", parceiro: null };
  }

  if (isDatabaseOffline()) {
    return { success: false as const, error: "Banco de dados indisponível.", parceiro: null };
  }

  try {
    const row = await prisma.professionalPartner.findFirst({
      where: { id: partnerId, company_id: auth.companyId },
      include: parceiroDetailInclude,
    });
    if (!row) {
      return { success: false as const, error: "Parceiro não encontrado.", parceiro: null };
    }

    const mapped = mapParceiroRow(row);
    const [redacted] = maybeRedactForRole([mapped], auth.cargo);
    return { success: true as const, parceiro: redacted ?? mapped };
  } catch (error) {
    console.error("Erro ao buscar parceiro:", error);
    return { success: false as const, error: "Falha ao carregar parceiro.", parceiro: null };
  }
}

export async function createParceiro(
  companyId: string,
  data: {
    nome: string;
    tipo: PartnerType;
    email?: string;
    telefone?: string;
    cidade?: string;
    escritorio?: string;
    registro_profissional?: string;
    origem?: string;
    observacoes?: string;
    fotoUrl?: string;
    imagens?: string;
    portfolioUrl?: string;
  }
) {
  const auth = await getWriteAccess("parceiros");
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  const denied = denyParceiroMutation(auth.cargo);
  if (denied) return { success: false, error: denied };
  try {
    assertCompanyAccess(auth, companyId);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Acesso negado",
    };
  }

  if (isDatabaseOffline()) {
    return { success: false, error: "Cadastro indisponível no modo demonstração offline." };
  }

  try {
    const parceiro = await prisma.professionalPartner.create({
      data: {
        company_id: companyId,
        nome: capitalizeText(data.nome),
        tipo: data.tipo,
        email: data.email?.trim() || null,
        telefone: data.telefone?.trim() || null,
        cidade: data.cidade ? normalizeCidade(data.cidade).cidade || null : null,
        escritorio: data.escritorio ? capitalizeText(data.escritorio) : null,
        registro_profissional: data.registro_profissional?.trim() || null,
        origem: data.origem?.trim() || null,
        observacoes: data.observacoes?.trim() || null,
        fotoUrl: data.fotoUrl?.trim() || null,
        imagens: data.imagens?.trim() || null,
        portfolioUrl: data.portfolioUrl?.trim() || null,
      },
    });

    revalidatePath("/parceiros");
    return { success: true, parceiro };
  } catch (error: unknown) {
    console.error("Erro ao criar parceiro:", error);
    return { success: false, error: error instanceof Error ? error.message : "Erro ao cadastrar." };
  }
}

export async function updateParceiro(
  id: string,
  data: {
    nome?: string;
    tipo?: PartnerType;
    email?: string;
    telefone?: string;
    cidade?: string;
    cep?: string;
    endereco?: string;
    escritorio?: string;
    registro_profissional?: string;
    origem?: string;
    observacoes?: string;
    ativo?: boolean;
    fotoUrl?: string;
    imagens?: string;
    portfolioUrl?: string;
  }
) {
  const auth = await getWriteAccess("parceiros");
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  const denied = denyParceiroMutation(auth.cargo);
  if (denied) return { success: false, error: denied };

  if (isDatabaseOffline()) {
    return { success: false, error: "Cadastro indisponível no modo demonstração offline." };
  }

  try {
    const existing = await prisma.professionalPartner.findFirst({
      where: { id, company_id: auth.companyId },
    });
    if (!existing) {
      return { success: false, error: "Parceiro não encontrado." };
    }

    const parceiro = await prisma.professionalPartner.update({
      where: { id },
      data: {
        ...(data.nome !== undefined ? { nome: capitalizeText(data.nome) } : {}),
        ...(data.tipo !== undefined ? { tipo: data.tipo } : {}),
        ...(data.email !== undefined ? { email: data.email.trim() || null } : {}),
        ...(data.telefone !== undefined ? { telefone: data.telefone.trim() || null } : {}),
        ...(data.cidade !== undefined
          ? { cidade: data.cidade ? normalizeCidade(data.cidade).cidade || null : null }
          : {}),
        ...(data.cep !== undefined
          ? { cep: data.cep?.replace(/\D/g, "").slice(0, 8) || null }
          : {}),
        ...(data.endereco !== undefined
          ? { endereco: data.endereco ? capitalizeText(data.endereco) : null }
          : {}),
        ...(data.escritorio !== undefined ? { escritorio: data.escritorio ? capitalizeText(data.escritorio) : null } : {}),
        ...(data.registro_profissional !== undefined
          ? { registro_profissional: data.registro_profissional.trim() || null }
          : {}),
        ...(data.origem !== undefined ? { origem: data.origem.trim() || null } : {}),
        ...(data.observacoes !== undefined ? { observacoes: data.observacoes.trim() || null } : {}),
        ...(data.ativo !== undefined ? { ativo: data.ativo } : {}),
        ...(data.fotoUrl !== undefined ? { fotoUrl: data.fotoUrl?.trim() || null } : {}),
        ...(data.imagens !== undefined ? { imagens: data.imagens?.trim() || null } : {}),
        ...(data.portfolioUrl !== undefined ? { portfolioUrl: data.portfolioUrl?.trim() || null } : {}),
      },
      include: {
        projects: {
          select: {
            id: true,
            valor_previsto: true,
            status_geral: true,
            client: {
              select: {
                nome: true,
              }
            }
          }
        }
      }
    });

    revalidatePath("/parceiros");
    revalidatePath(`/parceiros/${id}`);
    return { success: true, parceiro: parceiro as unknown as ParceiroDTO };
  } catch (error: unknown) {
    console.error("Erro ao atualizar parceiro:", error);
    return { success: false, error: error instanceof Error ? error.message : "Erro ao atualizar." };
  }
}

export async function deleteParceiro(id: string) {
  const auth = await getWriteAccess("parceiros");
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  const denied = denyParceiroMutation(auth.cargo);
  if (denied) return { success: false, error: denied };

  if (isDatabaseOffline()) {
    return { success: false, error: "Cadastro indisponível no modo demonstração offline." };
  }

  try {
    const existing = await prisma.professionalPartner.findFirst({
      where: { id, company_id: auth.companyId },
    });
    if (!existing) {
      return { success: false, error: "Parceiro não encontrado." };
    }

    await prisma.professionalPartner.delete({ where: { id } });
    revalidatePath("/parceiros");
    return { success: true };
  } catch (error: unknown) {
    console.error("Erro ao excluir parceiro:", error);
    return { success: false, error: error instanceof Error ? error.message : "Erro ao excluir." };
  }
}
