"use server";

import { PartnerQuoteCardMode, PartnerType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma, isDatabaseOffline } from "@/lib/prisma";
import { assertCompanyAccess } from "@/lib/auth-guard";
import { getModuleAccess, getWriteAccess } from "@/lib/moduleAccess";
import { canManageParceiros, isOpsLimitedRole } from "@/lib/permissions";
import { capitalizeText } from "@/lib/utils";
import { normalizeCidade } from "@/lib/address";
import { maybeRedactForRole } from "@/lib/viewerRedact";
import { getPartnerRoleLabel } from "@/lib/partnerTypes";

const QUOTE_CARD_MODES = new Set<PartnerQuoteCardMode>([
  "HIDDEN",
  "UNVERIFIED",
  "VERIFIED",
]);

function parseQuoteCardMode(
  value: PartnerQuoteCardMode | string | undefined
): PartnerQuoteCardMode | undefined {
  if (value === undefined) return undefined;
  return QUOTE_CARD_MODES.has(value as PartnerQuoteCardMode)
    ? (value as PartnerQuoteCardMode)
    : undefined;
}

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
  quote_card_mode: PartnerQuoteCardMode;
  cadastro_canal: string | null;
  lgpd_aceite: boolean;
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

export interface PartnerActivity {
  id: string;
  data: string;
  titulo: string;
  descricao: string;
  autor: string;
  tipo?: "cadastro" | "nota";
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
  quote_card_mode: PartnerQuoteCardMode;
  cadastro_canal: string | null;
  lgpd_aceite: boolean;
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
    const activities = isOpsLimitedRole(auth.cargo)
      ? []
      : await loadParceiroActivities(row.id, row.createdAt, row.tipo, row.origem, row.nome);
    return {
      success: true as const,
      parceiro: redacted ?? mapped,
      activities,
    };
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
    quote_card_mode?: PartnerQuoteCardMode | string;
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

  const quoteCardMode = parseQuoteCardMode(data.quote_card_mode) ?? "HIDDEN";

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
        origem: data.origem?.trim() || "PAINEL",
        observacoes: data.observacoes?.trim() || null,
        fotoUrl: data.fotoUrl?.trim() || null,
        imagens: data.imagens?.trim() || null,
        portfolioUrl: data.portfolioUrl?.trim() || null,
        cadastro_canal: "OPERADOR",
        quote_card_mode: quoteCardMode,
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
    quote_card_mode?: PartnerQuoteCardMode | string;
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

    const quoteCardMode = parseQuoteCardMode(data.quote_card_mode);

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
        ...(quoteCardMode !== undefined ? { quote_card_mode: quoteCardMode } : {}),
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
    if (data.ativo !== undefined && data.ativo !== existing.ativo) {
      const { invalidateCompanyNotifications } = await import(
        "@/lib/fetchCompanyNotifications"
      );
      invalidateCompanyNotifications(auth.companyId);
      try {
        await prisma.partnerTimeline.create({
          data: {
            partner_id: id,
            user_id: auth.userId,
            acao: data.ativo
              ? "Portal liberado — Parceiro pode entrar em /parceiro com e-mail, telefone e código."
              : "Portal suspenso — Login do parceiro bloqueado até nova liberação.",
          },
        });
      } catch (error) {
        console.warn("Falha ao registrar histórico de portal do parceiro:", error);
      }
    }
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

function mapPartnerTimelineToActivity(entry: {
  id: string;
  data: Date;
  acao: string;
  user: { name: string };
}): PartnerActivity {
  const separator = " — ";
  const idx = entry.acao.indexOf(separator);
  if (idx === -1) {
    return {
      id: entry.id,
      data: entry.data.toISOString(),
      titulo: entry.acao,
      descricao: "",
      autor: entry.user.name,
    };
  }
  return {
    id: entry.id,
    data: entry.data.toISOString(),
    titulo: entry.acao.slice(0, idx),
    descricao: entry.acao.slice(idx + separator.length),
    autor: entry.user.name,
  };
}

function buildParceiroRegistrationActivity(
  partnerId: string,
  cadastroEm: Date,
  tipo: PartnerType,
  origem: string | null,
  nome: string
): PartnerActivity {
  const formatted = cadastroEm.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const papel = getPartnerRoleLabel(tipo, nome);
  const origemLabel = origem?.trim() || "não informada";
  return {
    id: `registration-${partnerId}`,
    data: cadastroEm.toISOString(),
    titulo: "Cadastro criado",
    descricao: `${papel} registrado na base em ${formatted}. Origem: ${origemLabel}.`,
    autor: "Sistema",
    tipo: "cadastro",
  };
}

async function loadParceiroActivities(
  partnerId: string,
  createdAt: Date,
  tipo: PartnerType,
  origem: string | null,
  nome: string
): Promise<PartnerActivity[]> {
  const entries = await prisma.partnerTimeline.findMany({
    where: { partner_id: partnerId },
    include: { user: { select: { name: true } } },
    orderBy: { data: "desc" },
  });
  return [
    ...entries.map(mapPartnerTimelineToActivity),
    buildParceiroRegistrationActivity(partnerId, createdAt, tipo, origem, nome),
  ];
}

export async function addParceiroActivityAction(
  partnerId: string,
  titulo: string,
  descricao: string
) {
  const auth = await getWriteAccess("parceiros");
  if (!auth) {
    return { success: false as const, error: "Não autenticado" };
  }
  if (isOpsLimitedRole(auth.cargo)) {
    return { success: false as const, error: "Linha do tempo não disponível para este cargo." };
  }
  const denied = denyParceiroMutation(auth.cargo);
  if (denied) return { success: false as const, error: denied };

  if (isDatabaseOffline()) {
    return { success: false as const, error: "Banco de dados indisponível." };
  }

  const title = titulo.trim();
  const detail = descricao.trim();
  if (!title || !detail) {
    return { success: false as const, error: "Assunto e detalhamento são obrigatórios." };
  }

  const partner = await prisma.professionalPartner.findFirst({
    where: { id: partnerId, company_id: auth.companyId },
    select: { id: true },
  });
  if (!partner) {
    return { success: false as const, error: "Parceiro não encontrado." };
  }

  try {
    const entry = await prisma.partnerTimeline.create({
      data: {
        partner_id: partnerId,
        user_id: auth.userId,
        acao: `${title} — ${detail}`,
      },
      include: { user: { select: { name: true } } },
    });
    revalidatePath(`/parceiros/${partnerId}`);
    return {
      success: true as const,
      activity: mapPartnerTimelineToActivity(entry),
    };
  } catch (error) {
    console.error("Erro ao registrar atividade do parceiro:", error);
    return { success: false as const, error: "Não foi possível salvar a atividade." };
  }
}

export async function updateParceiroObservacoesAction(
  partnerId: string,
  observacoes: string
) {
  return updateParceiro(partnerId, { observacoes });
}
