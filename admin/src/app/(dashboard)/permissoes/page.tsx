import PageHeader from "@/components/PageHeader";
import { TooltipBody } from "@/components/ui/InfoTooltip";
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
        help={
          <TooltipBody
            title="Controle de acesso"
            items={[
              "Marque quais módulos cada cargo pode abrir no menu.",
              "Quem não tem acesso a um módulo não o vê e é bloqueado ao tentar entrar.",
              "A Diretoria (admin) sempre tem acesso total e não pode ser restringida.",
              "As mudanças valem para todos os usuários daquele cargo.",
            ]}
          />
        }
      />
      <PermissoesClient initial={initial} />
    </div>
  );
}
