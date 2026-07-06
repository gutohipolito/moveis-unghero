import { prisma } from "@/lib/prisma";
import { getColaboradores } from "@/app/actions/colaboradores";
import { getCompanySlaStates } from "@/app/actions/productionSla";
import { getSessionCompanyId } from "@/lib/session";
import FactoryClient from "./FactoryClient";
import PageHeader from "@/components/PageHeader";
import type { ProjectSlaView } from "@/lib/productionSla";

export default async function FactoryPage({
  searchParams,
}: {
  searchParams: Promise<{ slaCheck?: string }>;
}) {
  const params = await searchParams;
  const userCompanyId = await getSessionCompanyId();

  const [colaboradoresRes, environments, slaStates] = await Promise.all([
    getColaboradores(userCompanyId),
    prisma.environment
      .findMany({
        where: {
          project: {
            client: { company_id: userCompanyId },
            files: { some: { aprovado_producao: true } },
          },
        },
        select: {
          id: true,
          nome: true,
          tipo: true,
          status: true,
          responsavel_id: true,
          ajudante_id: true,
          project: {
            select: {
              id: true,
              client: { select: { nome: true } },
            },
          },
          responsavel: { select: { name: true } },
          ajudante: { select: { name: true } },
        },
      })
      .catch((error) => {
        console.warn("Falha de conexão com banco de dados no chão de fábrica.", error);
        return [];
      }),
    getCompanySlaStates(userCompanyId),
  ]);

  const colaboradores =
    colaboradoresRes.success && colaboradoresRes.colaboradores
      ? colaboradoresRes.colaboradores.map((c: { id: string; name: string; cargo: string }) => ({
          id: c.id,
          name: c.name,
          cargo: c.cargo,
        }))
      : [];

  const formattedEnvs = environments.map((e) => ({
    id: e.id,
    nome: e.nome,
    tipo: e.tipo,
    status: e.status,
    projectId: e.project?.id || "",
    clientName: e.project?.client?.nome || "Cliente avulso",
    responsavelId: e.responsavel_id || null,
    responsavelNome: e.responsavel?.name || null,
    ajudanteId: e.ajudante_id || null,
    ajudanteNome: e.ajudante?.name || null,
  }));

  const slaByProject: Record<string, ProjectSlaView> = {};
  for (const sla of slaStates) {
    slaByProject[sla.projectId] = sla;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chão de Fábrica"
        description="Acompanhe em tempo real as etapas de fabricação e montagem dos cômodos liberados para produção."
      />

      <FactoryClient
        initialEnvironments={formattedEnvs}
        colaboradores={colaboradores}
        slaByProject={slaByProject}
        slaCheckProjectId={params.slaCheck}
      />
    </div>
  );
}
