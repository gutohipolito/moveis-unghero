"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { getNotifications } from "@/app/actions/notifications";
import {
  isInAppToastNotification,
  isStickyReminderNotification,
  type AppNotification,
} from "@/lib/notifications";
import {
  getBrowserPermission,
  isBrowserNotificationSupported,
  requestBrowserPermission,
  showBrowserNotification,
  showBrowserNotificationSummary,
  type BrowserPermission,
} from "@/lib/browserNotifications";
import {
  isToastSnoozed,
  loadAnnouncedNotificationIds,
  loadClearedNotificationIds,
  loadDeliveredNotificationIds,
  loadDismissedToastIds,
  loadNotificationPrefs,
  markNotificationDelivered,
  markNotificationsAnnounced,
  markToastDismissed,
  pruneAnnouncedIds,
  pruneDeliveredIds,
  pruneDismissedToastIds,
  pruneSnoozedToasts,
  saveClearedNotificationIds,
  saveNotificationPrefs,
  snoozeToast,
  type NotificationPreferences,
  type ToastSnoozeOption,
} from "@/lib/notificationChannels";
import { playNotificationChime, primeNotificationSound } from "@/lib/notificationSound";
import {
  getPushSubscription,
  isPushNotificationSupported,
  registerPushSubscriptionOnServer,
  subscribeToWebPush,
  testPushOnServer,
  unsubscribeFromWebPush,
  getVapidPublicKeyFromEnv,
} from "@/lib/pushClient";
import InAppNotificationStack from "@/components/InAppNotificationStack";

const POLL_VISIBLE_MS = 30 * 1000;
const POLL_HIDDEN_MS = 5 * 60 * 1000;
const INITIAL_SYNC_MS = 3 * 1000;
/** Evita dois chimes seguidos por race de poll/navegação. */
const CHIME_COOLDOWN_MS = 8 * 1000;
const MAX_VISIBLE_TOASTS = 3;

export interface InAppToast extends AppNotification {
  toastKey: string;
}

interface NotificationContextValue {
  notifications: AppNotification[];
  toasts: InAppToast[];
  prefs: NotificationPreferences;
  browserPermission: BrowserPermission;
  browserSupported: boolean;
  enablingBrowser: boolean;
  pushSupported: boolean;
  pushConfigured: boolean;
  pushActive: boolean;
  enablingPush: boolean;
  enableBrowserNotifications: () => Promise<boolean>;
  disableBrowserNotifications: () => void;
  enablePushNotifications: () => Promise<boolean>;
  disablePushNotifications: () => Promise<void>;
  toggleNotificationSound: () => void;
  testBrowserNotification: () => Promise<boolean>;
  testPushNotification: () => Promise<boolean>;
  dismissToast: (id: string) => void;
  snoozeToastReminder: (id: string, option: ToastSnoozeOption) => void;
  openToast: (id: string, href: string) => void;
  /** Marca notificações como limpas (some do badge/lista). */
  clearNotifications: (ids?: string[]) => void;
  refreshNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

interface NotificationProviderProps {
  companyId: string;
  initialNotifications: AppNotification[];
  children: ReactNode;
}

export function NotificationProvider({
  companyId,
  initialNotifications,
  children,
}: NotificationProviderProps) {
  const router = useRouter();
  const [activeNotifications, setActiveNotifications] = useState(initialNotifications);
  const [clearedIds, setClearedIds] = useState<Set<string>>(() => new Set());
  const [clearedReady, setClearedReady] = useState(false);
  const [toasts, setToasts] = useState<InAppToast[]>([]);
  const [prefs, setPrefs] = useState<NotificationPreferences>(() => loadNotificationPrefs());
  const [browserPermission, setBrowserPermission] = useState<BrowserPermission>(() =>
    typeof window !== "undefined" ? getBrowserPermission() : "default"
  );
  const [enablingBrowser, setEnablingBrowser] = useState(false);
  const [pushActive, setPushActive] = useState(false);
  const [enablingPush, setEnablingPush] = useState(false);

  const pushSupported = isPushNotificationSupported();
  const pushConfigured = Boolean(getVapidPublicKeyFromEnv());

  const deliveredRef = useRef<Set<string>>(new Set());
  const dismissedToastRef = useRef<Set<string>>(new Set());
  const announcedRef = useRef<Set<string>>(new Set());
  const knownIdsRef = useRef<Set<string>>(new Set(initialNotifications.map((n) => n.id)));
  const toastKeysRef = useRef<Set<string>>(new Set());
  const clearedIdsRef = useRef<Set<string>>(clearedIds);
  const syncingRef = useRef(false);
  const lastChimeAtRef = useRef(0);
  const seededKnownRef = useRef(false);
  clearedIdsRef.current = clearedIds;

  const notifications = useMemo(() => {
    // Evita flash do badge antigo antes de ler o localStorage.
    if (!clearedReady) return [];
    return activeNotifications.filter((n) => !clearedIds.has(n.id));
  }, [activeNotifications, clearedIds, clearedReady]);

  const playChimeOnce = useCallback((urgent: boolean) => {
    if (!prefs.sound) return;
    const now = Date.now();
    if (now - lastChimeAtRef.current < CHIME_COOLDOWN_MS) return;
    lastChimeAtRef.current = now;
    playNotificationChime({ urgent });
  }, [prefs.sound]);

  const canShowToast = useCallback((n: AppNotification) => {
    return (
      isInAppToastNotification(n) &&
      !dismissedToastRef.current.has(n.id) &&
      !isToastSnoozed(n.id) &&
      !clearedIdsRef.current.has(n.id)
    );
  }, []);

  const surfaceStickyReminders = useCallback(
    (items: AppNotification[], { chime = false }: { chime?: boolean } = {}) => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;

      const sticky = items
        .filter((n) => isStickyReminderNotification(n) && canShowToast(n))
        .filter((n) => !toastKeysRef.current.has(n.id))
        .slice(0, MAX_VISIBLE_TOASTS);

      if (sticky.length === 0) return;

      for (const item of sticky) {
        toastKeysRef.current.add(item.id);
      }

      if (chime) {
        markNotificationsAnnounced(
          sticky.map((n) => n.id),
          announcedRef.current
        );
        playChimeOnce(sticky.some((n) => n.priority === "high"));
      }

      setToasts((prev) => {
        const next = [...prev];
        for (const item of sticky) {
          if (!next.some((t) => t.toastKey === item.id)) {
            next.push({ ...item, toastKey: item.id });
          }
        }
        return next.slice(0, MAX_VISIBLE_TOASTS);
      });
    },
    [canShowToast, playChimeOnce]
  );

  const deliverInAppToasts = useCallback(
    (items: AppNotification[]) => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;

      const fresh = items.filter(
        (n) =>
          canShowToast(n) &&
          !toastKeysRef.current.has(n.id) &&
          !announcedRef.current.has(n.id)
      );
      if (fresh.length === 0) return;

      // Marca antes do setState para evitar race entre polls concorrentes.
      for (const item of fresh) {
        toastKeysRef.current.add(item.id);
      }
      markNotificationsAnnounced(
        fresh.map((n) => n.id),
        announcedRef.current
      );

      playChimeOnce(fresh.some((n) => n.priority === "high"));

      setToasts((prev) => {
        const next = [...prev];
        for (const item of fresh) {
          next.push({ ...item, toastKey: item.id });
        }
        return next.slice(-MAX_VISIBLE_TOASTS);
      });
    },
    [canShowToast, playChimeOnce]
  );

  const deliverToBrowser = useCallback(
    async (
      items: AppNotification[],
      { summaryOnly = false }: { summaryOnly?: boolean } = {}
    ) => {
      if (!prefs.browser || browserPermission !== "granted") return;

      const undelivered = items.filter((n) => !deliveredRef.current.has(n.id));
      if (undelivered.length === 0) return;

      // Som customizado já toca no toast in-app; no browser usamos silent
      // para não somar o bip do SO a cada poll.
      const playSound = false;

      if (summaryOnly && undelivered.length > 1) {
        const urgent = undelivered.filter((n) => n.priority === "high").length;
        await showBrowserNotificationSummary(undelivered.length, urgent, { playSound });
        undelivered.forEach((n) => markNotificationDelivered(n.id, deliveredRef.current));
        return;
      }

      for (const item of undelivered) {
        await showBrowserNotification(item, {
          onClick: () => router.push(item.href),
          playSound,
        });
        markNotificationDelivered(item.id, deliveredRef.current);
      }
    },
    [browserPermission, prefs.browser, router]
  );

  const syncNotifications = useCallback(
    async (options?: { deliverNew?: boolean }) => {
      if (syncingRef.current) return;
      syncingRef.current = true;

      try {
        const res = await getNotifications(companyId);
        if (!res.success) return;

        const next = res.notifications;
        const nextIds = next.map((n) => n.id);

        pruneDeliveredIds(deliveredRef.current, nextIds);
        pruneDismissedToastIds(dismissedToastRef.current, nextIds);
        pruneAnnouncedIds(announcedRef.current, nextIds);
        pruneSnoozedToasts(nextIds);

        if (options?.deliverNew) {
          const newItems = next.filter(
            (n) =>
              !knownIdsRef.current.has(n.id) &&
              !clearedIdsRef.current.has(n.id) &&
              !announcedRef.current.has(n.id)
          );
          if (newItems.length > 0) {
            deliverInAppToasts(newItems);
            await deliverToBrowser(newItems);
            markNotificationsAnnounced(
              newItems.map((n) => n.id),
              announcedRef.current
            );
          }
          surfaceStickyReminders(next);
        }

        // Une IDs conhecidos — nunca encolhe por snapshot stale do layout.
        for (const id of nextIds) knownIdsRef.current.add(id);
        setActiveNotifications(next);
        setToasts((prev) =>
          prev.filter(
            (t) => nextIds.includes(t.toastKey) && !isToastSnoozed(t.toastKey)
          )
        );
      } finally {
        syncingRef.current = false;
      }
    },
    [companyId, deliverInAppToasts, deliverToBrowser, surfaceStickyReminders]
  );

  useEffect(() => {
    setBrowserPermission(getBrowserPermission());
    deliveredRef.current = loadDeliveredNotificationIds();
    dismissedToastRef.current = loadDismissedToastIds();
    announcedRef.current = loadAnnouncedNotificationIds();
    const loaded = loadClearedNotificationIds(companyId);
    setClearedIds(loaded);
    clearedIdsRef.current = loaded;
    setClearedReady(true);

    // Seed inicial: marca o que já existia no SSR como conhecido/anunciado
    // para não tocar som de alertas antigos ao abrir o painel.
    // Lembretes sticky continuam elegíveis (não entram em toastKeys).
    seededKnownRef.current = false;
    knownIdsRef.current = new Set();
    toastKeysRef.current = new Set();

    for (const n of initialNotifications) {
      knownIdsRef.current.add(n.id);
      announcedRef.current.add(n.id);
      if (!isStickyReminderNotification(n)) {
        toastKeysRef.current.add(n.id);
      }
    }
    markNotificationsAnnounced(
      initialNotifications.map((n) => n.id),
      announcedRef.current
    );
    seededKnownRef.current = true;

    window.setTimeout(() => {
      surfaceStickyReminders(initialNotifications);
    }, 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed no mount / troca de empresa
  }, [companyId]);

  useEffect(() => {
    if (!pushSupported || !prefs.push) {
      setPushActive(false);
      return;
    }

    void getPushSubscription().then((sub) => {
      setPushActive(Boolean(sub));
    });
  }, [pushSupported, prefs.push]);

  useEffect(() => {
    // Atualiza lista visual do SSR sem reabrir alertas já conhecidos.
    setActiveNotifications(initialNotifications);
    for (const n of initialNotifications) {
      knownIdsRef.current.add(n.id);
    }
  }, [initialNotifications]);

  useEffect(() => {
    function onSwNavigate(event: MessageEvent) {
      if (event.data?.type === "notification-navigate" && typeof event.data.href === "string") {
        router.push(event.data.href);
      }
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", onSwNavigate);
      return () => navigator.serviceWorker.removeEventListener("message", onSwNavigate);
    }
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    let intervalId = 0;

    const runSync = () => {
      if (!cancelled) void syncNotifications({ deliverNew: true });
    };

    const initialTimer = window.setTimeout(runSync, INITIAL_SYNC_MS);

    const armInterval = () => {
      window.clearInterval(intervalId);
      intervalId = window.setInterval(
        runSync,
        document.visibilityState === "visible" ? POLL_VISIBLE_MS : POLL_HIDDEN_MS
      );
    };

    armInterval();

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        runSync();
      }
      armInterval();
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearTimeout(initialTimer);
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [syncNotifications]);

  const enableBrowserNotifications = useCallback(async () => {
    if (!isBrowserNotificationSupported()) return false;

    setEnablingBrowser(true);
    await primeNotificationSound();
    const permission = await requestBrowserPermission();
    setBrowserPermission(permission);
    setEnablingBrowser(false);

    if (permission !== "granted") {
      const nextPrefs = { ...prefs, browser: false };
      setPrefs(nextPrefs);
      saveNotificationPrefs(nextPrefs);
      return false;
    }

    const nextPrefs = { ...prefs, browser: true };
    setPrefs(nextPrefs);
    saveNotificationPrefs(nextPrefs);

    const res = await getNotifications(companyId);
    const pending = res.notifications;
    setActiveNotifications(pending);
    for (const n of pending) {
      knownIdsRef.current.add(n.id);
    }

    if (pending.length > 0) {
      playChimeOnce(pending.some((n) => n.priority === "high"));
      await deliverToBrowser(pending, { summaryOnly: pending.length > 1 });
      markNotificationsAnnounced(
        pending.map((n) => n.id),
        announcedRef.current
      );
    }

    return true;
  }, [companyId, deliverToBrowser, playChimeOnce, prefs]);

  const disableBrowserNotifications = useCallback(() => {
    const nextPrefs = { ...prefs, browser: false };
    setPrefs(nextPrefs);
    saveNotificationPrefs(nextPrefs);
  }, [prefs]);

  const enablePushNotifications = useCallback(async () => {
    if (!pushSupported || !pushConfigured) return false;

    setEnablingPush(true);
    await primeNotificationSound();

    const subResult = await subscribeToWebPush();
    if (!subResult.success || !subResult.subscription) {
      setEnablingPush(false);
      const nextPrefs = { ...prefs, push: false };
      setPrefs(nextPrefs);
      saveNotificationPrefs(nextPrefs);
      setPushActive(false);
      return false;
    }

    const registered = await registerPushSubscriptionOnServer(subResult.subscription);
    setEnablingPush(false);

    if (!registered) {
      const nextPrefs = { ...prefs, push: false };
      setPrefs(nextPrefs);
      saveNotificationPrefs(nextPrefs);
      setPushActive(false);
      return false;
    }

    const nextPrefs = { ...prefs, push: true, browser: true };
    setPrefs(nextPrefs);
    saveNotificationPrefs(nextPrefs);
    setBrowserPermission(getBrowserPermission());
    setPushActive(true);
    return true;
  }, [prefs, pushConfigured, pushSupported]);

  const disablePushNotifications = useCallback(async () => {
    await unsubscribeFromWebPush();
    const nextPrefs = { ...prefs, push: false };
    setPrefs(nextPrefs);
    saveNotificationPrefs(nextPrefs);
    setPushActive(false);
  }, [prefs]);

  const testPushNotification = useCallback(async (): Promise<boolean> => {
    if (!pushActive) return false;
    await primeNotificationSound();
    return testPushOnServer();
  }, [pushActive]);

  const toggleNotificationSound = useCallback(() => {
    const nextPrefs = { ...prefs, sound: !prefs.sound };
    setPrefs(nextPrefs);
    saveNotificationPrefs(nextPrefs);
  }, [prefs]);

  const testBrowserNotification = useCallback(async (): Promise<boolean> => {
    const permission = getBrowserPermission();
    setBrowserPermission(permission);

    if (permission !== "granted") return false;

    await primeNotificationSound();

    return showBrowserNotification(
      {
        id: `test-notification-${Date.now()}`,
        type: "info",
        priority: "normal",
        title: "Alertas ativos",
        message: "Você receberá avisos do Móveis Unghero neste navegador.",
        href: "/crm",
        createdAt: new Date().toISOString(),
      },
      { playSound: prefs.sound }
    );
  }, [prefs.sound]);

  const dismissToast = useCallback((id: string) => {
    markToastDismissed(id, dismissedToastRef.current);
    toastKeysRef.current.add(id);
    setToasts((prev) => prev.filter((t) => t.toastKey !== id));
  }, []);

  const snoozeToastReminder = useCallback((id: string, option: ToastSnoozeOption) => {
    snoozeToast(id, option);
    toastKeysRef.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.toastKey !== id));
  }, []);

  const openToast = useCallback(
    (id: string, href: string) => {
      dismissToast(id);
      router.push(href);
    },
    [dismissToast, router]
  );

  const clearNotifications = useCallback(
    (ids?: string[]) => {
      setClearedIds((prev) => {
        const targetIds =
          ids && ids.length > 0
            ? ids
            : activeNotifications.map((n) => n.id).filter((id) => !prev.has(id));
        if (targetIds.length === 0) return prev;

        const next = new Set(prev);
        for (const id of targetIds) next.add(id);
        saveClearedNotificationIds(next, companyId);
        clearedIdsRef.current = next;
        return next;
      });
    },
    [activeNotifications, companyId]
  );

  const value: NotificationContextValue = {
    notifications,
    toasts,
    prefs,
    browserPermission,
    browserSupported: isBrowserNotificationSupported(),
    enablingBrowser,
    pushSupported,
    pushConfigured,
    pushActive,
    enablingPush,
    enableBrowserNotifications,
    disableBrowserNotifications,
    enablePushNotifications,
    disablePushNotifications,
    toggleNotificationSound,
    testBrowserNotification,
    testPushNotification,
    dismissToast,
    snoozeToastReminder,
    openToast,
    clearNotifications,
    refreshNotifications: () => syncNotifications({ deliverNew: false }),
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <InAppNotificationStack
        toasts={toasts}
        onDismiss={dismissToast}
        onOpen={openToast}
        onSnooze={snoozeToastReminder}
      />
    </NotificationContext.Provider>
  );
}

export function useNotificationContext(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotificationContext must be used within NotificationProvider");
  }
  return ctx;
}
