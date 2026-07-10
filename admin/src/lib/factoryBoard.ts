import { getColaboradores } from "@/app/actions/colaboradores";
import { getCompanySlaStates } from "@/app/actions/productionSla";
import { prisma } from "@/lib/prisma";
import { buildLiveSnapshotVersion } from "@/lib/liveSnapshot";
import type { ProjectSlaView } from "@/lib/productionSla";

export async function fetchFactoryBoard(companyId: string) {
  const [environments, slaStates] = await Promise.all([
    prisma.environment
      .findMany({
        where: {
          project: {
            client: { company_id: companyId },
            OR: [
              { files: { some: { aprovado_producao: true } } },
              { status_geral: "PRODUCAO" },
            ],
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
    getCompanySlaStates(companyId),
  ]);

  const formattedEnvironments = environments.map((environment) => ({
    id: environment.id,
    nome: environment.nome,
    tipo: environment.tipo,
    status: environment.status,
    projectId: environment.project?.id || "",
    clientName: environment.project?.client?.nome || "Cliente avulso",
    responsavelId: environment.responsavel_id || null,
    responsavelNome: environment.responsavel?.name || null,
    ajudanteId: environment.ajudante_id || null,
    ajudanteNome: environment.ajudante?.name || null,
  }));

  const slaByProject: Record<string, ProjectSlaView> = {};
  for (const sla of slaStates) {
    slaByProject[sla.projectId] = sla;
  }

  const version = buildLiveSnapshotVersion([
    ...formattedEnvironments.map((environment) => ({
      id: environment.id,
      status: environment.status,
      responsavelId: environment.responsavelId ?? "",
      ajudanteId: environment.ajudanteId ?? "",
    })),
    ...slaStates.map((sla) => ({
      id: sla.projectId,
      currentStage: sla.currentStage,
      stageStartedAt: sla.stageStartedAt,
      completed: sla.completedStages.join(","),
    })),
  ]);

  return {
    environments: formattedEnvironments,
    slaByProject,
    version,
  };
}

export async function fetchAgendaEvents(companyId: string) {
  const tasks = await prisma.task
    .findMany({
      where: { project: { client: { company_id: companyId } } },
      include: { project: { include: { client: true } } },
      orderBy: { data: "asc" },
    })
    .catch((error) => {
      console.warn("Falha de conexão com banco de dados na busca da agenda.", error);
      return [];
    });

  const events = tasks.map((task) => ({
    id: task.id,
    titulo: task.titulo || "Compromisso Técnico",
    descricao: task.descricao || "",
    responsavel: task.responsavel,
    data: task.data.toISOString(),
    status: task.status,
    tipo: task.tipo || "OUTROS",
    projectName: task.project?.client?.nome || "Sem Projeto Associado",
    projectId: task.project?.id || "",
  }));

  const version = buildLiveSnapshotVersion(
    events.map((event) => ({
      id: event.id,
      status: event.status,
      data: event.data,
      titulo: event.titulo,
      responsavel: event.responsavel,
    }))
  );

  return { events, version };
}

export async function fetchColaboradoresSelect(companyId: string) {
  const colaboradoresRes = await getColaboradores(companyId);
  return colaboradoresRes.success && colaboradoresRes.colaboradores
    ? colaboradoresRes.colaboradores.map((colaborador: { id: string; name: string; cargo: string }) => ({
        id: colaborador.id,
        name: colaborador.name,
        cargo: colaborador.cargo,
      }))
    : [];
}
