"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getNotifications } from "@/app/actions/notifications";
import type { AppNotification } from "@/lib/notifications";
import {
  getBrowserPermission,
  isBrowserNotificationSupported,
  requestBrowserPermission,
  showBrowserNotification,
  showBrowserNotificationSummary,
  type BrowserPermission,
} from "@/lib/browserNotifications";
import {
  loadDeliveredNotificationIds,
  loadNotificationPrefs,
  markNotificationDelivered,
  pruneDeliveredIds,
  saveNotificationPrefs,
  type NotificationPreferences,
} from "@/lib/notificationChannels";
import { primeNotificationSound } from "@/lib/notificationSound";

const POLL_INTERVAL_MS = 5 * 60 * 1000;

interface UseNotificationDeliveryOptions {
  companyId: string;
  initialNotifications: AppNotification[];
}

export function useNotificationDelivery({
  companyId,
  initialNotifications,
}: UseNotificationDeliveryOptions) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [prefs, setPrefs] = useState<NotificationPreferences>(() => loadNotificationPrefs());
  const [browserPermission, setBrowserPermission] = useState<BrowserPermission>(() =>
    typeof window !== "undefined" ? getBrowserPermission() : "default"
  );
  const [enablingBrowser, setEnablingBrowser] = useState(false);
  const deliveredRef = useRef<Set<string>>(loadDeliveredNotificationIds());
  const knownIdsRef = useRef<Set<string>>(new Set(initialNotifications.map((n) => n.id)));
  const isFirstPollRef = useRef(true);

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

      if (options?.deliverNew && prefs.browser && browserPermission === "granted") {
        const newItems = next.filter((n) => !knownIdsRef.current.has(n.id));
        if (newItems.length > 0) {
          await deliverToBrowser(newItems);
        }
      }

      knownIdsRef.current = new Set(nextIds);
      setNotifications(next);
    },
    [browserPermission, companyId, deliverToBrowser, prefs.browser]
  );

  useEffect(() => {
    setBrowserPermission(getBrowserPermission());
  }, []);

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
    setNotifications(initialNotifications);
    knownIdsRef.current = new Set(initialNotifications.map((n) => n.id));
  }, [initialNotifications]);

  useEffect(() => {
    if (isFirstPollRef.current) {
      isFirstPollRef.current = false;
      return;
    }

    const interval = setInterval(() => {
      void syncNotifications({ deliverNew: true });
    }, POLL_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void syncNotifications({ deliverNew: true });
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
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
    setNotifications(pending);
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

  const toggleNotificationSound = useCallback(() => {
    const nextPrefs = { ...prefs, sound: !prefs.sound };
    setPrefs(nextPrefs);
    saveNotificationPrefs(nextPrefs);
  }, [prefs]);

  const testBrowserNotification = useCallback(async (): Promise<boolean> => {
    const permission = getBrowserPermission();
    setBrowserPermission(permission);

    if (permission !== "granted") {
      return false;
    }

    await primeNotificationSound();

    const ok = await showBrowserNotification(
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

    return ok;
  }, [prefs.sound]);

  return {
    notifications,
    prefs,
    browserPermission,
    browserSupported: isBrowserNotificationSupported(),
    enablingBrowser,
    enableBrowserNotifications,
    disableBrowserNotifications,
    toggleNotificationSound,
    testBrowserNotification,
    refreshNotifications: () => syncNotifications({ deliverNew: false }),
  };
}
