"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth , assertCanWrite } from "@/lib/auth-guard";
import { getModuleAccess } from "@/lib/moduleAccess";
import { capitalizeText } from "@/lib/utils";
import {
  type QuoteItemPresetDTO,
  type QuoteDetailPresetDTO,
} from "@/lib/quoteItemPresets";

function mapPreset(row: { id: string; descricao: string }): QuoteItemPresetDTO {
  return { id: row.id, descricao: row.descricao };
}

export type PresetResult =
  | { success: true; preset: QuoteItemPresetDTO }
  | { success: false; error: string };

export async function listQuoteItemPresets(): Promise<{
  success: boolean;
  presets: QuoteItemPresetDTO[];
}> {
  const auth = await requireAuth();
  assertCanWrite(auth);
  try {
    const rows = await prisma.quoteItemPreset.findMany({
      where: { company_id: auth.companyId },
      orderBy: { descricao: "asc" },
      select: { id: true, descricao: true },
    });
    return { success: true, presets: rows.map(mapPreset) };
  } catch (error) {
    console.error("Erro ao listar itens salvos:", error);
    return { success: false, presets: [] };
  }
}

export async function createQuoteItemPreset(input: {
  descricao: string;
}): Promise<PresetResult> {
  const auth = await requireAuth();
  assertCanWrite(auth);
  const descricao = capitalizeText((input.descricao ?? "").trim());
  if (!descricao) return { success: false, error: "Informe a descrição do item." };

  try {
    const existing = await prisma.quoteItemPreset.findFirst({
      where: {
        company_id: auth.companyId,
        descricao: { equals: descricao, mode: "insensitive" },
      },
      select: { id: true, descricao: true },
    });
    if (existing) return { success: true, preset: mapPreset(existing) };

    const row = await prisma.quoteItemPreset.create({
      data: { company_id: auth.companyId, descricao },
      select: { id: true, descricao: true },
    });
    revalidatePath("/quotes");
    return { success: true, preset: mapPreset(row) };
  } catch (error) {
    console.error("Erro ao salvar item:", error);
    return { success: false, error: "Não foi possível salvar o item." };
  }
}

export async function createQuoteItemPresetsBulk(input: {
  descricoes: string[];
}): Promise<{ success: boolean; presets: QuoteItemPresetDTO[]; error?: string }> {
  const auth = await requireAuth();
  assertCanWrite(auth);
  const nomes = Array.from(
    new Set(
      (input.descricoes ?? [])
        .map((d) => capitalizeText((d ?? "").trim()).slice(0, 160))
        .filter(Boolean)
    )
  );
  if (nomes.length === 0)
    return { success: false, presets: [], error: "Informe ao menos uma descrição." };

  try {
    const result: QuoteItemPresetDTO[] = [];
    for (const descricao of nomes) {
      const existing = await prisma.quoteItemPreset.findFirst({
        where: {
          company_id: auth.companyId,
          descricao: { equals: descricao, mode: "insensitive" },
        },
        select: { id: true, descricao: true },
      });
      if (existing) {
        result.push(mapPreset(existing));
        continue;
      }
      const row = await prisma.quoteItemPreset.create({
        data: { company_id: auth.companyId, descricao },
        select: { id: true, descricao: true },
      });
      result.push(mapPreset(row));
    }
    revalidatePath("/quotes");
    return { success: true, presets: result };
  } catch (error) {
    console.error("Erro ao salvar itens em lote:", error);
    return { success: false, presets: [], error: "Não foi possível salvar os itens." };
  }
}

export async function updateQuoteItemPreset(
  id: string,
  input: { descricao: string }
): Promise<PresetResult> {
  const auth = await requireAuth();
  assertCanWrite(auth);
  const descricao = capitalizeText((input.descricao ?? "").trim());
  if (!descricao) return { success: false, error: "Informe a descrição do item." };

  const existing = await prisma.quoteItemPreset.findFirst({
    where: { id, company_id: auth.companyId },
    select: { id: true },
  });
  if (!existing) return { success: false, error: "Item não encontrado." };

  try {
    const row = await prisma.quoteItemPreset.update({
      where: { id },
      data: { descricao },
      select: { id: true, descricao: true },
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
  assertCanWrite(auth);
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
  assertCanWrite(auth);
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
  assertCanWrite(auth);
  const texto = capitalizeText((input.texto ?? "").trim());
  if (!texto) return { success: false, error: "Informe o detalhe." };

  try {
    const existing = await prisma.quoteDetailPreset.findFirst({
      where: {
        company_id: auth.companyId,
        texto: { equals: texto, mode: "insensitive" },
      },
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

export async function createQuoteDetailPresetsBulk(input: {
  textos: string[];
}): Promise<{ success: boolean; details: QuoteDetailPresetDTO[]; error?: string }> {
  const auth = await requireAuth();
  assertCanWrite(auth);
  const textos = Array.from(
    new Set(
      (input.textos ?? [])
        .map((t) => capitalizeText((t ?? "").trim()).slice(0, 160))
        .filter(Boolean)
    )
  );
  if (textos.length === 0)
    return { success: false, details: [], error: "Informe ao menos um detalhe." };

  try {
    const result: QuoteDetailPresetDTO[] = [];
    for (const texto of textos) {
      const existing = await prisma.quoteDetailPreset.findFirst({
        where: {
          company_id: auth.companyId,
          texto: { equals: texto, mode: "insensitive" },
        },
        select: { id: true, texto: true },
      });
      if (existing) {
        result.push(existing);
        continue;
      }
      const row = await prisma.quoteDetailPreset.create({
        data: { company_id: auth.companyId, texto },
        select: { id: true, texto: true },
      });
      result.push(row);
    }
    revalidatePath("/quotes");
    return { success: true, details: result };
  } catch (error) {
    console.error("Erro ao salvar detalhes em lote:", error);
    return { success: false, details: [], error: "Não foi possível salvar os detalhes." };
  }
}

export async function updateQuoteDetailPreset(
  id: string,
  input: { texto: string }
): Promise<DetailPresetResult> {
  const auth = await requireAuth();
  assertCanWrite(auth);
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
  assertCanWrite(auth);
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
