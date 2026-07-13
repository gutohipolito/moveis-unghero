import { fetchColaboradoresSelect, fetchFactoryBoard } from "@/lib/factoryBoard";
import { getSessionCompanyId } from "@/lib/session";
import { guardModule } from "@/lib/moduleAccess";
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

  const [colaboradores, factoryBoard] = await Promise.all([
    fetchColaboradoresSelect(userCompanyId),
    fetchFactoryBoard(userCompanyId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chão de Fábrica"
        description="Acompanhe em tempo real as etapas de fabricação e montagem dos cômodos liberados para produção."
        help={
          <TooltipBody
            title="Produção em tempo real"
            items={[
              "Cada cômodo liberado avança pelas etapas de fabricação em um quadro.",
              "Atribua responsáveis e acompanhe o andamento por projeto.",
              "O SLA sinaliza prazos de cada etapa para evitar atrasos.",
            ]}
          />
        }
      />

      <FactoryClient
        initialEnvironments={factoryBoard.environments}
        colaboradores={colaboradores}
        slaByProject={factoryBoard.slaByProject}
        companyId={userCompanyId}
        slaCheckProjectId={params.slaCheck}
      />
    </div>
  );
}
