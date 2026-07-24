"use server";

import { revalidatePath } from "next/cache";
import { prisma, isDatabaseOffline } from "@/lib/prisma";
import { assertCompanyAccess, getAuthContext } from "@/lib/auth-guard";
import { getModuleAccess } from "@/lib/moduleAccess";

export interface ProductCatalogDTO {
  id: string;
  titulo: string;
  descricao: string | null;
  marca: string | null;
  arquivo_url: string;
  arquivo_nome: string;
  mime_type: string;
  size_bytes: number | null;
  capa_url: string | null;
  ordem: number;
  ativo: boolean;
  createdAt: string;
  uploaded_by: string | null;
}

function mapCatalog(row: {
  id: string;
  titulo: string;
  descricao: string | null;
  marca: string | null;
  arquivo_url: string;
  arquivo_nome: string;
  mime_type: string;
  size_bytes: number | null;
  capa_url: string | null;
  ordem: number;
  ativo: boolean;
  createdAt: Date;
  uploaded_by: { name: string } | null;
}): ProductCatalogDTO {
  return {
    id: row.id,
    titulo: row.titulo,
    descricao: row.descricao,
    marca: row.marca,
    arquivo_url: row.arquivo_url,
    arquivo_nome: row.arquivo_nome,
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    capa_url: row.capa_url,
    ordem: row.ordem,
    ativo: row.ativo,
    createdAt: row.createdAt.toISOString(),
    uploaded_by: row.uploaded_by?.name ?? null,
  };
}

export async function listProductCatalogs(companyId: string): Promise<{
  success: boolean;
  catalogs: ProductCatalogDTO[];
  error?: string;
}> {
  const auth = await getModuleAccess("produtos");
  if (!auth) return { success: false, catalogs: [], error: "Não autenticado" };
  try {
    assertCompanyAccess(auth, companyId);
  } catch {
    return { success: false, catalogs: [], error: "Acesso negado" };
  }
  if (isDatabaseOffline()) return { success: true, catalogs: [] };

  try {
    const rows = await prisma.productCatalog.findMany({
      where: { company_id: companyId },
      include: { uploaded_by: { select: { name: true } } },
      orderBy: [{ ordem: "asc" }, { titulo: "asc" }],
    });
    return { success: true, catalogs: rows.map(mapCatalog) };
  } catch (error) {
    console.error("Erro ao listar catálogos:", error);
    return { success: false, catalogs: [], error: "Não foi possível carregar os catálogos." };
  }
}

export async function updateProductCatalog(
  companyId: string,
  id: string,
  data: {
    titulo?: string;
    descricao?: string | null;
    marca?: string | null;
    ativo?: boolean;
    ordem?: number;
    capa_url?: string | null;
  }
): Promise<{ success: boolean; catalog?: ProductCatalogDTO; error?: string }> {
  const auth = await getModuleAccess("produtos");
  if (!auth) return { success: false, error: "Não autenticado" };
  try {
    assertCompanyAccess(auth, companyId);
  } catch {
    return { success: false, error: "Acesso negado" };
  }
  if (isDatabaseOffline()) return { success: false, error: "Banco indisponível" };

  try {
    const existing = await prisma.productCatalog.findFirst({
      where: { id, company_id: companyId },
    });
    if (!existing) return { success: false, error: "Catálogo não encontrado." };

    const updated = await prisma.productCatalog.update({
      where: { id },
      data: {
        ...(data.titulo !== undefined ? { titulo: data.titulo.trim() } : {}),
        ...(data.descricao !== undefined
          ? { descricao: data.descricao?.trim() || null }
          : {}),
        ...(data.marca !== undefined ? { marca: data.marca?.trim() || null } : {}),
        ...(data.ativo !== undefined ? { ativo: data.ativo } : {}),
        ...(data.ordem !== undefined ? { ordem: data.ordem } : {}),
        ...(data.capa_url !== undefined ? { capa_url: data.capa_url } : {}),
      },
      include: { uploaded_by: { select: { name: true } } },
    });

    revalidatePath("/produtos");
    revalidatePath("/produtos/catalogos");
    return { success: true, catalog: mapCatalog(updated) };
  } catch (error) {
    console.error("Erro ao atualizar catálogo:", error);
    return { success: false, error: "Não foi possível atualizar o catálogo." };
  }
}

export async function deleteProductCatalog(
  companyId: string,
  id: string
): Promise<{ success: boolean; error?: string; arquivo_url?: string; capa_url?: string | null }> {
  const auth = await getModuleAccess("produtos");
  if (!auth) return { success: false, error: "Não autenticado" };
  try {
    assertCompanyAccess(auth, companyId);
  } catch {
    return { success: false, error: "Acesso negado" };
  }
  if (isDatabaseOffline()) return { success: false, error: "Banco indisponível" };

  try {
    const existing = await prisma.productCatalog.findFirst({
      where: { id, company_id: companyId },
    });
    if (!existing) return { success: false, error: "Catálogo não encontrado." };

    await prisma.productCatalog.delete({ where: { id } });
    revalidatePath("/produtos");
    revalidatePath("/produtos/catalogos");
    return {
      success: true,
      arquivo_url: existing.arquivo_url,
      capa_url: existing.capa_url,
    };
  } catch (error) {
    console.error("Erro ao excluir catálogo:", error);
    return { success: false, error: "Não foi possível excluir o catálogo." };
  }
}
