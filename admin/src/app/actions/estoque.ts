"use server";

import { revalidatePath } from "next/cache";
import { prisma, isDatabaseOffline } from "@/lib/prisma";
import { assertCompanyAccess, getAuthContext } from "@/lib/auth-guard";
import { getModuleAccess, getWriteAccess } from "@/lib/moduleAccess";
import { capitalizeText } from "@/lib/utils";
import type { AuthContext } from "@/lib/auth-guard";
import { canDeleteEstoque, isFactoryRole as isFactoryCargo } from "@/lib/permissions";

function denyFactoryWrite(auth: AuthContext): string | null {
  if (isFactoryCargo(auth.cargo)) {
    return "O cargo Marceneiro não pode alterar estoque ou fornecedores.";
  }
  return null;
}

function denyEstoqueDelete(auth: AuthContext): string | null {
  if (!canDeleteEstoque(auth.cargo)) {
    return "Este cargo não pode excluir itens de estoque ou fornecedores.";
  }
  return null;
}

export interface Supplier {
  id: string;
  nome: string;
  cnpj: string;
  telefone: string;
  email: string;
  principalMaterial: string;
  crmStatus?: string;
  crmNota?: number | null;
  logoUrl?: string | null;
  nomeFantasia?: string | null;
}

export interface InventoryItem {
  id: string;
  nome: string;
  categoria: string;
  quantidade: number;
  minima: number;
  precoCusto: number;
  supplierId?: string;
  supplierName?: string;
}

export interface InventoryImportRow {
  nome: string;
  categoria?: string;
  quantidade?: number;
  minima?: number;
  precoCusto?: number;
  supplierNome?: string;
}

type CrmUpload = { tipo?: string; url?: string; nome?: string };

type DbSupplier = {
  id: string;
  nome: string;
  cnpj: string;
  telefone: string;
  email: string;
  principal_material: string;
  crmStatus?: string;
  crmNota?: number | null;
  nomeFantasia?: string | null;
  crmUploads?: unknown;
};

type DbInventoryItem = {
  id: string;
  nome: string;
  categoria: string;
  quantidade: number;
  minima: number;
  preco_custo: { toString(): string } | number;
  supplier_id: string | null;
  supplier?: { nome: string } | null;
};

function extractLogoUrl(crmUploads: unknown): string | undefined {
  if (!Array.isArray(crmUploads)) return undefined;
  const logo = crmUploads.find(
    (entry): entry is CrmUpload =>
      !!entry &&
      typeof entry === "object" &&
      (entry as CrmUpload).tipo === "Logo" &&
      typeof (entry as CrmUpload).url === "string"
  );
  return logo?.url;
}

function withLogoUploads(
  existing: unknown,
  logoUrl: string | null | undefined
): { tipo: string; url: string; nome: string }[] {
  const list = Array.isArray(existing)
    ? existing.filter(
        (entry) =>
          !(
            entry &&
            typeof entry === "object" &&
            (entry as CrmUpload).tipo === "Logo"
          )
      )
    : [];
  if (logoUrl) {
    list.unshift({ tipo: "Logo", url: logoUrl, nome: "logo" });
  }
  return list as { tipo: string; url: string; nome: string }[];
}

function mapSupplier(row: DbSupplier): Supplier {
  return {
    id: row.id,
    nome: row.nome,
    cnpj: row.cnpj,
    telefone: row.telefone,
    email: row.email,
    principalMaterial: row.principal_material,
    crmStatus: row.crmStatus,
    crmNota: row.crmNota,
    logoUrl: extractLogoUrl(row.crmUploads),
    nomeFantasia: row.nomeFantasia,
  };
}

function mapInventoryItem(row: DbInventoryItem): InventoryItem {
  return {
    id: row.id,
    nome: row.nome,
    categoria: row.categoria,
    quantidade: row.quantidade,
    minima: row.minima,
    precoCusto: Number(row.preco_custo),
    supplierId: row.supplier_id ?? undefined,
    supplierName: row.supplier?.nome,
  };
}

export async function getInventoryAndSuppliers(companyId: string) {
  const auth = await getModuleAccess("estoque");
  if (!auth) {
    return { success: false as const, suppliers: [] as Supplier[], inventory: [] as InventoryItem[] };
  }
  try {
    assertCompanyAccess(auth, companyId);
  } catch {
    return { success: false as const, suppliers: [] as Supplier[], inventory: [] as InventoryItem[] };
  }

  if (isDatabaseOffline()) {
    return { success: true as const, suppliers: [] as Supplier[], inventory: [] as InventoryItem[] };
  }

  try {
    const [suppliers, inventory] = await Promise.all([
      prisma.supplier.findMany({
        where: { company_id: companyId, ativo: true },
        orderBy: { nome: "asc" },
      }),
      prisma.inventoryItem.findMany({
        where: { company_id: companyId, ativo: true },
        include: { supplier: { select: { nome: true } } },
        orderBy: { nome: "asc" },
      }),
    ]);

    const mappedInventory = inventory.map(mapInventoryItem);
    const safeInventory =
      auth.cargo === "PRODUCAO"
        ? mappedInventory.map((item) => ({ ...item, precoCusto: 0 }))
        : mappedInventory;

    return {
      success: true as const,
      suppliers: suppliers.map(mapSupplier),
      inventory: safeInventory,
    };
  } catch (error) {
    console.error("Erro ao carregar estoque:", error);
    return { success: false as const, suppliers: [] as Supplier[], inventory: [] as InventoryItem[] };
  }
}

export async function createSupplierAction(
  data: Omit<Supplier, "id"> & { company_id: string; logoUrl?: string | null }
) {
  const auth = await getWriteAccess("estoque");
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  const factoryDeny = denyFactoryWrite(auth);
  if (factoryDeny) {
    return { success: false, error: factoryDeny };
  }
  try {
    assertCompanyAccess(auth, data.company_id);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Acesso negado",
    };
  }

  if (isDatabaseOffline()) {
    return { success: false, error: "Banco de dados indisponível." };
  }

  try {
    const logoUrl = data.logoUrl?.trim() || undefined;
    const supplier = await prisma.supplier.create({
      data: {
        company_id: data.company_id,
        nome: capitalizeText(data.nome),
        cnpj: data.cnpj.trim(),
        telefone: (data.telefone || "").trim(),
        email: (data.email || "").trim(),
        principal_material: capitalizeText(data.principalMaterial || ""),
        ...(data.nomeFantasia
          ? { nomeFantasia: capitalizeText(data.nomeFantasia) }
          : {}),
        ...(logoUrl ? { crmUploads: withLogoUploads(null, logoUrl) } : {}),
      },
    });

    revalidatePath("/estoque");
    return { success: true, supplier: mapSupplier(supplier) };
  } catch (error) {
    console.error("Erro ao criar fornecedor:", error);
    return { success: false, error: "Não foi possível cadastrar o fornecedor." };
  }
}

export async function updateSupplierAction(
  id: string,
  companyId: string,
  data: Partial<Supplier> & { logoUrl?: string | null }
) {
  const auth = await getWriteAccess("estoque");
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  const factoryDeny = denyFactoryWrite(auth);
  if (factoryDeny) {
    return { success: false, error: factoryDeny };
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
    return { success: false, error: "Banco de dados indisponível." };
  }

  try {
    const existing = await prisma.supplier.findFirst({
      where: { id, company_id: companyId },
    });
    if (!existing) {
      return { success: false, error: "Fornecedor não encontrado." };
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        ...(data.nome !== undefined ? { nome: capitalizeText(data.nome) } : {}),
        ...(data.cnpj !== undefined ? { cnpj: data.cnpj.trim() } : {}),
        ...(data.telefone !== undefined ? { telefone: data.telefone.trim() } : {}),
        ...(data.email !== undefined ? { email: data.email.trim() } : {}),
        ...(data.principalMaterial !== undefined
          ? { principal_material: capitalizeText(data.principalMaterial) }
          : {}),
        ...(data.nomeFantasia !== undefined
          ? {
              nomeFantasia: data.nomeFantasia
                ? capitalizeText(data.nomeFantasia)
                : null,
            }
          : {}),
        ...(data.logoUrl !== undefined
          ? { crmUploads: withLogoUploads(existing.crmUploads, data.logoUrl) }
          : {}),
      },
    });

    revalidatePath("/estoque");
    return { success: true, supplier: mapSupplier(supplier) };
  } catch (error) {
    console.error("Erro ao atualizar fornecedor:", error);
    return { success: false, error: "Não foi possível atualizar o fornecedor." };
  }
}

export async function deleteSupplierAction(id: string, companyId: string) {
  const auth = await getWriteAccess("estoque");
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  const factoryDeny = denyFactoryWrite(auth);
  if (factoryDeny) {
    return { success: false, error: factoryDeny };
  }
  const deleteDeny = denyEstoqueDelete(auth);
  if (deleteDeny) {
    return { success: false, error: deleteDeny };
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
    return { success: false, error: "Banco de dados indisponível." };
  }

  try {
    const existing = await prisma.supplier.findFirst({
      where: { id, company_id: companyId },
    });
    if (!existing) {
      return { success: false, error: "Fornecedor não encontrado." };
    }

    await prisma.supplier.delete({ where: { id } });
    revalidatePath("/estoque");
    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir fornecedor:", error);
    return { success: false, error: "Não foi possível remover o fornecedor." };
  }
}

export async function createInventoryItemAction(
  data: Omit<InventoryItem, "id" | "supplierName"> & { company_id: string }
) {
  const auth = await getWriteAccess("estoque");
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  const factoryDeny = denyFactoryWrite(auth);
  if (factoryDeny) {
    return { success: false, error: factoryDeny };
  }
  try {
    assertCompanyAccess(auth, data.company_id);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Acesso negado",
    };
  }

  if (isDatabaseOffline()) {
    return { success: false, error: "Banco de dados indisponível." };
  }

  try {
    if (data.supplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: { id: data.supplierId, company_id: data.company_id },
      });
      if (!supplier) {
        return { success: false, error: "Fornecedor inválido para esta empresa." };
      }
    }

    const item = await prisma.inventoryItem.create({
      data: {
        company_id: data.company_id,
        nome: capitalizeText(data.nome),
        categoria: data.categoria,
        quantidade: Math.max(0, Math.round(Number(data.quantidade))),
        minima: Math.max(0, Math.round(Number(data.minima))),
        preco_custo: Number(data.precoCusto),
        supplier_id: data.supplierId || null,
      },
      include: { supplier: { select: { nome: true } } },
    });

    revalidatePath("/estoque");
    return { success: true, item: mapInventoryItem(item) };
  } catch (error) {
    console.error("Erro ao criar insumo:", error);
    return { success: false, error: "Não foi possível cadastrar o insumo." };
  }
}

export async function updateInventoryItemAction(
  id: string,
  companyId: string,
  data: Partial<InventoryItem>
) {
  const auth = await getWriteAccess("estoque");
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  const factoryDeny = denyFactoryWrite(auth);
  if (factoryDeny) {
    return { success: false, error: factoryDeny };
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
    return { success: false, error: "Banco de dados indisponível." };
  }

  try {
    const existing = await prisma.inventoryItem.findFirst({
      where: { id, company_id: companyId },
    });
    if (!existing) {
      return { success: false, error: "Insumo não encontrado." };
    }

    if (data.supplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: { id: data.supplierId, company_id: companyId },
      });
      if (!supplier) {
        return { success: false, error: "Fornecedor inválido para esta empresa." };
      }
    }

    const item = await prisma.inventoryItem.update({
      where: { id },
      data: {
        ...(data.nome !== undefined ? { nome: capitalizeText(data.nome) } : {}),
        ...(data.categoria !== undefined ? { categoria: data.categoria } : {}),
        ...(data.quantidade !== undefined
          ? { quantidade: Math.max(0, Math.round(Number(data.quantidade))) }
          : {}),
        ...(data.minima !== undefined
          ? { minima: Math.max(0, Math.round(Number(data.minima))) }
          : {}),
        ...(data.precoCusto !== undefined ? { preco_custo: Number(data.precoCusto) } : {}),
        ...(data.supplierId !== undefined ? { supplier_id: data.supplierId || null } : {}),
      },
      include: { supplier: { select: { nome: true } } },
    });

    revalidatePath("/estoque");
    return { success: true, item: mapInventoryItem(item) };
  } catch (error) {
    console.error("Erro ao atualizar insumo:", error);
    return { success: false, error: "Não foi possível atualizar o insumo." };
  }
}

export async function deleteInventoryItemAction(id: string, companyId: string) {
  const auth = await getWriteAccess("estoque");
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  const factoryDeny = denyFactoryWrite(auth);
  if (factoryDeny) {
    return { success: false, error: factoryDeny };
  }
  const deleteDeny = denyEstoqueDelete(auth);
  if (deleteDeny) {
    return { success: false, error: deleteDeny };
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
    return { success: false, error: "Banco de dados indisponível." };
  }

  try {
    const existing = await prisma.inventoryItem.findFirst({
      where: { id, company_id: companyId },
    });
    if (!existing) {
      return { success: false, error: "Insumo não encontrado." };
    }

    await prisma.inventoryItem.delete({ where: { id } });
    revalidatePath("/estoque");
    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir insumo:", error);
    return { success: false, error: "Não foi possível remover o insumo." };
  }
}

export async function deductInventoryAction(
  companyId: string,
  itemsToDeduct: Array<{ itemId: string; quantity: number }>
) {
  const auth = await getWriteAccess("estoque");
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  const factoryDeny = denyFactoryWrite(auth);
  if (factoryDeny) {
    return { success: false, error: factoryDeny };
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
    return { success: false, message: "Banco de dados indisponível." };
  }

  if (itemsToDeduct.length === 0) {
    return { success: true, message: "Nenhum item para baixar." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const entry of itemsToDeduct) {
        const qty = Math.max(0, Math.round(Number(entry.quantity)));
        if (qty <= 0) continue;

        const item = await tx.inventoryItem.findFirst({
          where: { id: entry.itemId, company_id: companyId, ativo: true },
        });
        if (!item) {
          throw new Error(`Insumo não encontrado: ${entry.itemId}`);
        }
        if (item.quantidade < qty) {
          throw new Error(`Estoque insuficiente para "${item.nome}".`);
        }

        await tx.inventoryItem.update({
          where: { id: item.id },
          data: { quantidade: item.quantidade - qty },
        });
      }
    });

    revalidatePath("/estoque");
    return { success: true, message: "Baixa realizada com sucesso no estoque físico!" };
  } catch (error) {
    console.error("Erro ao baixar estoque:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Não foi possível baixar o estoque.",
    };
  }
}

function normalizeCategory(value: string | undefined, fallback: string) {
  const raw = (value ?? fallback).trim();
  if (!raw) return fallback;
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function resolveSupplierIdByName(companyId: string, supplierNome?: string) {
  const name = supplierNome?.trim();
  if (!name) return null;

  const suppliers = await prisma.supplier.findMany({
    where: { company_id: companyId, ativo: true },
    select: { id: true, nome: true },
  });

  const match = suppliers.find(
    (s) => s.nome.localeCompare(name, "pt-BR", { sensitivity: "accent" }) === 0
  );
  return match?.id ?? null;
}

export async function importInventoryBulkAction(
  companyId: string,
  rows: InventoryImportRow[],
  options?: { defaultCategoria?: string; skipEmpty?: boolean }
) {
  const auth = await getWriteAccess("estoque");
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  const factoryDeny = denyFactoryWrite(auth);
  if (factoryDeny) {
    return { success: false, error: factoryDeny };
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
    return {
      success: false,
      error: "Banco de dados indisponível.",
      imported: 0,
      skipped: rows.length,
      errors: [] as string[],
    };
  }

  const defaultCategoria = options?.defaultCategoria ?? "OUTROS";
  const skipEmpty = options?.skipEmpty ?? true;
  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;

  try {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const line = i + 1;
      const nome = row.nome?.trim();

      if (!nome) {
        if (skipEmpty) {
          skipped++;
          continue;
        }
        errors.push(`Linha ${line}: nome obrigatório.`);
        skipped++;
        continue;
      }

      const supplierId = await resolveSupplierIdByName(companyId, row.supplierNome);

      try {
        await prisma.inventoryItem.create({
          data: {
            company_id: companyId,
            nome,
            categoria: normalizeCategory(row.categoria, defaultCategoria),
            quantidade: Math.max(0, Math.round(Number(row.quantidade ?? 0))),
            minima: Math.max(0, Math.round(Number(row.minima ?? 0))),
            preco_custo: Number(row.precoCusto ?? 0),
            supplier_id: supplierId,
          },
        });
        imported++;
      } catch (error) {
        console.error(`Erro na linha ${line}:`, error);
        errors.push(`Linha ${line}: não foi possível importar "${nome}".`);
        skipped++;
      }
    }

    revalidatePath("/estoque");
    return {
      success: errors.length === 0,
      imported,
      skipped,
      errors,
      error:
        errors.length > 0
          ? `${imported} importado(s), ${errors.length} com erro.`
          : undefined,
    };
  } catch (error) {
    console.error("Erro na importação em lote:", error);
    return {
      success: false,
      imported,
      skipped,
      errors,
      error: "Falha ao importar estoque.",
    };
  }
}
