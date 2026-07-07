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
} from "@/lib/auth-guard";

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
}) {
  const authCtx = await getAuthContext();
  if (!authCtx) {
    return { success: false, error: "Não autenticado" };
  }
  if (authCtx.cargo !== "ADMIN") {
    return { success: false, error: "Acesso negado" };
  }

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
        name: data.name,
        company_id: authCtx.companyId,
        cargo: data.cargo,
      },
    });

    revalidatePath("/colaboradores");
    return { success: true, user: newUser.user };
  } catch (error: any) {
    console.error("Erro ao cadastrar colaborador:", error);
    return { success: false, error: error.message };
  }
}

// Exclui um colaborador e remove sessões e contas associadas
export async function deleteColaborador(userId: string) {
  const authCtx = await getAuthContext();
  if (!authCtx) {
    return { success: false, error: "Não autenticado" };
  }
  if (authCtx.cargo !== "ADMIN") {
    return { success: false, error: "Acesso negado" };
  }
  try {
    await requireUserInCompany(userId, authCtx.companyId);
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
