"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type Role } from "@prisma/client";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import {
  CONFIGURABLE_MODULE_KEYS,
  EDITABLE_ROLES,
  VIEWER_BLOCKED_MODULES,
  resolveAllowedModules,
  type CompanyPermissions,
} from "@/lib/permissions";

export type PermissionsResult =
  | { success: true; permissions: Record<string, string[]> }
  | { success: false; error: string };

/** Retorna as permissões atuais por cargo (resolvendo defaults). Admin-only. */
export async function getCompanyPermissionsAction(): Promise<PermissionsResult> {
  let companyId: string;
  try {
    const auth = await requireAdmin();
    companyId = auth.companyId;
  } catch {
    return { success: false, error: "Acesso restrito a administradores." };
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { permissions: true },
  });
  const stored = (company?.permissions as CompanyPermissions) ?? {};

  const resolved: Record<string, string[]> = {};
  for (const role of EDITABLE_ROLES) {
    resolved[role] = resolveAllowedModules(stored, role);
  }
  return { success: true, permissions: resolved };
}

/** Atualiza a lista de módulos permitidos para um cargo. Admin-only. */
export async function updateRolePermissionsAction(
  role: Role,
  moduleKeys: string[]
): Promise<PermissionsResult> {
  let companyId: string;
  try {
    const auth = await requireAdmin();
    companyId = auth.companyId;
  } catch {
    return { success: false, error: "Acesso restrito a administradores." };
  }

  if (!EDITABLE_ROLES.includes(role)) {
    return { success: false, error: "Cargo inválido para edição de permissões." };
  }

  const cleaned = Array.from(
    new Set(
      moduleKeys.filter((k) => {
        if (!CONFIGURABLE_MODULE_KEYS.includes(k)) return false;
        if (role === "VIEWER" && VIEWER_BLOCKED_MODULES.has(k)) return false;
        return true;
      })
    )
  );

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { permissions: true },
  });
  const stored = (company?.permissions as CompanyPermissions) ?? {};
  const next: CompanyPermissions = { ...stored, [role]: cleaned };

  await prisma.company.update({
    where: { id: companyId },
    data: { permissions: next as Prisma.InputJsonValue },
  });

  revalidatePath("/", "layout");

  const resolved: Record<string, string[]> = {};
  for (const r of EDITABLE_ROLES) {
    resolved[r] = resolveAllowedModules(next, r);
  }
  return { success: true, permissions: resolved };
}
