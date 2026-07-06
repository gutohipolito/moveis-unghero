import type { ProjectStatus } from "@/app/actions/kanban";
import {
  FOLLOW_UP_ALERT_DAYS,
  getDaysSinceContact,
  getFollowUpLevel,
  needsFollowUp,
  type FollowUpInput,
} from "@/lib/followUp";
import {
  type ProjectSlaView,
  getStageConfig,
  isSlaDueToday,
  isSlaOverdue,
  isSlaFinished,
} from "@/lib/productionSla";

export type NotificationType = "follow_up" | "sla_due" | "invoice_pending" | "info";
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

export function buildSlaNotifications(
  slaStates: (ProjectSlaView & { clientName: string })[]
): AppNotification[] {
  const items: AppNotification[] = [];

  for (const sla of slaStates) {
    if (isSlaFinished(sla)) continue;
    if (!isSlaDueToday(sla) && !isSlaOverdue(sla)) continue;

    const stage = getStageConfig(sla.currentStage);
    const overdue = isSlaOverdue(sla);

    items.push({
      id: `sla-${sla.projectId}-${sla.currentStage}`,
      type: "sla_due",
      priority: overdue ? "high" : "normal",
      title: overdue ? "SLA de produção em atraso" : "SLA no prazo limite hoje",
      message: `${sla.clientName} — etapa "${stage.name}" precisa de verificação.`,
      href: `/factory?slaCheck=${sla.projectId}`,
      createdAt: new Date().toISOString(),
      meta: {
        projectId: sla.projectId,
        clientName: sla.clientName,
      },
    });
  }

  return items;
}

export function buildInvoiceNotifications(
  projects: { id: string; client: { nome: string } }[]
): AppNotification[] {
  return projects.map((p) => ({
    id: `invoice-${p.id}`,
    type: "invoice_pending" as const,
    priority: "normal" as const,
    title: "Emitir nota fiscal",
    message: `${p.client.nome} — pagamento integral recebido. Verifique a emissão da NF.`,
    href: `/projects/${p.id}?tab=finances`,
    createdAt: new Date().toISOString(),
    meta: {
      projectId: p.id,
      clientName: p.client.nome,
    },
  }));
}

export function mergeNotifications(...groups: AppNotification[][]): AppNotification[] {
  const map = new Map<string, AppNotification>();
  for (const group of groups) {
    for (const item of group) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    if (a.priority !== b.priority) return a.priority === "high" ? -1 : 1;
    return 0;
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
