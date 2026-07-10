import { fetchColaboradoresSelect, fetchFactoryBoard } from "@/lib/factoryBoard";
import { getSessionCompanyId } from "@/lib/session";
import FactoryClient from "./FactoryClient";
import PageHeader from "@/components/PageHeader";

export default async function FactoryPage({
  searchParams,
}: {
  searchParams: Promise<{ slaCheck?: string }>;
}) {
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
