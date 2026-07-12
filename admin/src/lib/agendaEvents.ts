import {
  FOLLOW_UP_WARNING_DAYS,
  getFollowUpLevel,
  getLastContactDate,
  type FollowUpLevel,
} from "@/lib/followUp";
import {
  getNextStageKey,
  getSlaDueDate,
  getStageConfig,
  isSlaFinished,
  type ProjectSlaView,
} from "@/lib/productionSla";

/**
 * Origem de um evento da agenda.
 * "task" = tarefa manual (fonte editável). Os demais são derivados de leads/projetos
 * e são somente-leitura (a fonte de verdade permanece no modelo original).
 */
export type AgendaEventSource =
  | "task"
  | "form_received"
  | "quote_deadline"
  | "followup"
  | "sla"
  | "production_start";

/** Categoria usada no filtro de alto nível da agenda. */
export type AgendaCategory = "comercial" | "producao" | "manual";

/**
 * Prazo (em dias corridos) para enviar o orçamento após o recebimento do formulário.
 * Centralizado aqui para virar configuração por empresa no futuro.
 */
export const QUOTE_SEND_SLA_DAYS = 2;

/**
 * Shape compartilhado entre tarefas manuais e eventos derivados.
 * Mantém compatibilidade com o AgendaEvent já usado no cliente e adiciona
 * os campos necessários para renderizar/abrir eventos derivados.
 */
export interface AgendaEventBase {
  id: string;
  titulo: string;
  descricao: string;
  responsavel: string;
  data: string;
  status: string;
  tipo: string;
  projectName: string;
  projectId: string;
}

export interface DerivedAgendaEvent extends AgendaEventBase {
  source: AgendaEventSource;
  category: AgendaCategory;
  readOnly: boolean;
  href?: string;
}

export const AGENDA_SOURCE_CATEGORY: Record<AgendaEventSource, AgendaCategory> = {
  task: "manual",
  form_received: "comercial",
  quote_deadline: "comercial",
  followup: "comercial",
  sla: "producao",
  production_start: "producao",
};

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Status comerciais em que o orçamento ainda não foi enviado/aprovado. */
const PENDING_QUOTE_STATUSES = ["LEAD", "ORCAMENTO"];
/** Status comerciais em que follow-up ainda faz sentido. */
const FOLLOW_UP_STATUSES = ["LEAD", "ORCAMENTO", "NEGOCIACAO"];

export interface BriefingDerivationInput {
  projectId: string;
  clientName: string;
  createdAt: string | Date;
  projectStatus: string;
}

/**
 * A partir de um briefing (formulário recebido) gera:
 * 1. Evento "formulário recebido" (data = createdAt do formulário).
 * 2. Evento "prazo para enviar orçamento" (data = createdAt + QUOTE_SEND_SLA_DAYS),
 *    apenas enquanto o projeto ainda estiver em LEAD/ORCAMENTO (orçamento não enviado).
 */
export function buildBriefingEvents(input: BriefingDerivationInput): DerivedAgendaEvent[] {
  const created = toDate(input.createdAt);
  const clientName = input.clientName || "Cliente";
  const href = `/projects/${input.projectId}`;
  const events: DerivedAgendaEvent[] = [];

  events.push({
    id: `form-${input.projectId}`,
    titulo: "Formulário recebido",
    descricao: `Novo briefing de ${clientName} recebido pelo site.`,
    responsavel: "Comercial",
    data: created.toISOString(),
    status: "PENDENTE",
    tipo: "form_received",
    projectName: clientName,
    projectId: input.projectId,
    source: "form_received",
    category: "comercial",
    readOnly: true,
    href,
  });

  if (PENDING_QUOTE_STATUSES.includes(input.projectStatus)) {
    const deadline = addDays(created, QUOTE_SEND_SLA_DAYS);
    events.push({
      id: `quote-deadline-${input.projectId}`,
      titulo: "Prazo para enviar orçamento",
      descricao: `Envie o orçamento de ${clientName} em até ${QUOTE_SEND_SLA_DAYS} dias após o formulário.`,
      responsavel: "Comercial",
      data: deadline.toISOString(),
      status: "PENDENTE",
      tipo: "quote_deadline",
      projectName: clientName,
      projectId: input.projectId,
      source: "quote_deadline",
      category: "comercial",
      readOnly: true,
      href,
    });
  }

  return events;
}

export interface FollowUpDerivationInput {
  projectId: string;
  clientName: string;
  status_geral: string;
  ultimo_contato_em?: string | Date | null;
  createdAt?: string | Date | null;
}

/**
 * Gera um evento de follow-up parado para leads/negociações sem contato recente.
 * A data do evento é (último contato + FOLLOW_UP_WARNING_DAYS), ou seja o momento
 * em que o follow-up passou a estar em atraso. Retorna null quando o nível é "ok".
 */
export function buildFollowUpEvent(input: FollowUpDerivationInput): DerivedAgendaEvent | null {
  if (!FOLLOW_UP_STATUSES.includes(input.status_geral)) return null;

  const level: FollowUpLevel = getFollowUpLevel({
    status_geral: input.status_geral,
    ultimo_contato_em: input.ultimo_contato_em,
    createdAt: input.createdAt,
  });
  if (level === "ok") return null;

  const lastContact = getLastContactDate({
    status_geral: input.status_geral,
    ultimo_contato_em: input.ultimo_contato_em,
    createdAt: input.createdAt,
  });
  const dueDate = addDays(lastContact, FOLLOW_UP_WARNING_DAYS);
  const clientName = input.clientName || "Cliente";

  return {
    id: `followup-${input.projectId}`,
    titulo: level === "alert" ? "Follow-up atrasado" : "Follow-up pendente",
    descricao: `Retome o contato com ${clientName} — negociação parada.`,
    responsavel: "Comercial",
    data: dueDate.toISOString(),
    status: "PENDENTE",
    tipo: "followup",
    projectName: clientName,
    projectId: input.projectId,
    source: "followup",
    category: "comercial",
    readOnly: true,
    href: "/crm",
  };
}

/**
 * Gera um evento com o prazo da próxima etapa do SLA de produção.
 * A data é o vencimento (getSlaDueDate) da etapa atual. Retorna null para SLAs finalizados.
 */
export function buildSlaEvent(sla: ProjectSlaView): DerivedAgendaEvent | null {
  if (isSlaFinished(sla)) return null;

  const stage = getStageConfig(sla.currentStage);
  const nextKey = getNextStageKey(sla.currentStage);
  const nextStage = nextKey ? getStageConfig(nextKey) : null;
  const dueDate = getSlaDueDate(sla);
  const clientName = sla.clientName || "Projeto";

  const descricao = nextStage
    ? `Etapa atual "${stage.name}" vence — próxima: "${nextStage.name}".`
    : `Etapa final "${stage.name}" — prazo de conclusão.`;

  return {
    id: `sla-${sla.projectId}`,
    titulo: `SLA: ${stage.name}`,
    descricao,
    responsavel: "Produção",
    data: dueDate.toISOString(),
    status: "PENDENTE",
    tipo: "sla",
    projectName: clientName,
    projectId: sla.projectId,
    source: "sla",
    category: "producao",
    readOnly: true,
    href: "/factory",
  };
}

export interface ProductionStartInput {
  projectId: string;
  clientName: string;
  createdAt: string | Date;
}

/**
 * Marco: projeto entrou em produção (data = ProjectSlaState.createdAt).
 */
export function buildProductionStartEvent(input: ProductionStartInput): DerivedAgendaEvent {
  const created = toDate(input.createdAt);
  const clientName = input.clientName || "Projeto";

  return {
    id: `production-start-${input.projectId}`,
    titulo: "Projeto entrou em produção",
    descricao: `${clientName} iniciou o acompanhamento de produção (radar de prazos).`,
    responsavel: "Produção",
    data: created.toISOString(),
    status: "PENDENTE",
    tipo: "production_start",
    projectName: clientName,
    projectId: input.projectId,
    source: "production_start",
    category: "producao",
    readOnly: true,
    href: "/factory",
  };
}
