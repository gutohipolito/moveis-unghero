/** Canais de entrega — extensível para push mobile, e-mail, etc. */
export type NotificationChannel = "in_app" | "browser" | "push" | "email";

export interface NotificationPreferences {
  browser: boolean;
  /** Som ao receber alerta no navegador */
  sound: boolean;
  /** Web Push (aba fechada) — futuro */
  push: boolean;
  /** E-mail transacional — futuro */
  email: boolean;
}

const PREFS_KEY = "mu_notification_prefs";
const DELIVERED_KEY = "mu_notification_delivered";
const TOAST_DISMISSED_KEY = "mu_toast_dismissed";
const CLEARED_KEY = "mu_notification_cleared";

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  browser: false,
  sound: true,
  push: false,
  email: false,
};

export function loadNotificationPrefs(): NotificationPreferences {
  if (typeof window === "undefined") return DEFAULT_NOTIFICATION_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_PREFS;
    return { ...DEFAULT_NOTIFICATION_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_NOTIFICATION_PREFS;
  }
}

export function saveNotificationPrefs(prefs: NotificationPreferences) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export function loadDeliveredNotificationIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(DELIVERED_KEY);
    if (!raw) return new Set();
    const ids = JSON.parse(raw) as string[];
    return new Set(ids);
  } catch {
    return new Set();
  }
}

export function saveDeliveredNotificationIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  const list = [...ids].slice(-200);
  sessionStorage.setItem(DELIVERED_KEY, JSON.stringify(list));
}

export function markNotificationDelivered(id: string, delivered: Set<string>) {
  delivered.add(id);
  saveDeliveredNotificationIds(delivered);
}

export function pruneDeliveredIds(delivered: Set<string>, activeIds: string[]) {
  if (activeIds.length === 0) return;
  const active = new Set(activeIds);
  let changed = false;
  for (const id of delivered) {
    if (!active.has(id)) {
      delivered.delete(id);
      changed = true;
    }
  }
  if (changed) saveDeliveredNotificationIds(delivered);
}

export function loadDismissedToastIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(TOAST_DISMISSED_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

export function saveDismissedToastIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  const list = [...ids].slice(-100);
  sessionStorage.setItem(TOAST_DISMISSED_KEY, JSON.stringify(list));
}

export function markToastDismissed(id: string, dismissed: Set<string>) {
  dismissed.add(id);
  saveDismissedToastIds(dismissed);
}

export function pruneDismissedToastIds(dismissed: Set<string>, activeIds: string[]) {
  if (activeIds.length === 0) return;
  const active = new Set(activeIds);
  let changed = false;
  for (const id of dismissed) {
    if (!active.has(id)) {
      dismissed.delete(id);
      changed = true;
    }
  }
  if (changed) saveDismissedToastIds(dismissed);
}

function clearedKey(companyId?: string) {
  return companyId ? `${CLEARED_KEY}:${companyId}` : CLEARED_KEY;
}

/** IDs limpos no centro de notificações (badge/lista) — persiste entre sessões. */
export function loadClearedNotificationIds(companyId?: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const scoped = localStorage.getItem(clearedKey(companyId));
    if (scoped) return new Set(JSON.parse(scoped) as string[]);

    // Migra chave legada (sem companyId) para a chave da empresa.
    if (companyId) {
      const legacy = localStorage.getItem(CLEARED_KEY);
      if (legacy) {
        const ids = new Set(JSON.parse(legacy) as string[]);
        saveClearedNotificationIds(ids, companyId);
        return ids;
      }
    }
    return new Set();
  } catch {
    return new Set();
  }
}

export function saveClearedNotificationIds(ids: Set<string>, companyId?: string) {
  if (typeof window === "undefined") return;
  const list = [...ids].slice(-500);
  localStorage.setItem(clearedKey(companyId), JSON.stringify(list));
}

export function markNotificationsCleared(
  ids: string[],
  cleared: Set<string>,
  companyId?: string
) {
  let changed = false;
  for (const id of ids) {
    if (!cleared.has(id)) {
      cleared.add(id);
      changed = true;
    }
  }
  if (changed) saveClearedNotificationIds(cleared, companyId);
}

/**
 * Não remove IDs limpos com base na lista ativa.
 * Sync parcial/vazio apagava o histórico e o badge voltava sozinho.
 * O teto de 500 em saveClearedNotificationIds já limita o storage.
 */
export function pruneClearedNotificationIds(
  _cleared: Set<string>,
  _activeIds: string[],
  _companyId?: string
) {
  // no-op de propósito
}

export const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  in_app: "No painel",
  browser: "Navegador",
  push: "Push mobile",
  email: "E-mail (em breve)",
};
