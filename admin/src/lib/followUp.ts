import type { ProjectStatus } from "@/app/actions/kanban";

/** Etapas comerciais onde o operador deve manter contato ativo. */
export const FOLLOW_UP_STATUSES: ProjectStatus[] = ["LEAD", "ORCAMENTO", "NEGOCIACAO"];

/** Defaults legados (usados quando não há preferência do operador). */
export const FOLLOW_UP_WARNING_DAYS = 5;
export const FOLLOW_UP_ALERT_DAYS = 7;
export const FOLLOW_UP_LOSS_DAYS = 10;

export type FollowUpLevel = "ok" | "warning" | "alert" | "loss";

export interface FollowUpSlaConfig {
  /** Dias sem contato → aviso amarelo */
  warningDays: number;
  /** Dias sem contato → alerta urgente */
  alertDays: number;
  /** Dias sem contato → elegível / move para Perdas */
  lossDays: number;
  /** Se true, move automaticamente para Perdas ao atingir lossDays */
  autoMoveToLoss: boolean;
}

export const DEFAULT_FOLLOW_UP_SLA: FollowUpSlaConfig = {
  warningDays: FOLLOW_UP_WARNING_DAYS,
  alertDays: FOLLOW_UP_ALERT_DAYS,
  lossDays: FOLLOW_UP_LOSS_DAYS,
  autoMoveToLoss: false,
};

export interface FollowUpInput {
  status_geral: string;
  ultimo_contato_em?: string | Date | null;
  createdAt?: string | Date | null;
}

export function getLastContactDate(project: FollowUpInput): Date {
  if (project.ultimo_contato_em) {
    return new Date(project.ultimo_contato_em);
  }
  if (project.createdAt) {
    return new Date(project.createdAt);
  }
  return new Date();
}

export function getDaysSinceContact(project: FollowUpInput): number {
  const last = getLastContactDate(project);
  const diff = Date.now() - last.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function needsFollowUp(status: string): boolean {
  return FOLLOW_UP_STATUSES.includes(status as ProjectStatus);
}

export function normalizeFollowUpSla(
  raw?: Partial<FollowUpSlaConfig> | null
): FollowUpSlaConfig {
  const warningDays = clampDays(raw?.warningDays ?? DEFAULT_FOLLOW_UP_SLA.warningDays, 1, 90);
  let alertDays = clampDays(raw?.alertDays ?? DEFAULT_FOLLOW_UP_SLA.alertDays, 1, 120);
  let lossDays = clampDays(raw?.lossDays ?? DEFAULT_FOLLOW_UP_SLA.lossDays, 1, 180);

  if (alertDays < warningDays) alertDays = warningDays;
  if (lossDays < alertDays) lossDays = alertDays;

  return {
    warningDays,
    alertDays,
    lossDays,
    autoMoveToLoss: Boolean(raw?.autoMoveToLoss),
  };
}

function clampDays(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function getFollowUpLevel(
  project: FollowUpInput,
  sla: FollowUpSlaConfig = DEFAULT_FOLLOW_UP_SLA
): FollowUpLevel {
  if (!needsFollowUp(project.status_geral)) return "ok";

  const days = getDaysSinceContact(project);
  const config = normalizeFollowUpSla(sla);

  if (days >= config.lossDays) return "loss";
  if (days >= config.alertDays) return "alert";
  if (days >= config.warningDays) return "warning";
  return "ok";
}

export function getFollowUpMessage(
  project: FollowUpInput,
  sla: FollowUpSlaConfig = DEFAULT_FOLLOW_UP_SLA
): string | null {
  const level = getFollowUpLevel(project, sla);
  if (level === "ok") return null;

  const days = getDaysSinceContact(project);
  if (level === "loss") {
    return `Sem retorno há ${days} dias — elegível para perdas`;
  }
  if (level === "alert") {
    return `Sem resposta há ${days} dias — retome o contato`;
  }
  return `Último contato há ${days} dias — considere retomar`;
}

export const FOLLOW_UP_CARD_STYLES: Record<FollowUpLevel, string> = {
  ok: "",
  warning: "border-amber-400/80 bg-amber-50/60 shadow-sm shadow-amber-100",
  alert: "border-red-400/90 bg-red-50/70 shadow-sm shadow-red-100 ring-1 ring-red-200/80",
  loss: "border-rose-500 bg-rose-50/80 shadow-sm shadow-rose-100 ring-1 ring-rose-300/70",
};

export const FOLLOW_UP_BADGE_STYLES: Record<Exclude<FollowUpLevel, "ok">, string> = {
  warning: "bg-amber-500/15 text-amber-800 border-amber-500/30",
  alert: "bg-red-500/15 text-red-800 border-red-500/30",
  loss: "bg-rose-600/15 text-rose-900 border-rose-600/35",
};
