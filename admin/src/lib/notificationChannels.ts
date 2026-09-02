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
const ANNOUNCED_KEY = "mu_notification_announced";
const KNOWN_KEY = "mu_notification_known";
const CLEARED_KEY = "mu_notification_cleared";
const ANNOUNCED_STORAGE_CAP = 500;
const KNOWN_STORAGE_CAP = 500;

function announcedKey(companyId?: string) {
  return companyId ? `${ANNOUNCED_KEY}:${companyId}` : ANNOUNCED_KEY;
}

function knownKey(companyId?: string) {
  return companyId ? `${KNOWN_KEY}:${companyId}` : KNOWN_KEY;
}

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

/** IDs que já tocaram som / abriram toast — evita eco a cada poll ou reload. */
export function loadAnnouncedNotificationIds(companyId?: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const scoped = sessionStorage.getItem(announcedKey(companyId));
    if (scoped) return new Set(JSON.parse(scoped) as string[]);

    // Migra chave legada (global) para a empresa.
    if (companyId) {
      const legacy = sessionStorage.getItem(ANNOUNCED_KEY);
      if (legacy) {
        const ids = new Set(JSON.parse(legacy) as string[]);
        saveAnnouncedNotificationIds(ids, companyId);
        return ids;
      }
    }
    return new Set();
  } catch {
    return new Set();
  }
}

export function saveAnnouncedNotificationIds(
  ids: Set<string>,
  companyId?: string,
  pinIds: string[] = []
) {
  if (typeof window === "undefined") return;
  const merged = new Set([...pinIds, ...ids]);
  const list = [...merged].slice(-ANNOUNCED_STORAGE_CAP);
  sessionStorage.setItem(announcedKey(companyId), JSON.stringify(list));
}

export function markNotificationsAnnounced(
  ids: string[],
  announced: Set<string>,
  companyId?: string,
  pinIds: string[] = []
) {
  let changed = false;
  for (const id of ids) {
    if (!announced.has(id)) {
      announced.add(id);
      changed = true;
    }
  }
  if (changed) saveAnnouncedNotificationIds(announced, companyId, pinIds);
}

/** IDs já vistos no painel — persiste entre reloads para não reabrir o mesmo alerta. */
export function loadKnownNotificationIds(companyId?: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(knownKey(companyId));
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

export function saveKnownNotificationIds(ids: Set<string>, companyId?: string) {
  if (typeof window === "undefined") return;
  const list = [...ids].slice(-KNOWN_STORAGE_CAP);
  sessionStorage.setItem(knownKey(companyId), JSON.stringify(list));
}

export function markKnownNotificationIds(
  ids: Iterable<string>,
  known: Set<string>,
  companyId?: string
) {
  let changed = false;
  for (const id of ids) {
    if (!known.has(id)) {
      known.add(id);
      changed = true;
    }
  }
  if (changed) saveKnownNotificationIds(known, companyId);
}

/**
 * Não remove IDs anunciados quando somem de um poll — snapshot parcial ou cache
 * fazia o mesmo alerta voltar após reload. O teto em saveAnnouncedNotificationIds basta.
 */
export function pruneAnnouncedIds(
  _announced: Set<string>,
  _activeIds: string[],
  _companyId?: string
) {
  // no-op de propósito
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

/** Snooze de toasts — “Lembrar depois” (persiste entre sessões). */
const SNOOZE_KEY = "mu_toast_snooze";

export type ToastSnoozeOption = "1h" | "tomorrow" | "3d";

export function resolveSnoozeUntil(option: ToastSnoozeOption, from = new Date()): Date {
  const next = new Date(from);
  if (option === "1h") {
    next.setHours(next.getHours() + 1);
    return next;
  }
  if (option === "3d") {
    next.setDate(next.getDate() + 3);
    next.setHours(9, 0, 0, 0);
    return next;
  }
  // amanhã às 9h (fuso local do operador)
  next.setDate(next.getDate() + 1);
  next.setHours(9, 0, 0, 0);
  return next;
}

function loadSnoozeMap(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(SNOOZE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveSnoozeMap(map: Record<string, number>) {
  if (typeof window === "undefined") return;
  const entries = Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 200);
  localStorage.setItem(SNOOZE_KEY, JSON.stringify(Object.fromEntries(entries)));
}

export function isToastSnoozed(id: string, now = Date.now()): boolean {
  const until = loadSnoozeMap()[id];
  return typeof until === "number" && until > now;
}

export function snoozeToast(id: string, option: ToastSnoozeOption) {
  const map = loadSnoozeMap();
  map[id] = resolveSnoozeUntil(option).getTime();
  saveSnoozeMap(map);
}

export function pruneSnoozedToasts(activeIds: string[]) {
  if (activeIds.length === 0) return;
  const active = new Set(activeIds);
  const map = loadSnoozeMap();
  const now = Date.now();
  let changed = false;
  for (const [id, until] of Object.entries(map)) {
    if (!active.has(id) || until <= now) {
      delete map[id];
      changed = true;
    }
  }
  if (changed) saveSnoozeMap(map);
}

export const TOAST_SNOOZE_OPTIONS: { id: ToastSnoozeOption; label: string }[] = [
  { id: "1h", label: "Em 1 hora" },
  { id: "tomorrow", label: "Amanhã de manhã" },
  { id: "3d", label: "Em 3 dias" },
];

export const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  in_app: "No painel",
  browser: "Navegador",
  push: "Push mobile",
  email: "E-mail (em breve)",
};
