/** Labels, fluxo VEIO e atualizações do portal do parceiro. */

export const PARTNER_PROJECT_STEPS = [
  { id: "LEAD", label: "Briefing", family: "comercial" as const },
  { id: "ORCAMENTO", label: "Orçamento", family: "comercial" as const },
  { id: "NEGOCIACAO", label: "Negociação", family: "comercial" as const },
  { id: "CONFERENCIA_TECNICA", label: "Detalhe", family: "tecnica" as const },
  { id: "APROVADO", label: "Aprovado", family: "tecnica" as const },
  { id: "PRODUCAO", label: "Fábrica", family: "execucao" as const },
  { id: "INSTALACAO", label: "Montagem", family: "execucao" as const },
  { id: "FINALIZADO", label: "Entregue", family: "conclusao" as const },
] as const;

export type PartnerProjectStepId = (typeof PARTNER_PROJECT_STEPS)[number]["id"];
export type PartnerStageFamily = "comercial" | "tecnica" | "execucao" | "conclusao";

const STAGE_LABELS: Record<string, string> = {
  LEAD: "Briefing",
  ORCAMENTO: "Orçamento",
  NEGOCIACAO: "Negociação",
  CONFERENCIA_TECNICA: "Detalhe",
  APROVADO: "Aprovado",
  PRODUCAO: "Fábrica",
  INSTALACAO: "Montagem",
  FINALIZADO: "Entregue",
  PERDIDO: "Perdido",
};

const ENVIRONMENT_STATUS_LABELS: Record<string, string> = {
  AGUARDANDO_MEDICAO: "Aguardando medição",
  EM_DETALHAMENTO: "Em detalhamento",
  PRONTO_PRODUCAO: "Fila de produção",
  EM_CORTE: "Corte / usinagem",
  MONTAGEM_FABRICA: "Montagem na fábrica",
  PRONTO_ENTREGA: "Pronto para entrega",
  EM_INSTALACAO: "Instalação",
  FINALIZADO: "Finalizado",
};

export type PartnerProjectStatusFilter =
  | "TODOS"
  | "ATIVOS"
  | "FINALIZADOS"
  | "PERDIDOS"
  | PartnerProjectStepId;

export function partnerProjectStageLabel(status: string): string {
  return STAGE_LABELS[status] ?? status;
}

export function partnerProjectStageFamily(status: string): PartnerStageFamily | null {
  const step = PARTNER_PROJECT_STEPS.find((s) => s.id === status);
  return step?.family ?? null;
}

export function partnerProjectStepIndex(status: string): number {
  if (status === "PERDIDO") return -1;
  const idx = PARTNER_PROJECT_STEPS.findIndex((s) => s.id === status);
  return idx >= 0 ? idx : 0;
}

export function partnerEnvironmentStatusLabel(status: string): string {
  return ENVIRONMENT_STATUS_LABELS[status] ?? status.replace(/_/g, " ").toLowerCase();
}

export function formatPartnerProjectEnvironmentsLine(
  environments: Array<{ nome: string }>
): string | null {
  if (environments.length === 0) return null;
  if (environments.length <= 3) {
    return environments.map((e) => e.nome).join(", ");
  }
  return `${environments.length} ambientes`;
}

export function parsePartnerProjectFilter(
  raw: string | null | undefined
): PartnerProjectStatusFilter {
  const normalized = (raw || "").trim().toUpperCase();
  if (
    normalized === "TODOS" ||
    normalized === "ATIVOS" ||
    normalized === "FINALIZADOS" ||
    normalized === "PERDIDOS"
  ) {
    return normalized;
  }
  if (PARTNER_PROJECT_STEPS.some((s) => s.id === normalized)) {
    return normalized as PartnerProjectStepId;
  }
  return "ATIVOS";
}

export function partnerProjectsHref(filter?: PartnerProjectStatusFilter): string {
  if (!filter || filter === "ATIVOS") return "/parceiro/projetos";
  return `/parceiro/projetos?filtro=${filter.toLowerCase()}`;
}

export function matchesPartnerProjectFilter(
  statusGeral: string,
  filter: PartnerProjectStatusFilter
): boolean {
  if (filter === "TODOS") return true;
  if (filter === "PERDIDOS") return statusGeral === "PERDIDO";
  if (filter === "FINALIZADOS") return statusGeral === "FINALIZADO";
  if (filter === "ATIVOS") {
    return statusGeral !== "PERDIDO" && statusGeral !== "FINALIZADO";
  }
  return statusGeral === filter;
}

export function partnerProjectIsActive(statusGeral: string): boolean {
  return statusGeral !== "FINALIZADO" && statusGeral !== "PERDIDO";
}

/** Próximo marco legível (entrega/montagem prevista). */
export function partnerProjectNextMilestone(input: {
  statusGeral: string;
  dataEntregaPrevista?: string | null;
}): string | null {
  if (input.statusGeral === "PERDIDO" || input.statusGeral === "FINALIZADO") {
    return null;
  }
  if (!input.dataEntregaPrevista) return null;
  const d = new Date(input.dataEntregaPrevista);
  if (Number.isNaN(d.getTime())) return null;
  const label = d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const isInstall = input.statusGeral === "INSTALACAO" || input.statusGeral === "PRODUCAO";
  return isInstall ? `Montagem prevista para ${label}` : `Entrega prevista para ${label}`;
}

export function daysSinceIso(iso: string, now = new Date()): number {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return 0;
  const ms = now.getTime() - then.getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

export function formatPartnerRelativeTime(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfThat = new Date(d);
  startOfThat.setHours(0, 0, 0, 0);
  const dayDiff = Math.round(
    (startOfToday.getTime() - startOfThat.getTime()) / (24 * 60 * 60 * 1000)
  );
  const time = d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (dayDiff === 0) return `Hoje, ${time}`;
  if (dayDiff === 1) return `Ontem, ${time}`;
  if (dayDiff > 1 && dayDiff <= 7) {
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export type PartnerFlowBucket = {
  id: PartnerProjectStepId;
  label: string;
  family: PartnerStageFamily;
  count: number;
  projectIds: string[];
};

export function buildPartnerProjectFlow(
  projects: Array<{ id: string; status_geral: string }>
): PartnerFlowBucket[] {
  return PARTNER_PROJECT_STEPS.map((step) => {
    const matched = projects.filter((p) => p.status_geral === step.id);
    return {
      id: step.id,
      label: step.label,
      family: step.family,
      count: matched.length,
      projectIds: matched.map((p) => p.id),
    };
  });
}

export type PartnerProjectUpdateKind =
  | "stage"
  | "file"
  | "image"
  | "quote"
  | "schedule";

export type PartnerProjectUpdate = {
  id: string;
  projectId: string;
  projectLabel: string;
  kind: PartnerProjectUpdateKind;
  label: string;
  occurredAt: string;
};

type UpdateSourceProject = {
  id: string;
  status_geral: string;
  updatedAt: string;
  data_entrega_prevista?: string | null;
  hasQuotePdf?: boolean;
  quotePdfAt?: string | null;
  latestFileAt?: string | null;
  filesCount?: number;
  client: { nome: string };
};

/** Atualizações informativas (sem cobrança de “parado”). */
export function buildPartnerRecentUpdates(
  projects: UpdateSourceProject[],
  options?: { limit?: number; fileDays?: number; quoteDays?: number }
): PartnerProjectUpdate[] {
  const limit = options?.limit ?? 6;
  const fileDays = options?.fileDays ?? 14;
  const quoteDays = options?.quoteDays ?? 21;
  const now = new Date();
  const items: PartnerProjectUpdate[] = [];

  for (const project of projects) {
    if (project.status_geral === "PERDIDO") continue;
    const label = project.client.nome;

    if (project.latestFileAt && daysSinceIso(project.latestFileAt, now) <= fileDays) {
      const isImageish = (project.filesCount ?? 0) > 0;
      items.push({
        id: `file-${project.id}-${project.latestFileAt}`,
        projectId: project.id,
        projectLabel: label,
        kind: isImageish ? "image" : "file",
        label: isImageish
          ? `Arquivo novo disponível · ${label}`
          : `Arquivo novo disponível · ${label}`,
        occurredAt: project.latestFileAt,
      });
    }

    const quoteAt = project.quotePdfAt;
    if (
      project.hasQuotePdf &&
      quoteAt &&
      daysSinceIso(quoteAt, now) <= quoteDays
    ) {
      items.push({
        id: `quote-${project.id}-${quoteAt}`,
        projectId: project.id,
        projectLabel: label,
        kind: "quote",
        label: `PDF do orçamento disponível · ${label}`,
        occurredAt: quoteAt,
      });
    } else if (project.hasQuotePdf && !quoteAt && daysSinceIso(project.updatedAt, now) <= 7) {
      items.push({
        id: `quote-${project.id}`,
        projectId: project.id,
        projectLabel: label,
        kind: "quote",
        label: `Orçamento disponível · ${label}`,
        occurredAt: project.updatedAt,
      });
    }

    if (project.data_entrega_prevista) {
      const delivery = new Date(project.data_entrega_prevista);
      if (!Number.isNaN(delivery.getTime())) {
        const daysUntil = Math.ceil(
          (delivery.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        );
        if (daysUntil >= -2 && daysUntil <= 45) {
          const dateLabel = delivery.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
          });
          items.push({
            id: `schedule-${project.id}-${project.data_entrega_prevista}`,
            projectId: project.id,
            projectLabel: label,
            kind: "schedule",
            label:
              project.status_geral === "INSTALACAO" || project.status_geral === "PRODUCAO"
                ? `Montagem prevista para ${dateLabel} · ${label}`
                : `Entrega prevista para ${dateLabel} · ${label}`,
            occurredAt: project.updatedAt,
          });
        }
      }
    }

    if (
      partnerProjectIsActive(project.status_geral) &&
      daysSinceIso(project.updatedAt, now) <= 5 &&
      (project.status_geral === "PRODUCAO" ||
        project.status_geral === "INSTALACAO" ||
        project.status_geral === "APROVADO")
    ) {
      items.push({
        id: `stage-${project.id}-${project.status_geral}-${project.updatedAt}`,
        projectId: project.id,
        projectLabel: label,
        kind: "stage",
        label: `Projeto em ${partnerProjectStageLabel(project.status_geral)} · ${label}`,
        occurredAt: project.updatedAt,
      });
    }
  }

  const seen = new Set<string>();
  return items
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .filter((item) => {
      const key = `${item.projectId}:${item.kind}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

export type PartnerProjectHistoryKind =
  | "stage"
  | "quote"
  | "file"
  | "image"
  | "note"
  | "schedule";

export type PartnerProjectHistoryItem = {
  id: string;
  kind: PartnerProjectHistoryKind;
  label: string;
  author: string | null;
  occurredAt: string;
};

function isPartnerImageMime(mime: string, name?: string): boolean {
  if (mime.startsWith("image/")) return true;
  const lower = (name || "").toLowerCase();
  return (
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".png") ||
    lower.endsWith(".webp") ||
    lower.endsWith(".heic") ||
    lower.endsWith(".heif")
  );
}

/** Histórico informativo de um projeto (sem eventos internos da fábrica). */
export function buildPartnerProjectHistory(input: {
  statusGeral: string;
  updatedAt: string;
  dataEntregaPrevista?: string | null;
  quotes: Array<{
    id: string;
    versao: number;
    codigo: string | null;
    publicUrl: string | null;
    aprovado_em: string | null;
  }>;
  files: Array<{
    id: string;
    nome: string;
    mime_type: string;
    partnerNome: string;
    createdAt: string;
  }>;
  notes: Array<{
    id: string;
    partnerNome: string;
    createdAt: string;
  }>;
}): PartnerProjectHistoryItem[] {
  const items: PartnerProjectHistoryItem[] = [];

  if (input.statusGeral !== "PERDIDO") {
    items.push({
      id: `stage-${input.statusGeral}-${input.updatedAt}`,
      kind: "stage",
      label: `Etapa atual: ${partnerProjectStageLabel(input.statusGeral)}`,
      author: "Móveis Unghero",
      occurredAt: input.updatedAt,
    });
  }

  for (const quote of input.quotes) {
    if (!quote.publicUrl) continue;
    const when = quote.aprovado_em || input.updatedAt;
    items.push({
      id: `quote-${quote.id}`,
      kind: "quote",
      label:
        quote.versao > 1
          ? `Orçamento disponível (v${quote.versao}${quote.codigo ? ` · ${quote.codigo}` : ""})`
          : `Orçamento disponível${quote.codigo ? ` · ${quote.codigo}` : ""}`,
      author: "Móveis Unghero",
      occurredAt: when,
    });
  }

  for (const file of input.files) {
    const image = isPartnerImageMime(file.mime_type, file.nome);
    items.push({
      id: `file-${file.id}`,
      kind: image ? "image" : "file",
      label: image
        ? `Imagem adicionada · ${file.nome}`
        : `Arquivo adicionado · ${file.nome}`,
      author: file.partnerNome,
      occurredAt: file.createdAt,
    });
  }

  for (const note of input.notes) {
    items.push({
      id: `note-${note.id}`,
      kind: "note",
      label: "Observação registrada",
      author: note.partnerNome,
      occurredAt: note.createdAt,
    });
  }

  const milestone = partnerProjectNextMilestone({
    statusGeral: input.statusGeral,
    dataEntregaPrevista: input.dataEntregaPrevista,
  });
  if (milestone && input.dataEntregaPrevista) {
    items.push({
      id: `schedule-${input.dataEntregaPrevista}`,
      kind: "schedule",
      label: milestone,
      author: "Móveis Unghero",
      occurredAt: input.dataEntregaPrevista,
    });
  }

  return items
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, 24);
}

export function partnerFileIsImage(mime: string, name?: string): boolean {
  return isPartnerImageMime(mime, name);
}

export function partnerOverviewMetrics(
  projects: Array<{
    status_geral: string;
    data_entrega_prevista?: string | null;
  }>
) {
  const now = new Date();
  const linked = projects.filter((p) => p.status_geral !== "PERDIDO").length;
  const inFactory = projects.filter((p) => p.status_geral === "PRODUCAO").length;
  const upcomingInstall = projects.filter((p) => {
    if (p.status_geral === "PERDIDO" || p.status_geral === "FINALIZADO") return false;
    if (!p.data_entrega_prevista) return false;
    if (p.status_geral !== "PRODUCAO" && p.status_geral !== "INSTALACAO") {
      return false;
    }
    const d = new Date(p.data_entrega_prevista);
    if (Number.isNaN(d.getTime())) return false;
    const daysUntil = Math.ceil(
      (d.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    );
    return daysUntil >= -1 && daysUntil <= 45;
  }).length;

  return { linked, inFactory, upcomingInstall };
}

/** @deprecated Prefer buildPartnerRecentUpdates — mantido por compat. */
export type PartnerProjectAttentionKind = "stalled" | "quote_ready" | "new_file";
export type PartnerProjectAttentionItem = {
  projectId: string;
  clientNome: string;
  kind: PartnerProjectAttentionKind;
  label: string;
};

export function buildPartnerProjectAttention(
  projects: Array<{
    id: string;
    status_geral: string;
    updatedAt: string;
    client: { nome: string };
    hasQuotePdf?: boolean;
    latestFileAt?: string | null;
    data_entrega_prevista?: string | null;
    quotePdfAt?: string | null;
    filesCount?: number;
  }>,
  options?: { limit?: number }
): PartnerProjectAttentionItem[] {
  return buildPartnerRecentUpdates(projects, { limit: options?.limit ?? 5 }).map(
    (u) => ({
      projectId: u.projectId,
      clientNome: u.projectLabel,
      kind:
        u.kind === "quote"
          ? "quote_ready"
          : u.kind === "file" || u.kind === "image"
            ? "new_file"
            : "quote_ready",
      label: u.label,
    })
  );
}
