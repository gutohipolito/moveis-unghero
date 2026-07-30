import type { Role } from "@prisma/client";
import type { AppNotification, NotificationType } from "@/lib/notifications";
import {
  canAccessModule,
  moduleKeyForHref,
  type CompanyPermissions,
} from "@/lib/permissions";

/** IDs de notificações limpas no servidor para um usuário. */
export const NOTIFICATION_CLEARED_IDS_PREF = "notificationClearedIds";

const MODULE_BY_TYPE: Partial<Record<NotificationType, string>> = {
  follow_up: "crm",
  new_briefing: "crm",
  sla_due: "factory",
  supply_ticket: "chamados",
  installment_due: "financeiro",
  invoice_pending: "financeiro",
  quote_stale: "quotes",
  lead_no_quote: "quotes",
  quote_expiring: "quotes",
};

/** Resolve a área que contém o dado da notificação (não apenas o href). */
export function notificationModuleKey(notification: AppNotification): string | null {
  const explicit = MODULE_BY_TYPE[notification.type];
  if (explicit) return explicit;

  if (notification.type === "info") {
    const href = notification.href || "";
    if (/^\/projects\/[^/]+\?[^#]*tab=finances?/.test(href)) return "financeiro";
    if (/^\/projects\/[^/]+\?[^#]*tab=quotes?/.test(href)) return "quotes";

    const moduleKey = moduleKeyForHref(href);
    // Áreas pessoais/gerais não dependem da matriz de módulos.
    if (moduleKey === "perfil" || moduleKey === "melhorias") return null;
    return moduleKey || null;
  }

  return null;
}

/** Segurança server-side para sino, toast, navegador e Web Push. */
export function filterNotificationsForAccess(
  notifications: AppNotification[],
  permissions: CompanyPermissions | null | undefined,
  role: Role,
  clearedIds: Iterable<string> = []
): AppNotification[] {
  const cleared = new Set(clearedIds);

  return notifications.filter((notification) => {
    if (cleared.has(notification.id)) return false;
    const moduleKey = notificationModuleKey(notification);
    return moduleKey === null || canAccessModule(permissions, role, moduleKey);
  });
}

export function readServerClearedNotificationIds(
  preferences: unknown
): string[] {
  if (!preferences || typeof preferences !== "object" || Array.isArray(preferences)) {
    return [];
  }

  const value = (preferences as Record<string, unknown>)[
    NOTIFICATION_CLEARED_IDS_PREF
  ];
  if (!Array.isArray(value)) return [];

  return value.filter((id): id is string => typeof id === "string").slice(-500);
}
