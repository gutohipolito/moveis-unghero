"use server";

import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";
import { prisma, isDatabaseOffline } from "@/lib/prisma";
import { assertCompanyAccess, getAuthContext } from "@/lib/auth-guard";
import { capitalizeText } from "@/lib/utils";

export type ShowcaseProductDTO = {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  imagem_url: string | null;
  imagem_mime: string | null;
  imagens: string[];
  preco_exibicao: number | null;
  ordem: number;
  ativo: boolean;
  inventory_item_id: string | null;
  inventoryItemNome: string | null;
  createdAt: string;
  updatedAt: string;
};

function resolveImagens(row: {
  imagens?: string[] | null;
  imagem_url: string | null;
}): string[] {
  const fromArray = (row.imagens || []).filter(Boolean);
  if (fromArray.length > 0) return fromArray;
  return row.imagem_url ? [row.imagem_url] : [];
}

function mapProduct(row: {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  imagem_url: string | null;
  imagem_mime: string | null;
  imagens?: string[] | null;
  preco_exibicao: { toString(): string } | number | null;
  ordem: number;
  ativo: boolean;
  inventory_item_id: string | null;
  inventoryItem?: { nome: string } | null;
  createdAt: Date;
  updatedAt: Date;
}): ShowcaseProductDTO {
  const imagens = resolveImagens(row);
  return {
    id: row.id,
    nome: row.nome,
    descricao: row.descricao,
    categoria: row.categoria,
    imagem_url: imagens[0] || row.imagem_url,
    imagem_mime: row.imagem_mime,
    imagens,
    preco_exibicao: row.preco_exibicao == null ? null : Number(row.preco_exibicao),
    ordem: row.ordem,
    ativo: row.ativo,
    inventory_item_id: row.inventory_item_id,
    inventoryItemNome: row.inventoryItem?.nome ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listShowcaseProducts(companyId: string, opts?: { ativoOnly?: boolean }) {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false as const, error: "Não autenticado", products: [] as ShowcaseProductDTO[] };
  }
  try {
    assertCompanyAccess(auth, companyId);
  } catch {
    return { success: false as const, error: "Acesso negado", products: [] as ShowcaseProductDTO[] };
  }

  if (isDatabaseOffline()) {
    return { success: true as const, products: [] as ShowcaseProductDTO[] };
  }

  try {
    const products = await prisma.showcaseProduct.findMany({
      where: {
        company_id: companyId,
        ...(opts?.ativoOnly ? { ativo: true } : {}),
      },
      include: { inventoryItem: { select: { nome: true } } },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    });
    return { success: true as const, products: products.map(mapProduct) };
  } catch (error) {
    console.error("Erro ao listar produtos do mostruário:", error);
    return { success: false as const, error: "Falha ao carregar produtos.", products: [] as ShowcaseProductDTO[] };
  }
}

export async function createShowcaseProduct(
  companyId: string,
  data: {
    nome: string;
    descricao?: string;
    categoria?: string;
    preco_exibicao?: number | null;
    inventory_item_id?: string | null;
    ordem?: number;
    ativo?: boolean;
  }
) {
  const auth = await getAuthContext();
  if (!auth) return { success: false as const, error: "Não autenticado" };
  try {
    assertCompanyAccess(auth, companyId);
  } catch {
    return { success: false as const, error: "Acesso negado" };
  }

  const nome = capitalizeText(data.nome?.trim() || "");
  if (!nome) return { success: false as const, error: "Informe o nome do produto." };

  let inventoryItemId: string | null = data.inventory_item_id || null;
  let categoria = data.categoria?.trim() || null;
  let preco = data.preco_exibicao ?? null;
  let descricao = data.descricao?.trim() || null;

  if (inventoryItemId) {
    const inv = await prisma.inventoryItem.findFirst({
      where: { id: inventoryItemId, company_id: companyId },
      select: { id: true, nome: true, categoria: true, preco_custo: true },
    });
    if (!inv) return { success: false as const, error: "Item de estoque não encontrado." };
    inventoryItemId = inv.id;
    if (!categoria) categoria = inv.categoria;
    if (preco == null) preco = Number(inv.preco_custo) * 2.2;
  }

  try {
    const product = await prisma.showcaseProduct.create({
      data: {
        company_id: companyId,
        nome,
        descricao,
        categoria,
        preco_exibicao: preco,
        inventory_item_id: inventoryItemId,
        ordem: data.ordem ?? 0,
        ativo: data.ativo ?? true,
        imagens: [],
      },
      include: { inventoryItem: { select: { nome: true } } },
    });
    revalidatePath("/produtos");
    return { success: true as const, product: mapProduct(product) };
  } catch (error) {
    console.error("Erro ao criar produto do mostruário:", error);
    return { success: false as const, error: "Não foi possível salvar o produto." };
  }
}

export async function updateShowcaseProduct(
  companyId: string,
  productId: string,
  data: {
    nome?: string;
    descricao?: string | null;
    categoria?: string | null;
    preco_exibicao?: number | null;
    inventory_item_id?: string | null;
    ordem?: number;
    ativo?: boolean;
  }
) {
  const auth = await getAuthContext();
  if (!auth) return { success: false as const, error: "Não autenticado" };
  try {
    assertCompanyAccess(auth, companyId);
  } catch {
    return { success: false as const, error: "Acesso negado" };
  }

  const existing = await prisma.showcaseProduct.findFirst({
    where: { id: productId, company_id: companyId },
    select: { id: true },
  });
  if (!existing) return { success: false as const, error: "Produto não encontrado." };

  let inventoryItemId =
    data.inventory_item_id === undefined ? undefined : data.inventory_item_id || null;

  if (inventoryItemId) {
    const inv = await prisma.inventoryItem.findFirst({
      where: { id: inventoryItemId, company_id: companyId },
      select: { id: true },
    });
    if (!inv) return { success: false as const, error: "Item de estoque não encontrado." };
    inventoryItemId = inv.id;
  }

  try {
    const product = await prisma.showcaseProduct.update({
      where: { id: productId },
      data: {
        ...(data.nome !== undefined ? { nome: capitalizeText(data.nome.trim()) } : {}),
        ...(data.descricao !== undefined
          ? { descricao: data.descricao?.trim() || null }
          : {}),
        ...(data.categoria !== undefined
          ? { categoria: data.categoria?.trim() || null }
          : {}),
        ...(data.preco_exibicao !== undefined ? { preco_exibicao: data.preco_exibicao } : {}),
        ...(inventoryItemId !== undefined ? { inventory_item_id: inventoryItemId } : {}),
        ...(data.ordem !== undefined ? { ordem: data.ordem } : {}),
        ...(data.ativo !== undefined ? { ativo: data.ativo } : {}),
      },
      include: { inventoryItem: { select: { nome: true } } },
    });
    revalidatePath("/produtos");
    return { success: true as const, product: mapProduct(product) };
  } catch (error) {
    console.error("Erro ao atualizar produto do mostruário:", error);
    return { success: false as const, error: "Não foi possível atualizar o produto." };
  }
}

export async function deleteShowcaseProduct(companyId: string, productId: string) {
  const auth = await getAuthContext();
  if (!auth) return { success: false as const, error: "Não autenticado" };
  try {
    assertCompanyAccess(auth, companyId);
  } catch {
    return { success: false as const, error: "Acesso negado" };
  }

  const existing = await prisma.showcaseProduct.findFirst({
    where: { id: productId, company_id: companyId },
  });
  if (!existing) return { success: false as const, error: "Produto não encontrado." };

  try {
    const urls = Array.from(
      new Set(
        [
          ...(existing.imagens || []),
          existing.imagem_url,
        ].filter((u): u is string => Boolean(u))
      )
    );

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      await Promise.all(
        urls
          .filter((url) => url.includes("blob.vercel-storage.com"))
          .map((url) =>
            del(url, { token: process.env.BLOB_READ_WRITE_TOKEN }).catch(() => undefined)
          )
      );
    }

    await prisma.showcaseProduct.delete({ where: { id: productId } });
    revalidatePath("/produtos");
    return { success: true as const };
  } catch (error) {
    console.error("Erro ao excluir produto do mostruário:", error);
    return { success: false as const, error: "Não foi possível excluir o produto." };
  }
}
