"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { capitalizeText } from "@/lib/utils";
import { cleanDetalhes, type QuoteItemPresetDTO } from "@/lib/quoteItemPresets";

function mapPreset(row: {
  id: string;
  descricao: string;
  detalhes: Prisma.JsonValue | null;
}): QuoteItemPresetDTO {
  const detalhes = Array.isArray(row.detalhes)
    ? (row.detalhes as unknown[]).map((d) => String(d))
    : [];
  return { id: row.id, descricao: row.descricao, detalhes };
}

export type PresetResult =
  | { success: true; preset: QuoteItemPresetDTO }
  | { success: false; error: string };

export async function listQuoteItemPresets(): Promise<{
  success: boolean;
  presets: QuoteItemPresetDTO[];
}> {
  const auth = await requireAuth();
  try {
    const rows = await prisma.quoteItemPreset.findMany({
      where: { company_id: auth.companyId },
      orderBy: { descricao: "asc" },
      select: { id: true, descricao: true, detalhes: true },
    });
    return { success: true, presets: rows.map(mapPreset) };
  } catch (error) {
    console.error("Erro ao listar itens salvos:", error);
    return { success: false, presets: [] };
  }
}

export async function createQuoteItemPreset(input: {
  descricao: string;
  detalhes?: string[];
}): Promise<PresetResult> {
  const auth = await requireAuth();
  const descricao = capitalizeText((input.descricao ?? "").trim());
  if (!descricao) return { success: false, error: "Informe a descrição do item." };

  const detalhes = cleanDetalhes(input.detalhes);
  try {
    const row = await prisma.quoteItemPreset.create({
      data: {
        company_id: auth.companyId,
        descricao,
        detalhes: detalhes as Prisma.InputJsonValue,
      },
      select: { id: true, descricao: true, detalhes: true },
    });
    revalidatePath("/quotes");
    return { success: true, preset: mapPreset(row) };
  } catch (error) {
    console.error("Erro ao salvar item:", error);
    return { success: false, error: "Não foi possível salvar o item." };
  }
}

export async function updateQuoteItemPreset(
  id: string,
  input: { descricao: string; detalhes?: string[] }
): Promise<PresetResult> {
  const auth = await requireAuth();
  const descricao = capitalizeText((input.descricao ?? "").trim());
  if (!descricao) return { success: false, error: "Informe a descrição do item." };

  const existing = await prisma.quoteItemPreset.findFirst({
    where: { id, company_id: auth.companyId },
    select: { id: true },
  });
  if (!existing) return { success: false, error: "Item não encontrado." };

  const detalhes = cleanDetalhes(input.detalhes);
  try {
    const row = await prisma.quoteItemPreset.update({
      where: { id },
      data: { descricao, detalhes: detalhes as Prisma.InputJsonValue },
      select: { id: true, descricao: true, detalhes: true },
    });
    revalidatePath("/quotes");
    return { success: true, preset: mapPreset(row) };
  } catch (error) {
    console.error("Erro ao atualizar item:", error);
    return { success: false, error: "Não foi possível atualizar o item." };
  }
}

export async function deleteQuoteItemPreset(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireAuth();
  const existing = await prisma.quoteItemPreset.findFirst({
    where: { id, company_id: auth.companyId },
    select: { id: true },
  });
  if (!existing) return { success: false, error: "Item não encontrado." };

  try {
    await prisma.quoteItemPreset.delete({ where: { id } });
    revalidatePath("/quotes");
    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir item:", error);
    return { success: false, error: "Não foi possível excluir o item." };
  }
}
