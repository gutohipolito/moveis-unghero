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
