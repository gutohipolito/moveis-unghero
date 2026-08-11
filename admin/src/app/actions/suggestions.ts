"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess, requireWriteAccess } from "@/lib/moduleAccess";
import { capitalizeText } from "@/lib/utils";
import { checkRateLimitAsync } from "@/lib/rateLimit";
import { parsePartnerSessionToken } from "@/lib/partnerSession";
import type { SuggestionDTO, SuggestionStatus } from "@/lib/suggestions";

const PARTNER_SUGGESTION_LIMIT = 3;
const PARTNER_SUGGESTION_WINDOW_MS = 60 * 60 * 1000;
const TITLE_MAX = 160;
const DESC_MAX = 1000;

type SuggestionRow = {
  id: string;
  titulo: string;
  descricao: string | null;
  status: SuggestionStatus;
  created_by: string | null;
  partner_id: string | null;
  author: { name: string } | null;
  partner: { nome: string } | null;
  resolver: { name: string } | null;
  createdAt: Date;
  doneAt: Date | null;
};

const SUGGESTION_INCLUDE = {
  author: { select: { name: true } },
  partner: { select: { nome: true } },
  resolver: { select: { name: true } },
} as const;

function mapSuggestion(row: SuggestionRow): SuggestionDTO {
  const fromPartner = Boolean(row.partner_id);
  const partnerName = row.partner?.nome?.trim();
  return {
    id: row.id,
    titulo: row.titulo,
    descricao: row.descricao,
    status: row.status,
    authorId: row.created_by ?? row.partner_id ?? "",
    authorName: fromPartner
      ? partnerName
        ? `Parceiro · ${partnerName}`
        : "Parceiro"
      : row.author?.name ?? "—",
    fromPartner,
    resolverName: row.resolver?.name ?? null,
    createdAt: row.createdAt.toISOString(),
    doneAt: row.doneAt ? row.doneAt.toISOString() : null,
  };
}

function normalizeSuggestionInput(input: { titulo: string; descricao?: string | null }) {
  const titulo = capitalizeText((input.titulo ?? "").trim()).slice(0, TITLE_MAX);
  const descricao = (input.descricao ?? "").trim().slice(0, DESC_MAX);
  return { titulo, descricao };
}

export type SuggestionResult =
  | { success: true; suggestion: SuggestionDTO }
  | { success: false; error: string };

export async function listSuggestions(): Promise<{
  success: boolean;
  suggestions: SuggestionDTO[];
}> {
  const auth = await requireModuleAccess("melhorias");
  try {
    const rows = await prisma.suggestion.findMany({
      where: { company_id: auth.companyId },
      include: SUGGESTION_INCLUDE,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
    return { success: true, suggestions: rows.map((r) => mapSuggestion(r as SuggestionRow)) };
  } catch (error) {
    console.error("Erro ao listar melhorias:", error);
    return { success: false, suggestions: [] };
  }
}

export async function createSuggestion(input: {
  titulo: string;
  descricao?: string | null;
}): Promise<SuggestionResult> {
  const auth = await requireWriteAccess("melhorias");

  const { titulo, descricao } = normalizeSuggestionInput(input);
  if (!titulo) return { success: false, error: "Descreva a sugestão de melhoria." };

  try {
    const row = await prisma.suggestion.create({
      data: {
        company_id: auth.companyId,
        titulo,
        descricao: descricao || null,
        created_by: auth.userId,
      },
      include: SUGGESTION_INCLUDE,
    });
    revalidatePath("/melhorias");
    return { success: true, suggestion: mapSuggestion(row as SuggestionRow) };
  } catch (error) {
    console.error("Erro ao criar melhoria:", error);
    return { success: false, error: "Não foi possível enviar a sugestão." };
  }
}

/** Portal do parceiro: só envia, sem listar. Máximo 3 por hora. */
export async function createPartnerSuggestion(input: {
  titulo: string;
  descricao?: string | null;
}): Promise<SuggestionResult> {
  const cookieStore = await cookies();
  const partnerId = parsePartnerSessionToken(
    cookieStore.get("parceiro-session")?.value
  );
  if (!partnerId) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const { titulo, descricao } = normalizeSuggestionInput(input);
  if (!titulo) return { success: false, error: "Descreva a sugestão de melhoria." };

  const partner = await prisma.professionalPartner.findFirst({
    where: { id: partnerId, ativo: true },
    select: { id: true, company_id: true },
  });
  if (!partner) {
    return { success: false, error: "Parceiro não encontrado ou inativo." };
  }

  const since = new Date(Date.now() - PARTNER_SUGGESTION_WINDOW_MS);
  const recent = await prisma.suggestion.count({
    where: { partner_id: partner.id, createdAt: { gte: since } },
  });
  if (recent >= PARTNER_SUGGESTION_LIMIT) {
    return {
      success: false,
      error: `Limite de ${PARTNER_SUGGESTION_LIMIT} sugestões por hora. Tente novamente mais tarde.`,
    };
  }

  const rate = await checkRateLimitAsync(`partner-sug:${partner.id}`, {
    limit: PARTNER_SUGGESTION_LIMIT,
    windowMs: PARTNER_SUGGESTION_WINDOW_MS,
  });
  if (!rate.ok) {
    const minutes = Math.max(1, Math.ceil(rate.retryAfterSec / 60));
    return {
      success: false,
      error: `Limite de ${PARTNER_SUGGESTION_LIMIT} sugestões por hora. Tente novamente em ${minutes} min.`,
    };
  }

  try {
    const row = await prisma.suggestion.create({
      data: {
        company_id: partner.company_id,
        titulo,
        descricao: descricao || null,
        partner_id: partner.id,
      },
      include: SUGGESTION_INCLUDE,
    });
    revalidatePath("/melhorias");
    return { success: true, suggestion: mapSuggestion(row as SuggestionRow) };
  } catch (error) {
    console.error("Erro ao criar melhoria do parceiro:", error);
    return { success: false, error: "Não foi possível enviar a sugestão." };
  }
}

/** Marca/desmarca uma sugestão como concluída. */
export async function setSuggestionDone(
  id: string,
  done: boolean
): Promise<SuggestionResult> {
  const auth = await requireWriteAccess("melhorias");

  const existing = await prisma.suggestion.findFirst({
    where: { id, company_id: auth.companyId },
    select: { id: true },
  });
  if (!existing) return { success: false, error: "Sugestão não encontrada." };

  try {
    const row = await prisma.suggestion.update({
      where: { id },
      data: {
        status: done ? "CONCLUIDA" : "ABERTA",
        done_by: done ? auth.userId : null,
        doneAt: done ? new Date() : null,
      },
      include: SUGGESTION_INCLUDE,
    });
    revalidatePath("/melhorias");
    return { success: true, suggestion: mapSuggestion(row as SuggestionRow) };
  } catch (error) {
    console.error("Erro ao atualizar melhoria:", error);
    return { success: false, error: "Não foi possível atualizar a sugestão." };
  }
}

/** Remove uma sugestão. Permitido ao autor ou a um admin. */
export async function deleteSuggestion(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireWriteAccess("melhorias");

  const existing = await prisma.suggestion.findFirst({
    where: { id, company_id: auth.companyId },
    select: { id: true, created_by: true },
  });
  if (!existing) return { success: false, error: "Sugestão não encontrada." };

  const isOwner = existing.created_by === auth.userId;
  const isAdmin = auth.cargo === "ADMIN";
  if (!isOwner && !isAdmin) {
    return { success: false, error: "Sem permissão para remover esta sugestão." };
  }

  try {
    await prisma.suggestion.delete({ where: { id } });
    revalidatePath("/melhorias");
    return { success: true };
  } catch (error) {
    console.error("Erro ao remover melhoria:", error);
    return { success: false, error: "Não foi possível remover a sugestão." };
  }
}
