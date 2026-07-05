import type { ProjectStatus } from "@/app/actions/kanban";
import {
  FOLLOW_UP_ALERT_DAYS,
  getDaysSinceContact,
  getFollowUpLevel,
  needsFollowUp,
  type FollowUpInput,
} from "@/lib/followUp";

export type NotificationType = "follow_up" | "info";
export type NotificationPriority = "normal" | "high";

export interface AppNotification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  href: string;
  createdAt: string;
  meta?: {
    projectId?: string;
    clientName?: string;
    daysSinceContact?: number;
  };
}

export interface NotificationProject extends FollowUpInput {
  id: string;
  client: { nome: string };
}

export function buildFollowUpNotifications(projects: NotificationProject[]): AppNotification[] {
  const items: AppNotification[] = [];

  for (const project of projects) {
    if (!needsFollowUp(project.status_geral)) continue;

    const level = getFollowUpLevel(project);
    if (level === "ok") continue;

    const days = getDaysSinceContact(project);
    const isAlert = level === "alert";

    items.push({
      id: `follow-up-${project.id}`,
      type: "follow_up",
      priority: isAlert ? "high" : "normal",
      title: isAlert ? "Retomar contato urgente" : "Lembrete de follow-up",
      message: isAlert
        ? `${project.client.nome} está há ${days} dias sem resposta (limite: ${FOLLOW_UP_ALERT_DAYS}d).`
        : `${project.client.nome} — último contato há ${days} dias.`,
      href: `/crm?alerta=${project.id}`,
      createdAt: new Date().toISOString(),
      meta: {
        projectId: project.id,
        clientName: project.client.nome,
        daysSinceContact: days,
      },
    });
  }

  return items.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority === "high" ? -1 : 1;
    }
    return (b.meta?.daysSinceContact ?? 0) - (a.meta?.daysSinceContact ?? 0);
  });
}

export function countUnreadStyle(notifications: AppNotification[]): number {
  return notifications.length;
}

/** Status exibidos no funil principal (exclui perdas). */
export const FUNNEL_KANBAN_STATUSES: ProjectStatus[] = [
  "LEAD",
  "ORCAMENTO",
  "NEGOCIACAO",
  "CONFERENCIA_TECNICA",
  "APROVADO",
  "PRODUCAO",
  "INSTALACAO",
  "FINALIZADO",
];

export const LOST_STATUS: ProjectStatus = "PERDIDO";

export const COMMERCIAL_LOSS_STATUSES: ProjectStatus[] = [
  "LEAD",
  "ORCAMENTO",
  "NEGOCIACAO",
  "CONFERENCIA_TECNICA",
];
