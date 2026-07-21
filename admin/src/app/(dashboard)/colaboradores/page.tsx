import { headers } from "next/headers";
import { getSessionSafe } from "@/lib/auth";
import { guardModule } from "@/lib/moduleAccess";
import { getColaboradores } from "@/app/actions/colaboradores";
import ColaboradoresClient from "@/components/ColaboradoresClient";
import PageHeader from "@/components/PageHeader";
import { TooltipBody } from "@/components/ui/InfoTooltip";
import SettingsSectionTabs from "@/components/settings/SettingsSectionTabs";
import { ADMIN_EMAIL } from "@/lib/constants";
import type { Role } from "@prisma/client";

export default async function ColaboradoresPage() {
  await guardModule("colaboradores");
  const session = await getSessionSafe(await headers()).catch(() => null);
  const companyId = session?.user?.company_id || "mock-company-id";
  const canManageUsers =
    (session?.user?.email || "").toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const res = await getColaboradores(companyId);

  const colaboradores =
    res.success && res.colaboradores
      ? res.colaboradores.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          cargo: c.cargo as Role,
          createdAt: c.createdAt,
        }))
      : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Empresa, equipe, permissões e listas configuráveis do sistema."
        help={
          <TooltipBody
            title="Equipe interna"
            items={[
              "Cadastre quem tem acesso ao painel e defina o cargo de cada um.",
              "O cargo determina os módulos visíveis (veja em Permissões).",
              "Somente o administrador principal pode criar ou alterar operadores.",
              "Para arquitetos e projetistas externos, use Projetistas e Arquitetos.",
            ]}
          />
        }
      />

      <SettingsSectionTabs />

      <ColaboradoresClient
        initialColaboradores={colaboradores}
        companyId={companyId}
        canManageUsers={canManageUsers}
      />
    </div>
  );
}
