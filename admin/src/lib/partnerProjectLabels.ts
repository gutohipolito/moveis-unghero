/** Labels e filtros compartilhados do portal do parceiro (projetos). */

export const PARTNER_PROJECT_STEPS = [
  { id: "LEAD", label: "Briefing" },
  { id: "ORCAMENTO", label: "Orçamento" },
  { id: "NEGOCIACAO", label: "Negociação" },
  { id: "CONFERENCIA_TECNICA", label: "Detalhe" },
  { id: "APROVADO", label: "Aprovado" },
  { id: "PRODUCAO", label: "Fábrica" },
  { id: "INSTALACAO", label: "Montagem" },
  { id: "FINALIZADO", label: "Entregue" },
] as const;

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
  | "PERDIDOS";

export function partnerProjectStageLabel(status: string): string {
  return STAGE_LABELS[status] ?? status;
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
  return statusGeral !== "PERDIDO" && statusGeral !== "FINALIZADO";
}

export function partnerProjectIsActive(statusGeral: string): boolean {
  return statusGeral !== "FINALIZADO" && statusGeral !== "PERDIDO";
}

/** Próximo marco legível para o parceiro (entrega prevista, quando houver). */
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
  return `Próximo marco: entrega ${label}`;
}

export function daysSinceIso(iso: string, now = new Date()): number {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return 0;
  const ms = now.getTime() - then.getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

export type PartnerProjectAttentionKind = "stalled" | "quote_ready" | "new_file";

export type PartnerProjectAttentionItem = {
  projectId: string;
  clientNome: string;
  kind: PartnerProjectAttentionKind;
  label: string;
};

/** Alertas acionáveis para o hub do painel (máx. alguns itens). */
export function buildPartnerProjectAttention(
  projects: Array<{
    id: string;
    status_geral: string;
    updatedAt: string;
    client: { nome: string };
    hasQuotePdf?: boolean;
    latestFileAt?: string | null;
  }>,
  options?: { stalledDays?: number; newFileDays?: number; limit?: number }
): PartnerProjectAttentionItem[] {
  const stalledDays = options?.stalledDays ?? 14;
  const newFileDays = options?.newFileDays ?? 7;
  const limit = options?.limit ?? 5;
  const now = new Date();
  const items: PartnerProjectAttentionItem[] = [];

  for (const project of projects) {
    if (!partnerProjectIsActive(project.status_geral)) continue;

    const daysIdle = daysSinceIso(project.updatedAt, now);
    if (daysIdle >= stalledDays) {
      items.push({
        projectId: project.id,
        clientNome: project.client.nome,
        kind: "stalled",
        label: `Sem atualização há ${daysIdle} dia${daysIdle === 1 ? "" : "s"}`,
      });
    }

    if (project.hasQuotePdf) {
      items.push({
        projectId: project.id,
        clientNome: project.client.nome,
        kind: "quote_ready",
        label: "PDF do orçamento disponível",
      });
    }

    if (project.latestFileAt) {
      const fileAge = daysSinceIso(project.latestFileAt, now);
      if (fileAge <= newFileDays) {
        items.push({
          projectId: project.id,
          clientNome: project.client.nome,
          kind: "new_file",
          label:
            fileAge === 0
              ? "Arquivo novo hoje"
              : `Arquivo novo há ${fileAge} dia${fileAge === 1 ? "" : "s"}`,
        });
      }
    }
  }

  const priority: Record<PartnerProjectAttentionKind, number> = {
    new_file: 0,
    quote_ready: 1,
    stalled: 2,
  };

  return items
    .sort((a, b) => priority[a.kind] - priority[b.kind])
    .slice(0, limit);
}
