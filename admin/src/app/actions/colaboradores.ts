"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ADMIN_EMAIL } from "@/lib/constants";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  assertCompanyAccess,
  getAuthContext,
  requireEnvironmentInCompany,
  requireUserInCompany,
  type AuthContext,
} from "@/lib/auth-guard";
import { capitalizeText } from "@/lib/utils";

function isPrimaryAdmin(authCtx: AuthContext) {
  return authCtx.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

function denyUnlessPrimaryAdmin(authCtx: AuthContext | null) {
  if (!authCtx) {
    return { success: false as const, error: "Não autenticado" };
  }
  if (!isPrimaryAdmin(authCtx)) {
    return {
      success: false as const,
      error: "Somente o administrador principal pode gerenciar cadastros de operadores.",
    };
  }
  return null;
}

// Retorna todos os colaboradores ativos da mesma empresa
export async function getColaboradores(companyId: string) {
  const authCtx = await getAuthContext();
  if (!authCtx) {
    return { success: false, error: "Não autenticado", colaboradores: [] };
  }
  try {
    assertCompanyAccess(authCtx, companyId);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Acesso negado",
      colaboradores: [],
    };
  }

  try {
    const colaboradores = await prisma.user.findMany({
      where: {
        company_id: companyId,
      },
      orderBy: {
        name: "asc",
      },
    });

    return { success: true, colaboradores };
  } catch (error: any) {
    console.error("Erro ao buscar colaboradores:", error);
    return { success: false, error: error.message, colaboradores: [] };
  }
}

// Cria um colaborador na base com Better Auth
export async function createColaborador(data: {
  name: string;
  email: string;
  cargo: Role;
  senhaRaw: string;
  companyId: string;
  areaAtuacao?: string;
  image?: string;
}) {
  const authCtx = await getAuthContext();
  const denied = denyUnlessPrimaryAdmin(authCtx);
  if (denied) return denied;

  try {
    // 1. Garante que não haja duplicidade de e-mail
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      return { success: false, error: "Este e-mail já está sendo utilizado por outro colaborador." };
    }

    // 2. Cria o usuário e conta no Better Auth nativo
    const newUser = await auth.api.signUpEmail({
      body: {
        email: data.email,
        password: data.senhaRaw,
        name: capitalizeText(data.name),
        company_id: authCtx!.companyId,
        cargo: data.cargo,
      },
    });

    if (!newUser?.user?.id) {
      return { success: false, error: "Erro ao registrar credenciais" };
    }

    const dbUser = await prisma.user.update({
      where: { id: newUser.user.id },
      data: {
        name: capitalizeText(data.name),
        ...(data.areaAtuacao ? { areaAtuacao: capitalizeText(data.areaAtuacao) } : {}),
        ...(data.image ? { image: data.image.trim() } : {}),
      }
    });

    revalidatePath("/colaboradores");
    return { success: true, user: dbUser };
  } catch (error: any) {
    console.error("Erro ao cadastrar colaborador:", error);
    return { success: false, error: error.message };
  }
}

// Atualiza os dados de um colaborador existente
export async function updateColaborador(
  userId: string,
  data: {
    name?: string;
    email?: string;
    cargo?: Role;
    areaAtuacao?: string | null;
    image?: string | null;
  }
) {
  const authCtx = await getAuthContext();
  const denied = denyUnlessPrimaryAdmin(authCtx);
  if (denied) return denied;
  
  try {
    await requireUserInCompany(userId, authCtx!.companyId);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Acesso negado",
    };
  }

  try {
    if (data.email) {
      const existing = await prisma.user.findFirst({
        where: { email: data.email, NOT: { id: userId } },
      });
      if (existing) {
        return { success: false, error: "Este e-mail já está sendo utilizado por outro colaborador." };
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined ? { name: capitalizeText(data.name) } : {}),
        ...(data.email !== undefined ? { email: data.email.trim() } : {}),
        ...(data.cargo !== undefined ? { cargo: data.cargo } : {}),
        ...(data.areaAtuacao !== undefined ? { areaAtuacao: data.areaAtuacao ? capitalizeText(data.areaAtuacao) : null } : {}),
        ...(data.image !== undefined ? { image: data.image?.trim() || null } : {}),
      },
    });

    revalidatePath("/colaboradores");
    return { success: true, user: updated };
  } catch (error: any) {
    console.error("Erro ao atualizar colaborador:", error);
    return { success: false, error: error.message };
  }
}

// Exclui um colaborador e remove sessões e contas associadas
export async function deleteColaborador(userId: string) {
  const authCtx = await getAuthContext();
  const denied = denyUnlessPrimaryAdmin(authCtx);
  if (denied) return denied;
  try {
    await requireUserInCompany(userId, authCtx!.companyId);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Acesso negado",
    };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (user?.email === ADMIN_EMAIL) {
      return { success: false, error: "O administrador principal não pode ser removido." };
    }

    await prisma.$transaction(async (tx) => {
      // Remove dependências de autenticação
      await tx.account.deleteMany({ where: { userId } });
      await tx.session.deleteMany({ where: { userId } });
      
      // Limpa a responsabilidade de ambientes do chão de fábrica (seta null)
      await tx.environment.updateMany({
        where: { responsavel_id: userId },
        data: { responsavel_id: null },
      });
      await tx.environment.updateMany({
        where: { ajudante_id: userId },
        data: { ajudante_id: null },
      });

      // Deleta o usuário
      await tx.user.delete({ where: { id: userId } });
    });

    revalidatePath("/colaboradores");
    revalidatePath("/factory");
    return { success: true };
  } catch (error: any) {
    console.error("Erro ao excluir colaborador:", error);
    return { success: false, error: error.message };
  }
}

// Associa um responsável da fábrica a um cômodo/ambiente
export async function updateEnvironmentResponsavel(environmentId: string, responsavelId: string | null) {
  const authCtx = await getAuthContext();
  if (!authCtx) {
    return { success: false, error: "Não autenticado" };
  }
  try {
    await requireEnvironmentInCompany(environmentId, authCtx.companyId);
    if (responsavelId) {
      await requireUserInCompany(responsavelId, authCtx.companyId);
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Acesso negado",
    };
  }

  try {
    const updated = await prisma.environment.update({
      where: { id: environmentId },
      data: {
        responsavel_id: responsavelId,
      },
    });

    revalidatePath("/factory");
    return { success: true, environment: updated };
  } catch (error: any) {
    console.error("Erro ao atualizar responsável do cômodo:", error);
    return { success: false, error: error.message };
  }
}

// Associa um ajudante opcional da fábrica a um cômodo/ambiente
export async function updateEnvironmentAjudante(environmentId: string, ajudanteId: string | null) {
  const authCtx = await getAuthContext();
  if (!authCtx) {
    return { success: false, error: "Não autenticado" };
  }
  try {
    await requireEnvironmentInCompany(environmentId, authCtx.companyId);
    if (ajudanteId) {
      await requireUserInCompany(ajudanteId, authCtx.companyId);
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Acesso negado",
    };
  }

  try {
    const updated = await prisma.environment.update({
      where: { id: environmentId },
      data: {
        ajudante_id: ajudanteId,
      },
    });

    revalidatePath("/factory");
    return { success: true, environment: updated };
  } catch (error: any) {
    console.error("Erro ao atualizar ajudante do cômodo:", error);
    return { success: false, error: error.message };
  }
}
