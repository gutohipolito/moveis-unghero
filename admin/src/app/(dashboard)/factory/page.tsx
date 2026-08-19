import { fetchColaboradoresSelect, fetchFactoryBoard } from "@/lib/factoryBoard";
import { getSessionCompanyId } from "@/lib/session";
import { guardModule } from "@/lib/moduleAccess";
import { getAuthContext } from "@/lib/auth-guard";
import FactoryClient from "./FactoryClient";
import PageHeader from "@/components/PageHeader";
import { TooltipBody } from "@/components/ui/InfoTooltip";

export default async function FactoryPage({
  searchParams,
}: {
  searchParams: Promise<{ slaCheck?: string }>;
}) {
  await guardModule("factory");
  const params = await searchParams;
  const userCompanyId = await getSessionCompanyId();
  const auth = await getAuthContext();
  const isFactoryRole = auth?.cargo === "PRODUCAO";

  const [colaboradores, factoryBoard] = await Promise.all([
    fetchColaboradoresSelect(userCompanyId),
    fetchFactoryBoard(userCompanyId),
  ]);

  return (
    <div className="factory-floor md:h-[calc(100vh-var(--dashboard-chrome-offset))] md:flex md:flex-col md:overflow-hidden md:space-y-[var(--space-3)] print:p-0 print:h-auto print:overflow-visible">
      <div className="factory-page-header shrink-0 print:hidden">
        <PageHeader
          title="Chão de Fábrica"
          description={
            isFactoryRole
              ? undefined
              : "Acompanhe em tempo real as etapas de fabricação e montagem dos cômodos liberados para produção."
          }
          help={
            isFactoryRole ? undefined : (
              <TooltipBody
                title="Produção em tempo real"
                items={[
                  "Cada cômodo liberado avança pelas etapas de fabricação em um quadro.",
                  "Atribua responsáveis e acompanhe o andamento por projeto.",
                  "O SLA sinaliza prazos de cada etapa para evitar atrasos.",
                ]}
              />
            )
          }
        />
      </div>

      <FactoryClient
        initialEnvironments={factoryBoard.environments}
        colaboradores={colaboradores}
        slaByProject={factoryBoard.slaByProject}
        companyId={userCompanyId}
        currentUserId={auth?.userId ?? null}
        slaCheckProjectId={params.slaCheck}
      />
    </div>
  );
}
