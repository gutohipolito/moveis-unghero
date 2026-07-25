"use server";

import { revalidatePath } from "next/cache";
import { prisma, isDatabaseOffline } from "@/lib/prisma";
import { assertCompanyAccess } from "@/lib/auth-guard";
import { getModuleAccess, getWriteAccess } from "@/lib/moduleAccess";
import {
  accessHostname,
  isAccessCategory,
  normalizeAccessUrl,
  type AccessCategory,
} from "@/lib/accessCategories";
import { decryptVaultSecret, encryptVaultSecret } from "@/lib/accessVaultCrypto";

export interface AccessCredentialDTO {
  id: string;
  titulo: string;
  categoria: AccessCategory;
  url: string | null;
  usuario: string | null;
  hasPassword: boolean;
  notas: string | null;
  favorito: boolean;
  ordem: number;
  hostname: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AccessCredentialInput = {
  titulo: string;
  categoria: string;
  url?: string | null;
  usuario?: string | null;
  /** Senha em texto puro — só enviada no create/update quando alterada. */
  senha?: string | null;
  /** Se true no update, limpa a senha armazenada. */
  clearPassword?: boolean;
  notas?: string | null;
  favorito?: boolean;
};

function toDto(row: {
  id: string;
  titulo: string;
  categoria: string;
  url: string | null;
  usuario: string | null;
  senha_enc: string | null;
  notas: string | null;
  favorito: boolean;
  ordem: number;
  createdAt: Date;
  updatedAt: Date;
}): AccessCredentialDTO {
  const categoria = isAccessCategory(row.categoria) ? row.categoria : "OUTRO";
  return {
    id: row.id,
    titulo: row.titulo,
    categoria,
    url: row.url,
    usuario: row.usuario,
    hasPassword: Boolean(row.senha_enc),
    notas: row.notas,
    favorito: row.favorito,
    ordem: row.ordem,
    hostname: accessHostname(row.url),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function cleanText(value: string | null | undefined): string | null {
  const t = (value || "").trim();
  return t || null;
}

export async function getAccessCredentials(companyId: string) {
  const auth = await getModuleAccess("acessos");
  if (!auth) {
    return { success: false as const, error: "Não autenticado", items: [] as AccessCredentialDTO[] };
  }
  try {
    assertCompanyAccess(auth, companyId);
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Acesso negado",
      items: [] as AccessCredentialDTO[],
    };
  }

  if (isDatabaseOffline()) {
    return { success: false as const, error: "Banco de dados indisponível.", items: [] as AccessCredentialDTO[] };
  }

  try {
    const rows = await prisma.accessCredential.findMany({
      where: { company_id: companyId },
      orderBy: [{ favorito: "desc" }, { ordem: "asc" }, { titulo: "asc" }],
    });
    return { success: true as const, items: rows.map(toDto) };
  } catch (error) {
    console.warn("Falha ao listar acessos:", error);
    return { success: false as const, error: "Falha ao carregar acessos.", items: [] as AccessCredentialDTO[] };
  }
}

export async function createAccessCredential(companyId: string, data: AccessCredentialInput) {
  const auth = await getWriteAccess("acessos");
  if (!auth) return { success: false as const, error: "Sem permissão para criar acessos." };
  try {
    assertCompanyAccess(auth, companyId);
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Acesso negado" };
  }

  const titulo = (data.titulo || "").trim();
  if (!titulo) return { success: false as const, error: "Informe um título." };

  const categoria = isAccessCategory(data.categoria) ? data.categoria : "OUTRO";
  const senha = data.senha?.trim() || "";

  try {
    const created = await prisma.accessCredential.create({
      data: {
        company_id: companyId,
        titulo,
        categoria,
        url: normalizeAccessUrl(data.url),
        usuario: cleanText(data.usuario),
        senha_enc: senha ? encryptVaultSecret(senha) : null,
        notas: cleanText(data.notas),
        favorito: Boolean(data.favorito),
        created_by: auth.userId,
      },
    });
    revalidatePath("/acessos");
    return { success: true as const, item: toDto(created) };
  } catch (error) {
    console.warn("Falha ao criar acesso:", error);
    return { success: false as const, error: "Não foi possível salvar o acesso." };
  }
}

export async function updateAccessCredential(
  companyId: string,
  id: string,
  data: AccessCredentialInput
) {
  const auth = await getWriteAccess("acessos");
  if (!auth) return { success: false as const, error: "Sem permissão para editar acessos." };
  try {
    assertCompanyAccess(auth, companyId);
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Acesso negado" };
  }

  const existing = await prisma.accessCredential.findFirst({
    where: { id, company_id: companyId },
  });
  if (!existing) return { success: false as const, error: "Acesso não encontrado." };

  const titulo = (data.titulo || "").trim();
  if (!titulo) return { success: false as const, error: "Informe um título." };

  const categoria = isAccessCategory(data.categoria) ? data.categoria : existing.categoria;
  const senha = data.senha?.trim();

  let senha_enc = existing.senha_enc;
  if (data.clearPassword) {
    senha_enc = null;
  } else if (senha) {
    senha_enc = encryptVaultSecret(senha);
  }

  try {
    const updated = await prisma.accessCredential.update({
      where: { id },
      data: {
        titulo,
        categoria,
        url: normalizeAccessUrl(data.url),
        usuario: cleanText(data.usuario),
        senha_enc,
        notas: cleanText(data.notas),
        favorito: data.favorito ?? existing.favorito,
      },
    });
    revalidatePath("/acessos");
    return { success: true as const, item: toDto(updated) };
  } catch (error) {
    console.warn("Falha ao atualizar acesso:", error);
    return { success: false as const, error: "Não foi possível atualizar o acesso." };
  }
}

export async function deleteAccessCredential(companyId: string, id: string) {
  const auth = await getWriteAccess("acessos");
  if (!auth) return { success: false as const, error: "Sem permissão para excluir acessos." };
  try {
    assertCompanyAccess(auth, companyId);
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Acesso negado" };
  }

  const existing = await prisma.accessCredential.findFirst({
    where: { id, company_id: companyId },
    select: { id: true },
  });
  if (!existing) return { success: false as const, error: "Acesso não encontrado." };

  try {
    await prisma.accessCredential.delete({ where: { id } });
    revalidatePath("/acessos");
    return { success: true as const };
  } catch (error) {
    console.warn("Falha ao excluir acesso:", error);
    return { success: false as const, error: "Não foi possível excluir o acesso." };
  }
}

export async function toggleAccessFavorite(companyId: string, id: string) {
  const auth = await getWriteAccess("acessos");
  if (!auth) return { success: false as const, error: "Sem permissão." };
  try {
    assertCompanyAccess(auth, companyId);
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Acesso negado" };
  }

  const existing = await prisma.accessCredential.findFirst({
    where: { id, company_id: companyId },
  });
  if (!existing) return { success: false as const, error: "Acesso não encontrado." };

  const updated = await prisma.accessCredential.update({
    where: { id },
    data: { favorito: !existing.favorito },
  });
  revalidatePath("/acessos");
  return { success: true as const, item: toDto(updated) };
}

/** Revela a senha em texto puro — apenas sob demanda, com permissão de escrita/leitura do módulo. */
export async function revealAccessPassword(companyId: string, id: string) {
  const auth = await getModuleAccess("acessos");
  if (!auth) return { success: false as const, error: "Não autenticado", password: null as string | null };
  try {
    assertCompanyAccess(auth, companyId);
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Acesso negado",
      password: null as string | null,
    };
  }

  const row = await prisma.accessCredential.findFirst({
    where: { id, company_id: companyId },
    select: { senha_enc: true },
  });
  if (!row?.senha_enc) {
    return { success: false as const, error: "Este acesso não tem senha salva.", password: null as string | null };
  }

  try {
    return { success: true as const, password: decryptVaultSecret(row.senha_enc) };
  } catch (error) {
    console.warn("Falha ao descriptografar senha de acesso:", error);
    return {
      success: false as const,
      error: "Não foi possível revelar a senha. Verifique a configuração do cofre.",
      password: null as string | null,
    };
  }
}
