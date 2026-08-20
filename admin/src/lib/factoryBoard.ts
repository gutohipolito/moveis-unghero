import { getColaboradores } from "@/app/actions/colaboradores";
import { getCompanySlaStates } from "@/app/actions/productionSla";
import { prisma } from "@/lib/prisma";
import { buildLiveSnapshotVersion } from "@/lib/liveSnapshot";
import type { ProjectSlaView } from "@/lib/productionSla";
import {
  buildBriefingEvents,
  buildProductionStartEvent,
  buildSlaEvent,
  type DerivedAgendaEvent,
} from "@/lib/agendaEvents";
import {
  countTechSheetFields,
  isImageMime,
  isPdfMime,
  summarizeText,
  type FactoryBoardEnvironment,
} from "@/lib/factoryEnvironment";
import { linkedQuoteSubitens } from "@/lib/quoteItems";

export async function fetchFactoryBoard(companyId: string) {
  const [environments, slaStates, factoryProjectFiles] = await Promise.all([
    prisma.environment
      .findMany({
        where: {
          project: {
            client: { company_id: companyId },
            // Só entra na fila da fábrica após ir para Produção (ou Instalação).
            status_geral: { in: ["PRODUCAO", "INSTALACAO"] },
          },
        },
        select: {
          id: true,
          nome: true,
          tipo: true,
          status: true,
          responsavel_id: true,
          ajudante_id: true,
          materiais: true,
          ferragens: true,
          acabamentos: true,
          medidas_observacoes: true,
          observacoes_fabrica: true,
          capa_attachment_id: true,
          quoteItem: {
            select: { subitens: true },
          },
          project: {
            select: {
              id: true,
              client: { select: { id: true, nome: true } },
            },
          },
          responsavel: { select: { name: true } },
          ajudante: { select: { name: true } },
          _count: { select: { attachments: true } },
          attachments: {
            select: {
              id: true,
              url: true,
              mime_type: true,
              nome: true,
              categoria: true,
            },
            orderBy: { createdAt: "desc" },
            take: 8,
          },
        },
      })
      .catch((error) => {
        console.warn("Falha de conexão com banco de dados no chão de fábrica.", error);
        return [];
      }),
    getCompanySlaStates(companyId),
    prisma.environmentAttachment
      .findMany({
        where: {
          categoria: "PROJETO_FABRICA",
          environment: {
            project: {
              client: { company_id: companyId },
              status_geral: { in: ["PRODUCAO", "INSTALACAO"] },
            },
          },
        },
        select: {
          environment_id: true,
          mime_type: true,
          url: true,
          nome: true,
        },
      })
      .catch(() => []),
  ]);

  const factoryFilesByEnv = new Map<
    string,
    Array<{ mime_type: string; url: string; nome: string }>
  >();
  for (const file of factoryProjectFiles) {
    const list = factoryFilesByEnv.get(file.environment_id) ?? [];
    list.push(file);
    factoryFilesByEnv.set(file.environment_id, list);
  }

  const formattedEnvironments: FactoryBoardEnvironment[] = environments.map((environment) => {
    const fill = countTechSheetFields(environment);
    const factoryFiles = factoryFilesByEnv.get(environment.id) ?? [];
    const coverImage =
      environment.attachments.find(
        (item) => item.id === environment.capa_attachment_id && isImageMime(item.mime_type)
      ) ??
      environment.attachments.find((item) => isImageMime(item.mime_type)) ??
      factoryFiles.find((item) => isImageMime(item.mime_type)) ??
      null;
    const coverPdf =
      !coverImage
        ? environment.attachments.find((item) => isPdfMime(item.mime_type, item.nome ?? item.url)) ??
          factoryFiles.find((item) => isPdfMime(item.mime_type, item.nome ?? item.url)) ??
          null
        : null;

    return {
      id: environment.id,
      nome: environment.nome,
      tipo: environment.tipo,
      status: environment.status,
      projectId: environment.project?.id || "",
      clientId: environment.project?.client?.id || "",
      clientName: environment.project?.client?.nome || "Cliente avulso",
      responsavelId: environment.responsavel_id || null,
      responsavelNome: environment.responsavel?.name || null,
      ajudanteId: environment.ajudante_id || null,
      ajudanteNome: environment.ajudante?.name || null,
      materiais: environment.materiais,
      ferragens: environment.ferragens,
      acabamentos: environment.acabamentos,
      medidasObservacoes: environment.medidas_observacoes,
      observacoesFabrica: environment.observacoes_fabrica,
      materialsSummary: summarizeText(environment.materiais),
      hardwareSummary: summarizeText(environment.ferragens),
      approvedSubitens: linkedQuoteSubitens(environment.quoteItem),
      attachmentCount: environment._count.attachments,
      coverUrl: coverImage?.url ?? null,
      coverPdfUrl: coverPdf?.url ?? null,
      hasFactoryProject: factoryFiles.length > 0,
      hasFactoryProjectImages: factoryFiles.some((item) => isImageMime(item.mime_type)),
      techSheetFilled: fill.filled,
      techSheetTotal: fill.total,
      techSheetComplete: fill.complete,
    };
  });

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
      materials: environment.materiais ?? "",
      hardware: environment.ferragens ?? "",
      finishes: environment.acabamentos ?? "",
      measures: environment.medidasObservacoes ?? "",
      notes: environment.observacoesFabrica ?? "",
      attachments: environment.attachmentCount,
      cover: environment.coverUrl ?? environment.coverPdfUrl ?? "",
      factoryProject: environment.hasFactoryProject ? "1" : "0",
      factoryImages: environment.hasFactoryProjectImages ? "1" : "0",
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
 * Eventos derivados (somente-leitura) da agenda: formulários recebidos,
 * prazos de SLA de produção e marcos de início de produção.
 * A fonte de verdade permanece nos modelos originais (LeadBriefing/Project/ProjectSlaState).
 */
export async function fetchAgendaDerivedEvents(companyId: string): Promise<DerivedAgendaEvent[]> {
  try {
    // Follow-up comercial não entra mais na agenda (só indicadores no CRM).
    const [briefings, slaStates, productionStates] = await Promise.all([
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
