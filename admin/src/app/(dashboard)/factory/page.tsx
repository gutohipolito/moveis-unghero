import { fetchColaboradoresSelect, fetchFactoryBoard } from "@/lib/factoryBoard";
import { getSessionCompanyId } from "@/lib/session";
import { guardModule } from "@/lib/moduleAccess";
import { getAuthContext } from "@/lib/auth-guard";
import { isReadOnlyRole } from "@/lib/permissions";
import { redactFactoryBoardForViewer } from "@/lib/factoryEnvironment";
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
  const isViewer = isReadOnlyRole(auth?.cargo);

  const [colaboradoresRaw, factoryBoardRaw] = await Promise.all([
    isViewer ? Promise.resolve([]) : fetchColaboradoresSelect(userCompanyId),
    fetchFactoryBoard(userCompanyId),
  ]);

  const factoryBoard = isViewer
    ? redactFactoryBoardForViewer(factoryBoardRaw)
    : factoryBoardRaw;

  return (
    <div className="factory-floor h-[calc(100svh-var(--dashboard-chrome-offset-mobile))] flex flex-col overflow-hidden md:h-[calc(100vh-var(--dashboard-chrome-offset))] md:space-y-[var(--space-3)] print:p-0 print:h-auto print:overflow-visible">
      <div className="factory-page-header shrink-0 print:hidden max-md:hidden">
        <PageHeader
          title="Chão de Fábrica"
          description={
            isFactoryRole || isViewer
              ? undefined
              : "Acompanhe em tempo real as etapas de fabricação e montagem dos cômodos liberados para produção."
          }
          help={
            isFactoryRole || isViewer ? undefined : (
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
        colaboradores={colaboradoresRaw}
        slaByProject={factoryBoard.slaByProject}
        companyId={userCompanyId}
        currentUserId={auth?.userId ?? null}
        slaCheckProjectId={isViewer ? undefined : params.slaCheck}
      />
    </div>
  );
}
