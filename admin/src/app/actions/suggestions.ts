"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {requireModuleAccess, requireWriteAccess } from "@/lib/moduleAccess";
import { capitalizeText } from "@/lib/utils";
import type { SuggestionDTO, SuggestionStatus } from "@/lib/suggestions";

type SuggestionRow = {
  id: string;
  titulo: string;
  descricao: string | null;
  status: SuggestionStatus;
  created_by: string;
  author: { name: string } | null;
  resolver: { name: string } | null;
  createdAt: Date;
  doneAt: Date | null;
};

const SUGGESTION_INCLUDE = {
  author: { select: { name: true } },
  resolver: { select: { name: true } },
} as const;

function mapSuggestion(row: SuggestionRow): SuggestionDTO {
  return {
    id: row.id,
    titulo: row.titulo,
    descricao: row.descricao,
    status: row.status,
    authorId: row.created_by,
    authorName: row.author?.name ?? "—",
    resolverName: row.resolver?.name ?? null,
    createdAt: row.createdAt.toISOString(),
    doneAt: row.doneAt ? row.doneAt.toISOString() : null,
  };
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

  const titulo = capitalizeText((input.titulo ?? "").trim());
  const descricao = (input.descricao ?? "").trim();
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
