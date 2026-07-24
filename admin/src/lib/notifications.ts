import type { ProjectStatus } from "@/app/actions/kanban";
import {
  FOLLOW_UP_ALERT_DAYS,
  FOLLOW_UP_LOSS_DAYS,
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

export type NotificationType =
  | "follow_up"
  | "sla_due"
  | "invoice_pending"
  | "new_briefing"
  | "installment_due"
  | "supply_ticket"
  | "quote_stale"
  | "lead_no_quote"
  | "quote_expiring"
  | "info";
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
    quoteId?: string;
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
    const isUrgent = level === "alert" || level === "loss";

    items.push({
      id: `follow-up-${project.id}`,
      type: "follow_up",
      priority: isUrgent ? "high" : "normal",
      title:
        level === "loss"
          ? "Lead elegível para perdas"
          : isUrgent
            ? "Retomar contato urgente"
            : "Lembrete de follow-up",
      message:
        level === "loss"
          ? `${project.client.nome} está há ${days} dias sem retorno (SLA de perdas: ${FOLLOW_UP_LOSS_DAYS}d).`
          : isUrgent
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

export function buildBriefingNotifications(
  briefings: {
    id: string;
    project_id: string;
    createdAt: Date;
    project: { client: { nome: string } };
  }[]
): AppNotification[] {
  return briefings.map((b) => ({
    id: `briefing-${b.id}`,
    type: "new_briefing" as const,
    priority: "high" as const,
    title: "Nova solicitação via formulário",
    message: `${b.project.client.nome} enviou um briefing de orçamento.`,
    href: `/crm?briefing=${b.project_id}`,
    createdAt: b.createdAt.toISOString(),
    meta: {
      projectId: b.project_id,
      clientName: b.project.client.nome,
    },
  }));
}

export function buildSupplyTicketNotifications(
  tickets: {
    id: string;
    titulo: string;
    prioridade: "BAIXA" | "MEDIA" | "ALTA";
    requesterName: string;
    createdAt: Date;
  }[]
): AppNotification[] {
  return tickets.map((t) => ({
    id: `supply-${t.id}`,
    type: "supply_ticket" as const,
    priority: t.prioridade === "ALTA" ? ("high" as const) : ("normal" as const),
    title: t.prioridade === "ALTA" ? "Chamado de insumo urgente" : "Chamado de insumo",
    message: `${t.requesterName} solicitou: ${t.titulo}`,
    href: `/chamados?ticket=${t.id}`,
    createdAt: t.createdAt.toISOString(),
  }));
}

/** Orçamento compartilhado há dias, ainda sem aprovação completa. */
export function buildQuoteStaleNotifications(
  quotes: {
    id: string;
    project_id: string;
    codigo?: string | null;
    pdf_shared_at: Date;
    clientName: string;
    pendingCount: number;
    viewCount?: number;
  }[],
  minDays = 3
): AppNotification[] {
  const MS_DAY = 24 * 60 * 60 * 1000;
  return quotes
    .map((q) => {
      const days = Math.floor((Date.now() - q.pdf_shared_at.getTime()) / MS_DAY);
      if (days < minDays || q.pendingCount <= 0) return null;
      const code = q.codigo?.trim() || "proposta";
      const neverOpened = (q.viewCount ?? 0) <= 0;
      return {
        id: `quote-stale-${q.id}`,
        type: "quote_stale" as const,
        priority: days >= 7 || neverOpened ? ("high" as const) : ("normal" as const),
        title: neverOpened
          ? "Proposta enviada e não aberta"
          : days >= 7
            ? "Proposta parada há uma semana"
            : "Retomar proposta enviada",
        message: neverOpened
          ? `${q.clientName} — ${code} enviada há ${days} dias e o cliente ainda não abriu o link.`
          : `${q.clientName} — ${code} enviada há ${days} dias, ainda sem fechamento.`,
        href: `/projects/${q.project_id}?tab=quotes`,
        createdAt: q.pdf_shared_at.toISOString(),
        meta: {
          projectId: q.project_id,
          clientName: q.clientName,
          quoteId: q.id,
          daysSinceContact: days,
        },
      };
    })
    .filter((n): n is NonNullable<typeof n> => Boolean(n));
}

/** Lead/projeto comercial sem nenhum orçamento após alguns dias. */
export function buildLeadNoQuoteNotifications(
  projects: {
    id: string;
    createdAt: Date;
    clientName: string;
    quoteCount: number;
  }[],
  minDays = 3
): AppNotification[] {
  const MS_DAY = 24 * 60 * 60 * 1000;
  return projects
    .map((p) => {
      if (p.quoteCount > 0) return null;
      const days = Math.floor((Date.now() - p.createdAt.getTime()) / MS_DAY);
      if (days < minDays) return null;
      return {
        id: `lead-no-quote-${p.id}`,
        type: "lead_no_quote" as const,
        priority: days >= 7 ? ("high" as const) : ("normal" as const),
        title: "Cliente sem orçamento",
        message: `${p.clientName} está cadastrado há ${days} dias e ainda não tem proposta.`,
        href: `/projects/${p.id}?tab=quotes`,
        createdAt: p.createdAt.toISOString(),
        meta: {
          projectId: p.id,
          clientName: p.clientName,
          daysSinceContact: days,
        },
      };
    })
    .filter((n): n is NonNullable<typeof n> => Boolean(n));
}

/** Validade da proposta acabando com itens ainda pendentes. */
export function buildQuoteExpiringNotifications(
  quotes: {
    id: string;
    project_id: string;
    codigo?: string | null;
    validade: Date;
    clientName: string;
    pendingCount: number;
  }[],
  withinDays = 2
): AppNotification[] {
  const MS_DAY = 24 * 60 * 60 * 1000;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return quotes
    .map((q) => {
      if (q.pendingCount <= 0) return null;
      const end = new Date(q.validade);
      end.setHours(0, 0, 0, 0);
      const daysLeft = Math.round((end.getTime() - today.getTime()) / MS_DAY);
      if (daysLeft < 0 || daysLeft > withinDays) return null;
      const code = q.codigo?.trim() || "proposta";
      return {
        id: `quote-expiring-${q.id}`,
        type: "quote_expiring" as const,
        priority: daysLeft <= 0 ? ("high" as const) : ("normal" as const),
        title: daysLeft <= 0 ? "Proposta vence hoje" : "Proposta perto do vencimento",
        message:
          daysLeft <= 0
            ? `${q.clientName} — ${code} vence hoje.`
            : `${q.clientName} — ${code} vence em ${daysLeft} dia${daysLeft === 1 ? "" : "s"}.`,
        href: `/projects/${q.project_id}?tab=quotes`,
        createdAt: new Date().toISOString(),
        meta: {
          projectId: q.project_id,
          clientName: q.clientName,
          quoteId: q.id,
        },
      };
    })
    .filter((n): n is NonNullable<typeof n> => Boolean(n));
}

/** Alertas visuais no painel (toast estilo macOS). */
export function isInAppToastNotification(notification: AppNotification): boolean {
  switch (notification.type) {
    case "new_briefing":
    case "sla_due":
    case "invoice_pending":
    case "installment_due":
    case "supply_ticket":
    case "quote_stale":
    case "lead_no_quote":
    case "quote_expiring":
    case "follow_up":
      return true;
    default:
      return false;
  }
}

/** Lembretes persistentes — reaparecem ao abrir o painel até fechar ou snooze. */
export function isStickyReminderNotification(notification: AppNotification): boolean {
  switch (notification.type) {
    case "quote_stale":
    case "lead_no_quote":
    case "quote_expiring":
    case "follow_up":
      return true;
    default:
      return false;
  }
}

export type InAppToastAccent =
  | "briefing"
  | "follow_up"
  | "sla"
  | "invoice"
  | "payment"
  | "supply"
  | "quote"
  | "lead";

export function getInAppToastMeta(notification: AppNotification): {
  actionLabel: string;
  accent: InAppToastAccent;
} {
  switch (notification.type) {
    case "new_briefing":
      return { actionLabel: "Abrir", accent: "briefing" };
    case "follow_up":
      return { actionLabel: "Abrir", accent: "follow_up" };
    case "sla_due":
      return { actionLabel: "Abrir", accent: "sla" };
    case "invoice_pending":
      return { actionLabel: "Abrir", accent: "invoice" };
    case "installment_due":
      return { actionLabel: "Abrir", accent: "payment" };
    case "supply_ticket":
      return { actionLabel: "Abrir", accent: "supply" };
    case "quote_stale":
      return { actionLabel: "Abrir", accent: "quote" };
    case "lead_no_quote":
      return { actionLabel: "Abrir", accent: "lead" };
    case "quote_expiring":
      return { actionLabel: "Abrir", accent: "quote" };
    default:
      return { actionLabel: "Abrir", accent: "briefing" };
  }
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
