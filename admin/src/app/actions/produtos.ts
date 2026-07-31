"use server";

import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";
import { prisma, isDatabaseOffline } from "@/lib/prisma";
import { assertCompanyAccess, getAuthContext } from "@/lib/auth-guard";
import { getModuleAccess, getWriteAccess } from "@/lib/moduleAccess";
import { canManageProducts } from "@/lib/permissions";
import { capitalizeText } from "@/lib/utils";

function denyProductMutation(cargo: string | null | undefined): string | null {
  if (!canManageProducts(cargo)) {
    return "Este cargo só pode visualizar produtos e catálogos.";
  }
  return null;
}

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
  supplier_id: string | null;
  supplierNome: string | null;
  supplierLogoUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ShowcaseSupplierOption = {
  id: string;
  nome: string;
  nomeFantasia: string | null;
  logoUrl: string | null;
};

type CrmUpload = { tipo?: string; url?: string; nome?: string };

function extractLogoUrl(crmUploads: unknown): string | null {
  if (!Array.isArray(crmUploads)) return null;
  const logo = crmUploads.find(
    (entry): entry is CrmUpload =>
      !!entry &&
      typeof entry === "object" &&
      (entry as CrmUpload).tipo === "Logo" &&
      typeof (entry as CrmUpload).url === "string"
  );
  return logo?.url ?? null;
}

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
  supplier_id?: string | null;
  supplier?: { nome: string; nomeFantasia: string | null; crmUploads: unknown } | null;
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
    supplier_id: row.supplier_id ?? null,
    supplierNome: row.supplier?.nomeFantasia || row.supplier?.nome || null,
    supplierLogoUrl: extractLogoUrl(row.supplier?.crmUploads),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const productInclude = {
  inventoryItem: { select: { nome: true } },
  supplier: { select: { nome: true, nomeFantasia: true, crmUploads: true } },
} as const;

export async function listShowcaseProducts(companyId: string, opts?: { ativoOnly?: boolean }) {
  const auth = await getModuleAccess("produtos");
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
      include: productInclude,
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    });
    return { success: true as const, products: products.map(mapProduct) };
  } catch (error) {
    console.error("Erro ao listar produtos do mostruário:", error);
    return { success: false as const, error: "Falha ao carregar produtos.", products: [] as ShowcaseProductDTO[] };
  }
}

async function resolveSupplierId(
  companyId: string,
  supplierId: string | null | undefined
): Promise<{ id: string } | { error: string } | null> {
  if (!supplierId) return null;
  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, company_id: companyId },
    select: { id: true },
  });
  if (!supplier) return { error: "Fornecedor não encontrado." };
  return { id: supplier.id };
}

export async function createShowcaseProduct(
  companyId: string,
  data: {
    nome: string;
    descricao?: string;
    categoria?: string;
    preco_exibicao?: number | null;
    inventory_item_id?: string | null;
    supplier_id?: string | null;
    ordem?: number;
    ativo?: boolean;
  }
) {
  const auth = await getWriteAccess("produtos");
  if (!auth) return { success: false as const, error: "Não autenticado" };
  const denied = denyProductMutation(auth.cargo);
  if (denied) return { success: false as const, error: denied };
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
  let supplierId: string | null = data.supplier_id || null;

  if (inventoryItemId) {
    const inv = await prisma.inventoryItem.findFirst({
      where: { id: inventoryItemId, company_id: companyId },
      select: { id: true, nome: true, categoria: true, preco_custo: true, supplier_id: true },
    });
    if (!inv) return { success: false as const, error: "Item de estoque não encontrado." };
    inventoryItemId = inv.id;
    if (!categoria) categoria = inv.categoria;
    if (preco == null) preco = Number(inv.preco_custo) * 2.2;
    if (!supplierId && inv.supplier_id) supplierId = inv.supplier_id;
  }

  if (supplierId) {
    const resolved = await resolveSupplierId(companyId, supplierId);
    if (!resolved) {
      supplierId = null;
    } else if ("error" in resolved) {
      return { success: false as const, error: resolved.error };
    } else {
      supplierId = resolved.id;
    }
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
        supplier_id: supplierId,
        ordem: data.ordem ?? 0,
        ativo: data.ativo ?? true,
        imagens: [],
      },
      include: productInclude,
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
    supplier_id?: string | null;
    ordem?: number;
    ativo?: boolean;
  }
) {
  const auth = await getWriteAccess("produtos");
  if (!auth) return { success: false as const, error: "Não autenticado" };
  const denied = denyProductMutation(auth.cargo);
  if (denied) return { success: false as const, error: denied };
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

  let supplierId: string | null | undefined =
    data.supplier_id === undefined ? undefined : data.supplier_id || null;
  if (supplierId) {
    const resolved = await resolveSupplierId(companyId, supplierId);
    if (!resolved) {
      supplierId = null;
    } else if ("error" in resolved) {
      return { success: false as const, error: resolved.error };
    } else {
      supplierId = resolved.id;
    }
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
        ...(supplierId !== undefined ? { supplier_id: supplierId } : {}),
        ...(data.ordem !== undefined ? { ordem: data.ordem } : {}),
        ...(data.ativo !== undefined ? { ativo: data.ativo } : {}),
      },
      include: productInclude,
    });
    revalidatePath("/produtos");
    return { success: true as const, product: mapProduct(product) };
  } catch (error) {
    console.error("Erro ao atualizar produto do mostruário:", error);
    return { success: false as const, error: "Não foi possível atualizar o produto." };
  }
}

export async function deleteShowcaseProduct(companyId: string, productId: string) {
  const auth = await getWriteAccess("produtos");
  if (!auth) return { success: false as const, error: "Não autenticado" };
  const denied = denyProductMutation(auth.cargo);
  if (denied) return { success: false as const, error: denied };
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
