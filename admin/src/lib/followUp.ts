import type { ProjectStatus } from "@/app/actions/kanban";

/** Etapas comerciais onde o operador deve manter contato ativo. */
export const FOLLOW_UP_STATUSES: ProjectStatus[] = ["LEAD", "ORCAMENTO", "NEGOCIACAO"];

export const FOLLOW_UP_WARNING_DAYS = 5;
export const FOLLOW_UP_ALERT_DAYS = 7;

export type FollowUpLevel = "ok" | "warning" | "alert";

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

export function getFollowUpLevel(project: FollowUpInput): FollowUpLevel {
  if (!needsFollowUp(project.status_geral)) return "ok";

  const days = getDaysSinceContact(project);
  if (days >= FOLLOW_UP_ALERT_DAYS) return "alert";
  if (days >= FOLLOW_UP_WARNING_DAYS) return "warning";
  return "ok";
}

export function getFollowUpMessage(project: FollowUpInput): string | null {
  const level = getFollowUpLevel(project);
  if (level === "ok") return null;

  const days = getDaysSinceContact(project);
  if (level === "alert") {
    return `Sem resposta há ${days} dias — retome o contato`;
  }
  return `Último contato há ${days} dias — considere retomar`;
}

export const FOLLOW_UP_CARD_STYLES: Record<FollowUpLevel, string> = {
  ok: "",
  warning: "border-amber-400/80 bg-amber-50/60 shadow-sm shadow-amber-100",
  alert: "border-red-400/90 bg-red-50/70 shadow-sm shadow-red-100 ring-1 ring-red-200/80",
};

export const FOLLOW_UP_BADGE_STYLES: Record<Exclude<FollowUpLevel, "ok">, string> = {
  warning: "bg-amber-500/15 text-amber-800 border-amber-500/30",
  alert: "bg-red-500/15 text-red-800 border-red-500/30",
};
