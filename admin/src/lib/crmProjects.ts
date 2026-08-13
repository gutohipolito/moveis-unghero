import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getAuthContext } from "@/lib/auth-guard";
import { resolveStageEntryAt } from "@/lib/crmStageDate";
import { toQuoteViewStats, type QuoteViewStats } from "@/lib/quoteViewTracking";
import { isOpsLimitedRole } from "@/lib/permissions";
import { OPS_CRM_STATUSES } from "@/lib/crmOpsAccess";
import { maybeRedactForRole } from "@/lib/viewerRedact";

const CRM_DELTA_FALLBACK = 80;
const CRM_SINCE_OVERLAP_MS = 2_000;

export type CrmBoardScope = "active" | "lost";

export type CrmBoardQuery = {
  scope?: CrmBoardScope;
  /** ISO; quando presente, devolve só o que mudou + IDs removidos. */
  since?: string | null;
  knownIds?: string[];
};

const STAGE_TIMELINE_WHERE: Prisma.TimelineWhereInput = {
  OR: [
    { acao: { contains: "para APROVADO", mode: "insensitive" } },
    { acao: { contains: "para Aprovados", mode: "insensitive" } },
    { acao: { contains: "movido para Aprovados", mode: "insensitive" } },
    { acao: { contains: "em Aprovados", mode: "insensitive" } },
    { acao: { contains: "para CONFERENCIA_TECNICA", mode: "insensitive" } },
    { acao: { contains: "para PRODUCAO", mode: "insensitive" } },
  ],
};

const CRM_QUOTE_SELECT = {
  aprovado_em: true,
  pdf_shared_at: true,
  pdf_view_count: true,
  pdf_first_viewed_at: true,
  pdf_last_viewed_at: true,
  pdf_last_device: true,
  pdf_last_os: true,
} as const;

/** Payload do funil: card + metadados. Briefing completo e timeline ficam no detalhe. */
export const CRM_BOARD_SELECT = {
  id: true,
  valor_previsto: true,
  status_geral: true,
  ultimo_contato_em: true,
  createdAt: true,
  updatedAt: true,
  motivo_perda: true,
  observacoes: true,
  obs_updated_at: true,
  obs_updated_by_id: true,
  obs_updated_by_name: true,
  conf_tecnica_resp1_id: true,
  conf_tecnica_resp2_id: true,
  conf_tecnica_resp1: { select: { id: true, name: true } },
  conf_tecnica_resp2: { select: { id: true, name: true } },
  quotes: {
    select: CRM_QUOTE_SELECT,
    where: {
      OR: [{ pdf_shared_at: { not: null } }, { aprovado_em: { not: null } }],
    },
    orderBy: [{ pdf_shared_at: "desc" }, { aprovado_em: "asc" }],
    take: 8,
  },
  timeline: {
    select: { acao: true, data: true },
    where: STAGE_TIMELINE_WHERE,
    orderBy: { data: "desc" },
    take: 8,
  },
  client: {
    select: {
      id: true,
      nome: true,
      cidade: true,
      origem: true,
      telefone: true,
      email: true,
    },
  },
  briefing: { select: { id: true } },
  _count: {
    select: { paymentReceipts: true },
  },
} satisfies Prisma.ProjectSelect;

/** @deprecated use CRM_BOARD_SELECT */
export const CRM_PROJECT_SELECT = CRM_BOARD_SELECT;

const CRM_BRIEFING_DETAIL_SELECT = {
  id: true,
  ambientes: true,
  tipo_imovel: true,
  fase_projeto: true,
  pronto: true,
  data_chaves: true,
  tem_projeto: true,
  estilo: true,
  faixa_investimento: true,
  prazo_inicio: true,
  pinterest_link: true,
  referencia_url: true,
  origem_lead: true,
  utm_source: true,
  utm_medium: true,
  utm_campaign: true,
  dispositivo: true,
  os: true,
  resolution: true,
  idioma: true,
  tempo_preenchimento: true,
  score: true,
  roteiro_sugerido: true,
  createdAt: true,
} satisfies Prisma.LeadBriefingSelect;

function crmEligibleWhere(
  companyId: string,
  opsLimited: boolean
): Prisma.ProjectWhereInput {
  return {
    client: { company_id: companyId },
    OR: [{ quotes: { some: {} } }, { briefing: { isNot: null } }],
    ...(opsLimited ? { status_geral: { in: [...OPS_CRM_STATUSES] } } : {}),
  };
}

function crmBoardWhere(
  companyId: string,
  opsLimited: boolean,
  scope: CrmBoardScope
): Prisma.ProjectWhereInput {
  const base = crmEligibleWhere(companyId, opsLimited);
  if (opsLimited) return base;
  if (scope === "lost") return { AND: [base, { status_geral: "PERDIDO" }] };
  return { AND: [base, { status_geral: { not: "PERDIDO" } }] };
}

type BoardRow = Prisma.ProjectGetPayload<{ select: typeof CRM_BOARD_SELECT }>;

function mapCrmBoardProject(
  project: BoardRow,
  opts: {
    opsLimited: boolean;
    viewerId: string | null;
    seenByProject: Map<string, Date>;
  }
) {
  const timelineForStage = (project.timeline ?? []).map((entry) => ({
    acao: entry.acao,
    data: entry.data ? new Date(entry.data).toISOString() : new Date().toISOString(),
  }));

  const approvedQuotes = project.quotes
    .filter((q) => q.aprovado_em)
    .sort(
      (a, b) =>
        new Date(a.aprovado_em!).getTime() - new Date(b.aprovado_em!).getTime()
    );
  const firstQuoteApprovedAt = approvedQuotes[0]?.aprovado_em
    ? new Date(approvedQuotes[0].aprovado_em).toISOString()
    : null;

  const sharedOpenQuote =
    project.quotes.find((q) => q.pdf_shared_at && !q.aprovado_em) ??
    project.quotes.find((q) => q.pdf_shared_at) ??
    null;

  const quoteShare: QuoteViewStats | null = sharedOpenQuote
    ? toQuoteViewStats(sharedOpenQuote)
    : null;

  const obsUpdatedAt = project.obs_updated_at
    ? new Date(project.obs_updated_at).toISOString()
    : null;
  const seenAt = opts.seenByProject.get(project.id);
  const hasUnreadNote = Boolean(
    !opts.opsLimited &&
      opts.viewerId &&
      project.obs_updated_at &&
      project.obs_updated_by_id !== opts.viewerId &&
      (!seenAt || seenAt < project.obs_updated_at)
  );

  return {
    id: project.id,
    valor_previsto: Number(project.valor_previsto),
    status_geral: project.status_geral,
    ultimo_contato_em: project.ultimo_contato_em
      ? new Date(project.ultimo_contato_em).toISOString()
      : null,
    createdAt: project.createdAt ? new Date(project.createdAt).toISOString() : null,
    updatedAt: project.updatedAt ? new Date(project.updatedAt).toISOString() : null,
    motivo_perda: project.motivo_perda || null,
    observacoes: project.observacoes || null,
    obs_updated_at: obsUpdatedAt,
    obs_updated_by_name: project.obs_updated_by_name || null,
    hasUnreadNote,
    hasBriefing: Boolean(project.briefing),
    conf_tecnica_resp1_id: project.conf_tecnica_resp1_id || null,
    conf_tecnica_resp1Nome: project.conf_tecnica_resp1?.name || null,
    conf_tecnica_resp2_id: project.conf_tecnica_resp2_id || null,
    conf_tecnica_resp2Nome: project.conf_tecnica_resp2?.name || null,
    stage_entered_at: resolveStageEntryAt(
      project.status_geral,
      timelineForStage,
      firstQuoteApprovedAt
    ),
    quoteShare,
    hasPaymentReceipt: (project._count?.paymentReceipts ?? 0) > 0,
    timeline: [] as Array<{
      id: string;
      acao: string;
      data: string;
      user: { name: string };
    }>,
    client: project.client,
    briefing: null as null,
  };
}

function redactCrmProjects<T extends { client: { telefone: string; email: string } }>(
  mapped: T[],
  cargo: string | null | undefined
): T[] {
  const redacted = maybeRedactForRole(mapped, cargo);
  if (!isOpsLimitedRole(cargo)) return redacted;
  return redacted.map((project) => ({
    ...project,
    client: {
      ...project.client,
      telefone: "",
      email: "",
    },
  }));
}

function sortCrmBoard<T extends {
  hasUnreadNote?: boolean;
  obs_updated_at?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
}>(mapped: T[]) {
  mapped.sort((a, b) => {
    if (a.hasUnreadNote !== b.hasUnreadNote) {
      return a.hasUnreadNote ? -1 : 1;
    }
    const aBump = a.obs_updated_at || a.updatedAt || a.createdAt || "";
    const bBump = b.obs_updated_at || b.updatedAt || b.createdAt || "";
    return bBump.localeCompare(aBump);
  });
  return mapped;
}

async function loadNoteReads(
  viewerId: string | null,
  opsLimited: boolean,
  projectIds?: string[]
) {
  if (!viewerId || opsLimited) return new Map<string, Date>();
  const rows = await prisma.projectNoteRead
    .findMany({
      where: {
        user_id: viewerId,
        ...(projectIds && projectIds.length > 0
          ? { project_id: { in: projectIds } }
          : {}),
      },
      select: { project_id: true, seen_at: true },
    })
    .catch(() => [] as { project_id: string; seen_at: Date }[]);
  return new Map(rows.map((r) => [r.project_id, r.seen_at] as const));
}

export type CrmBoardProject = ReturnType<typeof mapCrmBoardProject>;

export type CrmBoardSnapshot = {
  projects: CrmBoardProject[];
  removedIds: string[];
  mode: "full" | "delta";
  lostCount: number;
  serverTime: string;
};

export async function fetchCrmProjects(
  companyId: string,
  query: CrmBoardQuery = {}
): Promise<CrmBoardSnapshot> {
  const empty: CrmBoardSnapshot = {
    projects: [],
    removedIds: [],
    mode: "full",
    lostCount: 0,
    serverTime: new Date().toISOString(),
  };

  const auth = await getAuthContext();
  const opsLimited = isOpsLimitedRole(auth?.cargo);
  const viewerId = auth?.userId ?? null;
  const scope: CrmBoardScope = query.scope === "lost" ? "lost" : "active";
  const where = crmBoardWhere(companyId, opsLimited, scope);
  const sinceDate = parseSince(query.since);
  const knownIds = Array.isArray(query.knownIds) ? query.knownIds : [];

  try {
    const lostCountPromise =
      opsLimited || scope === "lost"
        ? Promise.resolve(0)
        : prisma.project.count({
            where: crmBoardWhere(companyId, false, "lost"),
          });

    if (sinceDate && knownIds.length > 0) {
      const deltaWhere: Prisma.ProjectWhereInput = {
        AND: [
          where,
          {
            OR: [
              { updatedAt: { gt: sinceDate } },
              { timeline: { some: { data: { gt: sinceDate } } } },
              { quotes: { some: { updatedAt: { gt: sinceDate } } } },
            ],
          },
        ],
      };

      const [changedRows, currentIdRows, lostCount] = await Promise.all([
        prisma.project.findMany({
          where: deltaWhere,
          select: CRM_BOARD_SELECT,
        }),
        prisma.project.findMany({
          where,
          select: { id: true },
        }),
        lostCountPromise,
      ]);

      if (changedRows.length <= CRM_DELTA_FALLBACK) {
        const currentIdSet = new Set(currentIdRows.map((row) => row.id));
        const removedIds = knownIds.filter((id) => !currentIdSet.has(id));
        const seenByProject = await loadNoteReads(
          viewerId,
          opsLimited,
          changedRows.map((row) => row.id)
        );
        const mapped = redactCrmProjects(
          changedRows.map((project) =>
            mapCrmBoardProject(project, { opsLimited, viewerId, seenByProject })
          ),
          auth?.cargo
        );
        return {
          projects: sortCrmBoard(mapped),
          removedIds,
          mode: "delta",
          lostCount: scope === "lost" ? currentIdRows.length : lostCount,
          serverTime: new Date().toISOString(),
        };
      }
    }

    const [projectsResult, lostCount] = await Promise.all([
      prisma.project.findMany({
        where,
        select: CRM_BOARD_SELECT,
      }),
      lostCountPromise,
    ]);
    const seenByProject = await loadNoteReads(
      viewerId,
      opsLimited,
      projectsResult.map((row) => row.id)
    );
    const mapped = redactCrmProjects(
      projectsResult.map((project) =>
        mapCrmBoardProject(project, { opsLimited, viewerId, seenByProject })
      ),
      auth?.cargo
    );

    return {
      projects: sortCrmBoard(mapped),
      removedIds: [],
      mode: "full",
      lostCount: scope === "lost" ? mapped.length : lostCount,
      serverTime: new Date().toISOString(),
    };
  } catch (error) {
    console.warn("Conexão ao banco falhou no carregamento do CRM.", error);
    return empty;
  }
}

export async function fetchCrmProjectDetails(projectId: string) {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false as const, error: "Não autenticado" };
  }

  const opsLimited = isOpsLimitedRole(auth.cargo);

  try {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        client: { company_id: auth.companyId },
      },
      select: {
        id: true,
        timeline: {
          select: {
            id: true,
            acao: true,
            data: true,
            user: { select: { name: true } },
          },
          orderBy: { data: "desc" },
          take: 40,
        },
        briefing: opsLimited ? false : { select: CRM_BRIEFING_DETAIL_SELECT },
      },
    });

    if (!project) {
      return { success: false as const, error: "Projeto não encontrado" };
    }

    return {
      success: true as const,
      timeline: project.timeline.map((entry) => ({
        id: entry.id,
        acao: entry.acao,
        data: entry.data ? new Date(entry.data).toISOString() : new Date().toISOString(),
        user: entry.user,
      })),
      briefing: project.briefing
        ? {
            ...project.briefing,
            createdAt: project.briefing.createdAt
              ? new Date(project.briefing.createdAt).toISOString()
              : null,
          }
        : null,
    };
  } catch (error) {
    console.warn("Falha ao carregar detalhe do card do CRM.", error);
    return { success: false as const, error: "Não foi possível carregar o card." };
  }
}

function parseSince(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return null;
  return new Date(parsed.getTime() - CRM_SINCE_OVERLAP_MS);
}
