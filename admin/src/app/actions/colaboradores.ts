"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ADMIN_EMAIL, DEFAULT_COMPANY_ID } from "@/lib/constants";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  assertCompanyAccess,
  getAuthContext,
  requireEnvironmentInCompany,
  requireUserInCompany,
  type AuthContext,
} from "@/lib/auth-guard";
import { getModuleAccess, getWriteAccess } from "@/lib/moduleAccess";
import { capitalizeText } from "@/lib/utils";
import {
  buildInternalTeamEmail,
  normalizeFuncoes,
  suggestCargoFromFuncoes,
  type TeamFuncaoId,
} from "@/lib/teamFuncoes";

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

function areaLabelFromFuncoes(funcoes: TeamFuncaoId[]) {
  if (!funcoes.length) return null;
  const labels: Record<TeamFuncaoId, string> = {
    MARCENEIRO: "Marcenaria",
    AJUDANTE: "Ajudante",
    MONTADOR: "Montagem",
    PROJETISTA: "Projetos",
    COMERCIAL: "Comercial",
    ADMINISTRATIVO: "Administrativo",
  };
  return funcoes.map((f) => labels[f]).join(" · ");
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

// Cria um colaborador. Sem acesso: só nome + funções (sem login). Com acesso: e-mail + senha.
export async function createColaborador(data: {
  name: string;
  email?: string;
  cargo?: Role;
  senhaRaw?: string;
  companyId: string;
  areaAtuacao?: string;
  funcoes?: string[];
  image?: string;
  temAcesso?: boolean;
}) {
  const authCtx = await getWriteAccess("colaboradores");
  const denied = denyUnlessPrimaryAdmin(authCtx);
  if (denied) return denied;

  const funcoes = normalizeFuncoes(data.funcoes);
  const temAcesso = data.temAcesso !== false && Boolean(data.email && data.senhaRaw);
  const cargo =
    data.cargo ||
    (suggestCargoFromFuncoes(funcoes) as Role);
  const areaAtuacao =
    data.areaAtuacao?.trim() || areaLabelFromFuncoes(funcoes) || null;

  try {
    if (!temAcesso) {
      const email = buildInternalTeamEmail(data.name);
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return {
          success: false,
          error: "Já existe um colaborador com este nome na equipe (sem acesso).",
        };
      }

      const dbUser = await prisma.user.create({
        data: {
          id: crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8),
          name: capitalizeText(data.name),
          email,
          emailVerified: false,
          company_id: authCtx!.companyId || data.companyId || DEFAULT_COMPANY_ID,
          cargo,
          areaAtuacao,
          funcoes,
          tem_acesso: false,
          ...(data.image ? { image: data.image.trim() } : {}),
        },
      });

      revalidatePath("/colaboradores");
      revalidatePath("/crm");
      revalidatePath("/factory");
      return { success: true, user: dbUser };
    }

    const email = (data.email || "").trim().toLowerCase();
    if (!email || !data.senhaRaw) {
      return { success: false, error: "E-mail e senha são obrigatórios para liberar acesso." };
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return { success: false, error: "Este e-mail já está sendo utilizado por outro colaborador." };
    }

    const newUser = await auth.api.signUpEmail({
      body: {
        email,
        password: data.senhaRaw,
        name: capitalizeText(data.name),
        company_id: authCtx!.companyId,
        cargo,
      },
    });

    if (!newUser?.user?.id) {
      return { success: false, error: "Erro ao registrar credenciais" };
    }

    const dbUser = await prisma.user.update({
      where: { id: newUser.user.id },
      data: {
        name: capitalizeText(data.name),
        areaAtuacao,
        funcoes,
        tem_acesso: true,
        ...(data.image ? { image: data.image.trim() } : {}),
      },
    });

    revalidatePath("/colaboradores");
    revalidatePath("/crm");
    revalidatePath("/factory");
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
    funcoes?: string[];
    image?: string | null;
  }
) {
  const authCtx = await getWriteAccess("colaboradores");
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

    const funcoes =
      data.funcoes !== undefined ? normalizeFuncoes(data.funcoes) : undefined;
    const areaAtuacao =
      data.areaAtuacao !== undefined
        ? data.areaAtuacao
          ? capitalizeText(data.areaAtuacao)
          : funcoes
            ? areaLabelFromFuncoes(funcoes)
            : null
        : funcoes
          ? areaLabelFromFuncoes(funcoes)
          : undefined;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined ? { name: capitalizeText(data.name) } : {}),
        ...(data.email !== undefined ? { email: data.email.trim() } : {}),
        ...(data.cargo !== undefined ? { cargo: data.cargo } : {}),
        ...(areaAtuacao !== undefined ? { areaAtuacao } : {}),
        ...(funcoes !== undefined ? { funcoes } : {}),
        ...(data.image !== undefined ? { image: data.image?.trim() || null } : {}),
      },
    });

    revalidatePath("/colaboradores");
    revalidatePath("/crm");
    revalidatePath("/factory");
    return { success: true, user: updated };
  } catch (error: any) {
    console.error("Erro ao atualizar colaborador:", error);
    return { success: false, error: error.message };
  }
}

// Exclui um colaborador e remove sessões e contas associadas
export async function deleteColaborador(userId: string) {
  const authCtx = await getWriteAccess("colaboradores");
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
  const authCtx = await getWriteAccess("factory");
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
  const authCtx = await getWriteAccess("factory");
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

const FACTORY_TEAM_SEED: Array<{ name: string; funcoes: TeamFuncaoId[] }> = [
  { name: "Alessandro (Nene)", funcoes: ["MARCENEIRO"] },
  { name: "Lauro", funcoes: ["MARCENEIRO"] },
  { name: "Guimorvan", funcoes: ["MARCENEIRO"] },
  { name: "Vitor", funcoes: ["AJUDANTE"] },
  { name: "Moisés", funcoes: ["MONTADOR"] },
  { name: "Robert", funcoes: ["MONTADOR"] },
  { name: "Manoel", funcoes: ["PROJETISTA"] },
  { name: "Ana", funcoes: ["PROJETISTA"] },
];

/** Cadastra a equipe operacional (sem login) se ainda não existir. */
export async function ensureFactoryTeamSeeded(companyId?: string) {
  const authCtx = await getWriteAccess("colaboradores");
  const denied = denyUnlessPrimaryAdmin(authCtx);
  if (denied) return denied;

  const targetCompany = companyId || authCtx!.companyId || DEFAULT_COMPANY_ID;
  let created = 0;
  let skipped = 0;

  for (const member of FACTORY_TEAM_SEED) {
    const email = buildInternalTeamEmail(member.name);
    const existing = await prisma.user.findFirst({
      where: {
        company_id: targetCompany,
        OR: [{ email }, { name: { equals: member.name, mode: "insensitive" } }],
      },
      select: { id: true },
    });
    if (existing) {
      skipped += 1;
      continue;
    }

    await prisma.user.create({
      data: {
        id: crypto.randomUUID().replace(/-/g, ""),
        name: capitalizeText(member.name),
        email,
        emailVerified: false,
        company_id: targetCompany,
        cargo: suggestCargoFromFuncoes(member.funcoes) as Role,
        funcoes: member.funcoes,
        areaAtuacao: areaLabelFromFuncoes(member.funcoes),
        tem_acesso: false,
      },
    });
    created += 1;
  }

  revalidatePath("/colaboradores");
  revalidatePath("/crm");
  revalidatePath("/factory");
  return { success: true as const, created, skipped };
}
