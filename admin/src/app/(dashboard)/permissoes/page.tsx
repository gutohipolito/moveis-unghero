import PageHeader from "@/components/PageHeader";
import { guardModule, getCompanyPermissions } from "@/lib/moduleAccess";
import { getSessionCompanyId } from "@/lib/session";
import {
  EDITABLE_ROLES,
  resolveAllowedModules,
} from "@/lib/permissions";
import type { Role } from "@prisma/client";
import PermissoesClient from "./PermissoesClient";

export default async function PermissoesPage() {
  await guardModule("permissoes");

  const companyId = await getSessionCompanyId();
  const permissions = await getCompanyPermissions(companyId);

  const initial: Record<string, string[]> = {};
  for (const role of EDITABLE_ROLES) {
    initial[role] = resolveAllowedModules(permissions, role as Role);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Permissões de Acesso"
        description="Defina o que cada cargo pode acessar no sistema. A Diretoria sempre tem acesso total."
      />
      <PermissoesClient initial={initial} />
    </div>
  );
}
