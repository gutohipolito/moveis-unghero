"use server";

import { PartnerType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma, isDatabaseOffline } from "@/lib/prisma";
import { assertCompanyAccess, getAuthContext } from "@/lib/auth-guard";

export interface ParceiroDTO {
  id: string;
  nome: string;
  tipo: PartnerType;
  email: string | null;
  telefone: string | null;
  cidade: string | null;
  escritorio: string | null;
  observacoes: string | null;
  ativo: boolean;
  createdAt: Date;
}

export async function getParceiros(companyId: string) {
  const auth = await getAuthContext();
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
      orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    });

    return { success: true as const, parceiros };
  } catch (error) {
    console.error("Erro ao buscar parceiros:", error);
    return { success: false as const, error: "Falha ao carregar parceiros.", parceiros: [] as ParceiroDTO[] };
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
    observacoes?: string;
  }
) {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
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
        nome: data.nome.trim(),
        tipo: data.tipo,
        email: data.email?.trim() || null,
        telefone: data.telefone?.trim() || null,
        cidade: data.cidade?.trim() || null,
        escritorio: data.escritorio?.trim() || null,
        observacoes: data.observacoes?.trim() || null,
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
    escritorio?: string;
    observacoes?: string;
    ativo?: boolean;
  }
) {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }

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
        ...(data.nome !== undefined ? { nome: data.nome.trim() } : {}),
        ...(data.tipo !== undefined ? { tipo: data.tipo } : {}),
        ...(data.email !== undefined ? { email: data.email.trim() || null } : {}),
        ...(data.telefone !== undefined ? { telefone: data.telefone.trim() || null } : {}),
        ...(data.cidade !== undefined ? { cidade: data.cidade.trim() || null } : {}),
        ...(data.escritorio !== undefined ? { escritorio: data.escritorio.trim() || null } : {}),
        ...(data.observacoes !== undefined ? { observacoes: data.observacoes.trim() || null } : {}),
        ...(data.ativo !== undefined ? { ativo: data.ativo } : {}),
      },
    });

    revalidatePath("/parceiros");
    return { success: true, parceiro };
  } catch (error: unknown) {
    console.error("Erro ao atualizar parceiro:", error);
    return { success: false, error: error instanceof Error ? error.message : "Erro ao atualizar." };
  }
}

export async function deleteParceiro(id: string) {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }

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
