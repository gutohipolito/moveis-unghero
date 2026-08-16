"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertCanWrite } from "@/lib/auth-guard";
import { capitalizeText } from "@/lib/utils";
import {
  type QuoteItemPresetDTO,
  type QuoteDetailPresetDTO,
  type QuotePresetInventoryOption,
} from "@/lib/quoteItemPresets";

function mapItemPreset(row: {
  id: string;
  descricao: string;
  imagem_url: string | null;
}): QuoteItemPresetDTO {
  return {
    id: row.id,
    descricao: row.descricao,
    imagem_url: row.imagem_url ?? null,
  };
}

function mapDetailPreset(row: {
  id: string;
  texto: string;
  imagem_url: string | null;
  inventory_item_id: string | null;
  inventoryItem?: { nome: string } | null;
}): QuoteDetailPresetDTO {
  return {
    id: row.id,
    texto: row.texto,
    imagem_url: row.imagem_url ?? null,
    inventory_item_id: row.inventory_item_id ?? null,
    inventory_item_nome: row.inventoryItem?.nome ?? null,
  };
}

const ITEM_SELECT = {
  id: true,
  descricao: true,
  imagem_url: true,
} as const;

const DETAIL_SELECT = {
  id: true,
  texto: true,
  imagem_url: true,
  inventory_item_id: true,
  inventoryItem: { select: { nome: true } },
} as const;

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
      select: ITEM_SELECT,
    });
    return { success: true, presets: rows.map(mapItemPreset) };
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
      select: ITEM_SELECT,
    });
    if (existing) return { success: true, preset: mapItemPreset(existing) };

    const row = await prisma.quoteItemPreset.create({
      data: { company_id: auth.companyId, descricao },
      select: ITEM_SELECT,
    });
    revalidatePath("/quotes");
    return { success: true, preset: mapItemPreset(row) };
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
        select: ITEM_SELECT,
      });
      if (existing) {
        result.push(mapItemPreset(existing));
        continue;
      }
      const row = await prisma.quoteItemPreset.create({
        data: { company_id: auth.companyId, descricao },
        select: ITEM_SELECT,
      });
      result.push(mapItemPreset(row));
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
      select: ITEM_SELECT,
    });
    revalidatePath("/quotes");
    return { success: true, preset: mapItemPreset(row) };
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
    select: { id: true, imagem_url: true },
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

async function resolveInventoryItemId(
  companyId: string,
  inventoryItemId: string | null
): Promise<{ id: string | null; error?: string }> {
  if (!inventoryItemId) return { id: null };
  const item = await prisma.inventoryItem.findFirst({
    where: { id: inventoryItemId, company_id: companyId, ativo: true },
    select: { id: true },
  });
  if (!item) return { id: null, error: "Item de estoque não encontrado." };
  return { id: item.id };
}

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
      select: DETAIL_SELECT,
    });
    return { success: true, details: rows.map(mapDetailPreset) };
  } catch (error) {
    console.error("Erro ao listar detalhes globais:", error);
    return { success: false, details: [] };
  }
}

export async function listQuotePresetInventoryOptions(): Promise<{
  success: boolean;
  items: QuotePresetInventoryOption[];
}> {
  const auth = await requireAuth();
  assertCanWrite(auth);
  try {
    const rows = await prisma.inventoryItem.findMany({
      where: { company_id: auth.companyId, ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, categoria: true },
    });
    return { success: true, items: rows };
  } catch (error) {
    console.error("Erro ao listar estoque para presets:", error);
    return { success: false, items: [] };
  }
}

export async function createQuoteDetailPreset(input: {
  texto: string;
  inventory_item_id?: string | null;
}): Promise<DetailPresetResult> {
  const auth = await requireAuth();
  assertCanWrite(auth);
  const texto = capitalizeText((input.texto ?? "").trim());
  if (!texto) return { success: false, error: "Informe o detalhe." };

  const stock =
    input.inventory_item_id !== undefined
      ? await resolveInventoryItemId(auth.companyId, input.inventory_item_id)
      : { id: null as string | null };
  if (stock.error) return { success: false, error: stock.error };

  try {
    const existing = await prisma.quoteDetailPreset.findFirst({
      where: {
        company_id: auth.companyId,
        texto: { equals: texto, mode: "insensitive" },
      },
      select: DETAIL_SELECT,
    });
    if (existing) {
      if (input.inventory_item_id !== undefined) {
        const updated = await prisma.quoteDetailPreset.update({
          where: { id: existing.id },
          data: { inventory_item_id: stock.id },
          select: DETAIL_SELECT,
        });
        revalidatePath("/quotes");
        return { success: true, detail: mapDetailPreset(updated) };
      }
      return { success: true, detail: mapDetailPreset(existing) };
    }

    const row = await prisma.quoteDetailPreset.create({
      data: {
        company_id: auth.companyId,
        texto,
        inventory_item_id: input.inventory_item_id !== undefined ? stock.id : null,
      },
      select: DETAIL_SELECT,
    });
    revalidatePath("/quotes");
    return { success: true, detail: mapDetailPreset(row) };
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
        select: DETAIL_SELECT,
      });
      if (existing) {
        result.push(mapDetailPreset(existing));
        continue;
      }
      const row = await prisma.quoteDetailPreset.create({
        data: { company_id: auth.companyId, texto },
        select: DETAIL_SELECT,
      });
      result.push(mapDetailPreset(row));
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
  input: { texto: string; inventory_item_id?: string | null }
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

  const stock =
    input.inventory_item_id !== undefined
      ? await resolveInventoryItemId(auth.companyId, input.inventory_item_id)
      : null;
  if (stock?.error) return { success: false, error: stock.error };

  try {
    const row = await prisma.quoteDetailPreset.update({
      where: { id },
      data: {
        texto,
        ...(stock ? { inventory_item_id: stock.id } : {}),
      },
      select: DETAIL_SELECT,
    });
    revalidatePath("/quotes");
    return { success: true, detail: mapDetailPreset(row) };
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
