import type { ProjectStatus } from "@/app/actions/kanban";
import {
  type ProjectSlaView,
  getStageConfig,
  isSlaDueToday,
  isSlaOverdue,
  isSlaFinished,
} from "@/lib/productionSla";

export type NotificationType =
  | "follow_up"
  | "card_note"
  | "sla_due"
  | "invoice_pending"
  | "new_briefing"
  | "new_partner_signup"
  | "installment_due"
  | "supply_ticket"
  | "quote_stale"
  | "lead_no_quote"
  | "quote_expiring"
  | "project_chat"
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
    authorName?: string;
  };
}

export type CardNoteNotificationInput = {
  id: string;
  clientName: string;
  obs_updated_at: Date;
  obs_updated_by_name: string | null;
};

/** Observação nova no card do funil — aviso importante para o time comercial. */
export function buildCardNoteNotifications(
  projects: CardNoteNotificationInput[]
): AppNotification[] {
  return projects
    .map((project) => {
      const author = project.obs_updated_by_name?.trim() || "Um colega";
      return {
        id: `card-note-${project.id}-${project.obs_updated_at.getTime()}`,
        type: "card_note" as const,
        priority: "high" as const,
        title: "Nova observação no funil",
        message: `${author} atualizou as observações de ${project.clientName}.`,
        href: `/crm?nota=${project.id}`,
        createdAt: project.obs_updated_at.toISOString(),
        meta: {
          projectId: project.id,
          clientName: project.clientName,
          authorName: author,
        },
      };
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export type ProjectChatNotificationInput = {
  projectId: string;
  clientName: string;
  authorName: string;
  preview: string;
  createdAt: Date;
};

export function buildProjectChatNotifications(
  items: ProjectChatNotificationInput[]
): AppNotification[] {
  return items
    .map((item) => ({
      id: `project-chat-${item.projectId}-${item.createdAt.getTime()}`,
      type: "project_chat" as const,
      priority: "high" as const,
      title: `Chat · ${item.clientName}`,
      message: `${item.authorName}: ${item.preview}`,
      href: `/projects/${item.projectId}?chat=1`,
      createdAt: item.createdAt.toISOString(),
      meta: {
        projectId: item.projectId,
        clientName: item.clientName,
        authorName: item.authorName,
      },
    }))
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
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

export function buildPartnerSignupNotifications(
  partners: {
    id: string;
    nome: string;
    tipo: string;
    createdAt: Date;
  }[]
): AppNotification[] {
  return partners.map((p) => ({
    id: `partner-signup-${p.id}`,
    type: "new_partner_signup" as const,
    priority: "high" as const,
    title: "Novo cadastro de parceiro",
    message: `${p.nome} aguarda aprovação no portal.`,
    href: `/parceiros?status=PENDING&partner=${encodeURIComponent(p.id)}`,
    createdAt: p.createdAt.toISOString(),
    meta: {
      clientName: p.nome,
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

/** Orçamento compartilhado há dias, ainda sem aprovação completa.
 * Desativado no sino (ruído de follow-up); mantido só se algum fluxo legado chamar. */
export function buildQuoteStaleNotifications(
  _quotes: {
    id: string;
    project_id: string;
    codigo?: string | null;
    pdf_shared_at: Date;
    clientName: string;
    pendingCount: number;
    viewCount?: number;
  }[],
  _minDays = 3
): AppNotification[] {
  return [];
}

/** Lead/projeto comercial sem nenhum orçamento após alguns dias.
 * Desativado no sino (ruído de follow-up); mantido só se algum fluxo legado chamar. */
export function buildLeadNoQuoteNotifications(
  _projects: {
    id: string;
    createdAt: Date;
    clientName: string;
    quoteCount: number;
  }[],
  _minDays = 3
): AppNotification[] {
  return [];
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

/** Alertas visuais no painel (toast) — só críticos (priority high). */
export function isInAppToastNotification(notification: AppNotification): boolean {
  return notification.priority === "high";
}

export type InAppToastAccent =
  | "briefing"
  | "partner"
  | "follow_up"
  | "card_note"
  | "sla"
  | "invoice"
  | "payment"
  | "supply"
  | "quote"
  | "lead"
  | "chat";

export function getInAppToastMeta(notification: AppNotification): {
  actionLabel: string;
  accent: InAppToastAccent;
} {
  switch (notification.type) {
    case "new_briefing":
      return { actionLabel: "Abrir", accent: "briefing" };
    case "new_partner_signup":
      return { actionLabel: "Aprovar", accent: "partner" };
    case "follow_up":
      return { actionLabel: "Abrir", accent: "follow_up" };
    case "card_note":
      return { actionLabel: "Ver card", accent: "card_note" };
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
    case "project_chat":
      return { actionLabel: "Abrir chat", accent: "chat" };
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
