/** Canais de entrega — extensível para push mobile, e-mail, etc. */
export type NotificationChannel = "in_app" | "browser" | "push" | "email";

export interface NotificationPreferences {
  browser: boolean;
  /** Web Push (aba fechada) — futuro */
  push: boolean;
  /** E-mail transacional — futuro */
  email: boolean;
}

const PREFS_KEY = "mu_notification_prefs";
const DELIVERED_KEY = "mu_notification_delivered";

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  browser: false,
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

export const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  in_app: "No painel",
  browser: "Navegador",
  push: "Push (em breve)",
  email: "E-mail (em breve)",
};
