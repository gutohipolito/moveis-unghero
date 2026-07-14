import { getColaboradores } from "@/app/actions/colaboradores";
import { getCompanySlaStates } from "@/app/actions/productionSla";
import { prisma } from "@/lib/prisma";
import { buildLiveSnapshotVersion } from "@/lib/liveSnapshot";
import type { ProjectSlaView } from "@/lib/productionSla";
import {
  buildBriefingEvents,
  buildFollowUpEvent,
  buildProductionStartEvent,
  buildSlaEvent,
  type DerivedAgendaEvent,
} from "@/lib/agendaEvents";

export async function fetchFactoryBoard(companyId: string) {
  const [environments, slaStates] = await Promise.all([
    prisma.environment
      .findMany({
        where: {
          project: {
            client: { company_id: companyId },
            OR: [
              { files: { some: { aprovado_producao: true } } },
              { status_geral: { in: ["APROVADO", "PRODUCAO"] } },
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

/**
 * Eventos derivados (somente-leitura) da agenda: formulários recebidos, prazos de
 * orçamento, follow-ups parados, prazos de SLA de produção e marcos de início de produção.
 * A fonte de verdade permanece nos modelos originais (LeadBriefing/Project/ProjectSlaState).
 */
export async function fetchAgendaDerivedEvents(companyId: string): Promise<DerivedAgendaEvent[]> {
  try {
    const [briefings, followUpProjects, slaStates, productionStates] = await Promise.all([
      prisma.leadBriefing.findMany({
        where: { project: { client: { company_id: companyId } } },
        select: {
          createdAt: true,
          project: {
            select: {
              id: true,
              status_geral: true,
              client: { select: { nome: true } },
            },
          },
        },
      }),
      prisma.project.findMany({
        where: {
          client: { company_id: companyId },
          status_geral: { in: ["LEAD", "ORCAMENTO", "NEGOCIACAO"] },
        },
        select: {
          id: true,
          status_geral: true,
          ultimo_contato_em: true,
          createdAt: true,
          client: { select: { nome: true } },
        },
      }),
      getCompanySlaStates(companyId),
      prisma.projectSlaState.findMany({
        where: {
          project: {
            client: { company_id: companyId },
            files: { some: { aprovado_producao: true } },
          },
        },
        select: {
          createdAt: true,
          project: {
            select: {
              id: true,
              client: { select: { nome: true } },
            },
          },
        },
      }),
    ]);

    const events: DerivedAgendaEvent[] = [];

    for (const briefing of briefings) {
      if (!briefing.project) continue;
      events.push(
        ...buildBriefingEvents({
          projectId: briefing.project.id,
          clientName: briefing.project.client?.nome || "Cliente",
          createdAt: briefing.createdAt,
          projectStatus: briefing.project.status_geral,
        })
      );
    }

    for (const project of followUpProjects) {
      const event = buildFollowUpEvent({
        projectId: project.id,
        clientName: project.client?.nome || "Cliente",
        status_geral: project.status_geral,
        ultimo_contato_em: project.ultimo_contato_em,
        createdAt: project.createdAt,
      });
      if (event) events.push(event);
    }

    for (const sla of slaStates) {
      const event = buildSlaEvent(sla);
      if (event) events.push(event);
    }

    for (const state of productionStates) {
      if (!state.project) continue;
      events.push(
        buildProductionStartEvent({
          projectId: state.project.id,
          clientName: state.project.client?.nome || "Projeto",
          createdAt: state.createdAt,
        })
      );
    }

    return events;
  } catch (error) {
    console.warn("Falha ao montar eventos derivados da agenda.", error);
    return [];
  }
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
