import PageHeader from "@/components/PageHeader";
import { TooltipBody } from "@/components/ui/InfoTooltip";
import SettingsSectionTabs from "@/components/settings/SettingsSectionTabs";
import { guardModule, getCompanyPermissions } from "@/lib/moduleAccess";
import { getSessionCompanyId } from "@/lib/session";
import {
  EDITABLE_ROLES,
  resolveConfigurableModules,
} from "@/lib/permissions";
import type { Role } from "@prisma/client";
import PermissoesClient from "./PermissoesClient";

export default async function PermissoesPage() {
  await guardModule("permissoes");

  const companyId = await getSessionCompanyId();
  const permissions = await getCompanyPermissions(companyId);

  const initial: Record<string, string[]> = {};
  for (const role of EDITABLE_ROLES) {
    initial[role] = resolveConfigurableModules(permissions, role as Role);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Empresa, equipe, permissões e listas configuráveis do sistema."
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
      <SettingsSectionTabs />
      <PermissoesClient initial={initial} />
    </div>
  );
}
