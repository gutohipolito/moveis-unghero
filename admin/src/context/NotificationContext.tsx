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
  loadClearedNotificationIds,
  loadDeliveredNotificationIds,
  loadDismissedToastIds,
  loadNotificationPrefs,
  markNotificationDelivered,
  markToastDismissed,
  pruneClearedNotificationIds,
  pruneDeliveredIds,
  pruneDismissedToastIds,
  saveClearedNotificationIds,
  saveNotificationPrefs,
  type NotificationPreferences,
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
  const knownIdsRef = useRef<Set<string>>(new Set(initialNotifications.map((n) => n.id)));
  const toastKeysRef = useRef<Set<string>>(new Set());

  const notifications = useMemo(
    () => activeNotifications.filter((n) => !clearedIds.has(n.id)),
    [activeNotifications, clearedIds]
  );

  const deliverInAppToasts = useCallback(
    (items: AppNotification[]) => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;

      const toastable = items.filter(isInAppToastNotification);
      if (toastable.length === 0) return;

      const fresh = toastable.filter(
        (n) => !dismissedToastRef.current.has(n.id) && !toastKeysRef.current.has(n.id)
      );
      if (fresh.length === 0) return;

      if (prefs.sound) {
        playNotificationChime({ urgent: fresh.some((n) => n.priority === "high") });
      }

      setToasts((prev) => {
        const next = [...prev];
        for (const item of fresh) {
          toastKeysRef.current.add(item.id);
          next.push({ ...item, toastKey: item.id });
        }
        return next.slice(-4);
      });
    },
    [prefs.sound]
  );

  const deliverToBrowser = useCallback(
    async (
      items: AppNotification[],
      { summaryOnly = false }: { summaryOnly?: boolean } = {}
    ) => {
      if (!prefs.browser || browserPermission !== "granted") return;

      const undelivered = items.filter((n) => !deliveredRef.current.has(n.id));
      if (undelivered.length === 0) return;

      const playSound = prefs.sound;

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
    [browserPermission, prefs.browser, prefs.sound, router]
  );

  const syncNotifications = useCallback(
    async (options?: { deliverNew?: boolean }) => {
      const res = await getNotifications(companyId);
      if (!res.success) return;

      const next = res.notifications;
      const nextIds = next.map((n) => n.id);

      pruneDeliveredIds(deliveredRef.current, nextIds);
      pruneDismissedToastIds(dismissedToastRef.current, nextIds);

      setClearedIds((prev) => {
        const nextCleared = new Set(prev);
        pruneClearedNotificationIds(nextCleared, nextIds);
        return nextCleared.size === prev.size && [...nextCleared].every((id) => prev.has(id))
          ? prev
          : nextCleared;
      });

      if (options?.deliverNew) {
        const newItems = next.filter((n) => !knownIdsRef.current.has(n.id));
        if (newItems.length > 0) {
          deliverInAppToasts(newItems);
          await deliverToBrowser(newItems);
        }
      }

      knownIdsRef.current = new Set(nextIds);
      setActiveNotifications(next);
    },
    [companyId, deliverInAppToasts, deliverToBrowser]
  );

  useEffect(() => {
    setBrowserPermission(getBrowserPermission());
    deliveredRef.current = loadDeliveredNotificationIds();
    dismissedToastRef.current = loadDismissedToastIds();
    setClearedIds(loadClearedNotificationIds());
  }, []);

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
    setActiveNotifications(initialNotifications);
    knownIdsRef.current = new Set(initialNotifications.map((n) => n.id));
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
    const initialTimer = setTimeout(() => {
      void syncNotifications({ deliverNew: true });
    }, INITIAL_SYNC_MS);

    const tick = () => {
      void syncNotifications({ deliverNew: true });
    };

    let interval = window.setInterval(
      tick,
      document.visibilityState === "visible" ? POLL_VISIBLE_MS : POLL_HIDDEN_MS
    );

    const onVisible = () => {
      window.clearInterval(interval);
      if (document.visibilityState === "visible") {
        void syncNotifications({ deliverNew: true });
      }
      interval = window.setInterval(
        tick,
        document.visibilityState === "visible" ? POLL_VISIBLE_MS : POLL_HIDDEN_MS
      );
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(initialTimer);
      window.clearInterval(interval);
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
    knownIdsRef.current = new Set(pending.map((n) => n.id));

    if (pending.length > 0) {
      await deliverToBrowser(pending, { summaryOnly: pending.length > 1 });
    }

    return true;
  }, [companyId, deliverToBrowser, prefs]);

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
    setToasts((prev) => prev.filter((t) => t.toastKey !== id));
  }, []);

  const openToast = useCallback(
    (id: string, href: string) => {
      dismissToast(id);
      router.push(href);
    },
    [dismissToast, router]
  );

  const clearNotifications = useCallback((ids?: string[]) => {
    setClearedIds((prev) => {
      const targetIds =
        ids ?? activeNotifications.map((n) => n.id).filter((id) => !prev.has(id));
      if (targetIds.length === 0) return prev;

      const next = new Set(prev);
      for (const id of targetIds) next.add(id);
      saveClearedNotificationIds(next);
      return next;
    });
  }, [activeNotifications]);

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
    openToast,
    clearNotifications,
    refreshNotifications: () => syncNotifications({ deliverNew: false }),
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <InAppNotificationStack toasts={toasts} onDismiss={dismissToast} onOpen={openToast} />
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
