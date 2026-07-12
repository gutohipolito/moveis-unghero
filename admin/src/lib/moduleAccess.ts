import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-guard";
import {
  canAccessModule,
  resolveAllowedModules,
  type CompanyPermissions,
} from "@/lib/permissions";

/** Lê o mapa de permissões da empresa (deduplicado por request). */
export const getCompanyPermissions = cache(
  async (companyId: string): Promise<CompanyPermissions> => {
    try {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { permissions: true },
      });
      return (company?.permissions as CompanyPermissions) ?? {};
    } catch {
      return {};
    }
  }
);

/**
 * Guarda de página (server component). Redireciona para /sem-acesso quando o
 * cargo do usuário não tem permissão para o módulo informado.
 */
export async function guardModule(moduleKey: string): Promise<void> {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const permissions = await getCompanyPermissions(auth.companyId);
  if (!canAccessModule(permissions, auth.cargo, moduleKey)) {
    redirect("/sem-acesso");
  }
}

/** Módulos permitidos para o usuário atual (usado no layout para o menu). */
export async function getAllowedModulesForCurrentUser(): Promise<{
  role: string;
  allowedModules: string[];
}> {
  const auth = await getAuthContext();
  if (!auth) return { role: "PRODUCAO", allowedModules: [] };
  const permissions = await getCompanyPermissions(auth.companyId);
  return {
    role: auth.cargo,
    allowedModules: resolveAllowedModules(permissions, auth.cargo),
  };
}
