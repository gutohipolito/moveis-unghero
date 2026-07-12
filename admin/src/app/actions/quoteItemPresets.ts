"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { capitalizeText } from "@/lib/utils";
import {
  cleanDetalhes,
  type QuoteItemPresetDTO,
  type QuoteDetailPresetDTO,
} from "@/lib/quoteItemPresets";

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

/* ------------------------------------------------------------------ */
/* Detalhes globais (avulsos) — reutilizáveis por qualquer item        */
/* ------------------------------------------------------------------ */

export type DetailPresetResult =
  | { success: true; detail: QuoteDetailPresetDTO }
  | { success: false; error: string };

export async function listQuoteDetailPresets(): Promise<{
  success: boolean;
  details: QuoteDetailPresetDTO[];
}> {
  const auth = await requireAuth();
  try {
    const rows = await prisma.quoteDetailPreset.findMany({
      where: { company_id: auth.companyId },
      orderBy: { texto: "asc" },
      select: { id: true, texto: true },
    });
    return { success: true, details: rows };
  } catch (error) {
    console.error("Erro ao listar detalhes globais:", error);
    return { success: false, details: [] };
  }
}

export async function createQuoteDetailPreset(input: {
  texto: string;
}): Promise<DetailPresetResult> {
  const auth = await requireAuth();
  const texto = capitalizeText((input.texto ?? "").trim());
  if (!texto) return { success: false, error: "Informe o detalhe." };

  try {
    const existing = await prisma.quoteDetailPreset.findFirst({
      where: { company_id: auth.companyId, texto },
      select: { id: true, texto: true },
    });
    if (existing) return { success: true, detail: existing };

    const row = await prisma.quoteDetailPreset.create({
      data: { company_id: auth.companyId, texto },
      select: { id: true, texto: true },
    });
    revalidatePath("/quotes");
    return { success: true, detail: row };
  } catch (error) {
    console.error("Erro ao salvar detalhe:", error);
    return { success: false, error: "Não foi possível salvar o detalhe." };
  }
}

export async function updateQuoteDetailPreset(
  id: string,
  input: { texto: string }
): Promise<DetailPresetResult> {
  const auth = await requireAuth();
  const texto = capitalizeText((input.texto ?? "").trim());
  if (!texto) return { success: false, error: "Informe o detalhe." };

  const existing = await prisma.quoteDetailPreset.findFirst({
    where: { id, company_id: auth.companyId },
    select: { id: true },
  });
  if (!existing) return { success: false, error: "Detalhe não encontrado." };

  try {
    const row = await prisma.quoteDetailPreset.update({
      where: { id },
      data: { texto },
      select: { id: true, texto: true },
    });
    revalidatePath("/quotes");
    return { success: true, detail: row };
  } catch (error) {
    console.error("Erro ao atualizar detalhe:", error);
    return { success: false, error: "Não foi possível atualizar o detalhe." };
  }
}

export async function deleteQuoteDetailPreset(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireAuth();
  const existing = await prisma.quoteDetailPreset.findFirst({
    where: { id, company_id: auth.companyId },
    select: { id: true },
  });
  if (!existing) return { success: false, error: "Detalhe não encontrado." };

  try {
    await prisma.quoteDetailPreset.delete({ where: { id } });
    revalidatePath("/quotes");
    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir detalhe:", error);
    return { success: false, error: "Não foi possível excluir o detalhe." };
  }
}
