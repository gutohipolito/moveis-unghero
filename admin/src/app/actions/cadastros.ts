"use server";

import { revalidatePath } from "next/cache";
import { prisma, isDatabaseOffline } from "@/lib/prisma";
import { CATALOG_GROUP_META } from "@/lib/catalogGroups";
import { assertCompanyAccess, getAuthContext } from "@/lib/auth-guard";
import { getModuleAccess } from "@/lib/moduleAccess";
import { capitalizeText } from "@/lib/utils";

export interface CatalogItemDTO {
  id: string;
  label: string;
  slug: string | null;
  ordem: number;
  ativo: boolean;
  parentId: string | null;
  children?: CatalogItemDTO[];
}

export interface CatalogGroupDTO {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  usadoEm: string | null;
  items: CatalogItemDTO[];
}

function buildMockGroups(): CatalogGroupDTO[] {
  return CATALOG_GROUP_META.map((meta, idx) => ({
    id: `mock-group-${meta.slug}`,
    slug: meta.slug,
    nome: meta.nome,
    descricao: meta.descricao,
    usadoEm: meta.usadoEm,
    items: meta.defaultItems.map((item, i) => ({
      id: `mock-${meta.slug}-${i}`,
      label: item.label,
      slug: item.slug ?? null,
      ordem: item.ordem,
      ativo: true,
      parentId: null,
    })),
  }));
}

async function ensureCatalogDefaults(companyId: string) {
  for (const meta of CATALOG_GROUP_META) {
    const group = await prisma.catalogGroup.upsert({
      where: {
        company_id_slug: { company_id: companyId, slug: meta.slug },
      },
      create: {
        company_id: companyId,
        slug: meta.slug,
        nome: meta.nome,
        descricao: meta.descricao,
        usado_em: meta.usadoEm,
      },
      update: {
        nome: meta.nome,
        descricao: meta.descricao,
        usado_em: meta.usadoEm,
      },
    });

    const existingCount = await prisma.catalogItem.count({
      where: { group_id: group.id, parent_id: null },
    });

    if (existingCount === 0) {
      await prisma.catalogItem.createMany({
        data: meta.defaultItems.map((item) => ({
          group_id: group.id,
          label: item.label,
          slug: item.slug ?? null,
          ordem: item.ordem,
        })),
      });
    }
  }
}

function mapItems(items: {
  id: string;
  label: string;
  slug: string | null;
  ordem: number;
  ativo: boolean;
  parent_id: string | null;
  children?: {
    id: string;
    label: string;
    slug: string | null;
    ordem: number;
    ativo: boolean;
    parent_id: string | null;
  }[];
}[]): CatalogItemDTO[] {
  return items.map((item) => ({
    id: item.id,
    label: item.label,
    slug: item.slug,
    ordem: item.ordem,
    ativo: item.ativo,
    parentId: item.parent_id,
    children: item.children ? mapItems(item.children) : undefined,
  }));
}

export async function getCatalogGroups(companyId: string) {
  const auth = await getModuleAccess("cadastros");
  if (!auth) {
    return { success: false as const, error: "Não autenticado", groups: buildMockGroups() };
  }
  try {
    assertCompanyAccess(auth, companyId);
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Acesso negado",
      groups: buildMockGroups(),
    };
  }

  if (isDatabaseOffline()) {
    return { success: true as const, groups: buildMockGroups() };
  }

  try {
    await ensureCatalogDefaults(companyId);

    const groups = await prisma.catalogGroup.findMany({
      where: { company_id: companyId },
      include: {
        items: {
          where: { parent_id: null },
          orderBy: [{ ordem: "asc" }, { label: "asc" }],
          include: {
            children: {
              orderBy: [{ ordem: "asc" }, { label: "asc" }],
            },
          },
        },
      },
      orderBy: { nome: "asc" },
    });

    return {
      success: true as const,
      groups: groups.map((g) => ({
        id: g.id,
        slug: g.slug,
        nome: g.nome,
        descricao: g.descricao,
        usadoEm: g.usado_em,
        items: mapItems(g.items),
      })),
    };
  } catch (error) {
    console.error("Erro ao buscar cadastros:", error);
    return { success: false as const, error: "Falha ao carregar cadastros.", groups: buildMockGroups() };
  }
}

export async function getCatalogItemsBySlug(companyId: string, slug: string) {
  const auth = await getModuleAccess("cadastros");
  if (!auth) {
    const fallback = buildMockGroups().find((g) => g.slug === slug);
    return { success: false as const, items: fallback?.items.filter((i) => i.ativo) ?? [] };
  }
  try {
    assertCompanyAccess(auth, companyId);
  } catch {
    const fallback = buildMockGroups().find((g) => g.slug === slug);
    return { success: false as const, items: fallback?.items.filter((i) => i.ativo) ?? [] };
  }

  const res = await getCatalogGroups(companyId);
  if (!res.success) {
    const fallback = buildMockGroups().find((g) => g.slug === slug);
    return { success: false as const, items: fallback?.items.filter((i) => i.ativo) ?? [] };
  }

  const group = res.groups.find((g) => g.slug === slug);
  const activeItems = (group?.items ?? []).filter((i) => i.ativo);
  return { success: true as const, items: activeItems };
}

export async function createCatalogItem(
  companyId: string,
  groupSlug: string,
  data: { label: string; slug?: string; parentId?: string | null }
) {
  const auth = await getModuleAccess("cadastros");
  if (!auth) {
    return { success: false, error: "Não autenticado" };
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
    return { success: false, error: "Cadastros indisponíveis no modo demonstração offline." };
  }

  try {
    await ensureCatalogDefaults(companyId);

    const group = await prisma.catalogGroup.findUnique({
      where: { company_id_slug: { company_id: companyId, slug: groupSlug } },
    });

    if (!group) {
      return { success: false, error: "Grupo de cadastro não encontrado." };
    }

    const maxOrdem = await prisma.catalogItem.aggregate({
      where: { group_id: group.id, parent_id: data.parentId ?? null },
      _max: { ordem: true },
    });

    const item = await prisma.catalogItem.create({
      data: {
        group_id: group.id,
        label: capitalizeText(data.label),
        slug: data.slug?.trim() || null,
        parent_id: data.parentId ?? null,
        ordem: (maxOrdem._max.ordem ?? 0) + 1,
      },
    });

    revalidateCatalogPaths();
    return { success: true, item };
  } catch (error: unknown) {
    console.error("Erro ao criar item de cadastro:", error);
    return { success: false, error: error instanceof Error ? error.message : "Erro ao criar item." };
  }
}

export async function updateCatalogItem(
  itemId: string,
  data: { label?: string; ativo?: boolean; ordem?: number }
) {
  const auth = await getModuleAccess("cadastros");
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }

  if (isDatabaseOffline()) {
    return { success: false, error: "Cadastros indisponíveis no modo demonstração offline." };
  }

  try {
    const existing = await prisma.catalogItem.findFirst({
      where: { id: itemId, group: { company_id: auth.companyId } },
    });
    if (!existing) {
      return { success: false, error: "Item não encontrado." };
    }

    const item = await prisma.catalogItem.update({
      where: { id: itemId },
      data: {
        ...(data.label !== undefined ? { label: capitalizeText(data.label) } : {}),
        ...(data.ativo !== undefined ? { ativo: data.ativo } : {}),
        ...(data.ordem !== undefined ? { ordem: data.ordem } : {}),
      },
    });

    revalidateCatalogPaths();
    return { success: true, item };
  } catch (error: unknown) {
    console.error("Erro ao atualizar item de cadastro:", error);
    return { success: false, error: error instanceof Error ? error.message : "Erro ao atualizar item." };
  }
}

export async function deleteCatalogItem(itemId: string) {
  const auth = await getModuleAccess("cadastros");
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }

  if (isDatabaseOffline()) {
    return { success: false, error: "Cadastros indisponíveis no modo demonstração offline." };
  }

  try {
    const existing = await prisma.catalogItem.findFirst({
      where: { id: itemId, group: { company_id: auth.companyId } },
    });
    if (!existing) {
      return { success: false, error: "Item não encontrado." };
    }

    await prisma.catalogItem.delete({ where: { id: itemId } });
    revalidateCatalogPaths();
    return { success: true };
  } catch (error: unknown) {
    console.error("Erro ao excluir item de cadastro:", error);
    return { success: false, error: error instanceof Error ? error.message : "Erro ao excluir item." };
  }
}

function revalidateCatalogPaths() {
  revalidatePath("/cadastros");
  revalidatePath("/logistica");
  revalidatePath("/estoque");
}
