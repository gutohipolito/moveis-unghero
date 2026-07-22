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
          areaAtuacao: c.areaAtuacao,
          funcoes: c.funcoes,
          tem_acesso: c.tem_acesso,
          image: c.image,
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
              "Cadastre a equipe com funções operacionais (marceneiro, montador, etc.).",
              "Dá para marcar mais de uma função por pessoa.",
              "Acesso ao painel é opcional: pode cadastrar só o nome e liberar login depois.",
              "Somente o administrador principal gerencia cadastros.",
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
