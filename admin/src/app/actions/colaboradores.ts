"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

// Retorna todos os colaboradores ativos da mesma empresa
export async function getColaboradores(companyId: string) {
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
    return { success: false, error: error.message };
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
        company_id: data.companyId,
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
  try {
    // Não permite apagar o administrador de mock principal para evitar que o painel trave
    if (userId === "system-admin-mock-id") {
      return { success: false, error: "O administrador master do sistema não pode ser removido." };
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
