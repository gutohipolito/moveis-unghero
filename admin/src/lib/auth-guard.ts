import { headers } from "next/headers";
import { getSessionSafe } from "@/lib/auth";
import { DEFAULT_COMPANY_ID } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

export interface AuthContext {
  userId: string;
  companyId: string;
  email: string;
  cargo: Role;
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const session = await getSessionSafe(await headers());
  if (!session?.user?.id) return null;

  return {
    userId: session.user.id,
    companyId: session.user.company_id || DEFAULT_COMPANY_ID,
    email: session.user.email,
    cargo: (session.user.cargo as Role) || "PRODUCAO",
  };
}

export async function requireAuth(): Promise<AuthContext> {
  const auth = await getAuthContext();
  if (!auth) {
    throw new Error("Não autenticado");
  }
  return auth;
}

export async function requireAdmin(): Promise<AuthContext> {
  const auth = await requireAuth();
  if (auth.cargo !== "ADMIN") {
    throw new Error("Acesso negado");
  }
  return auth;
}

export function assertCompanyAccess(auth: AuthContext, companyId: string) {
  if (companyId !== auth.companyId) {
    throw new Error("Acesso negado");
  }
}

export async function requireProjectInCompany(projectId: string, companyId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, client: { company_id: companyId } },
    select: { id: true },
  });
  if (!project) {
    throw new Error("Projeto não encontrado");
  }
}

export async function requireClientInCompany(clientId: string, companyId: string) {
  const client = await prisma.client.findFirst({
    where: { id: clientId, company_id: companyId },
    select: { id: true },
  });
  if (!client) {
    throw new Error("Cliente não encontrado");
  }
}

export async function requireEnvironmentInCompany(environmentId: string, companyId: string) {
  const environment = await prisma.environment.findFirst({
    where: { id: environmentId, project: { client: { company_id: companyId } } },
    select: { id: true },
  });
  if (!environment) {
    throw new Error("Ambiente não encontrado");
  }
}

export async function requireUserInCompany(userId: string, companyId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, company_id: companyId },
    select: { id: true },
  });
  if (!user) {
    throw new Error("Colaborador não encontrado");
  }
}
