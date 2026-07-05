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
  const [browserPermission, setBrowserPermission] = useState<BrowserPermission>("default");
  const [enablingBrowser, setEnablingBrowser] = useState(false);
  const deliveredRef = useRef<Set<string>>(loadDeliveredNotificationIds());
  const knownIdsRef = useRef<Set<string>>(new Set(initialNotifications.map((n) => n.id)));
  const isFirstPollRef = useRef(true);

  const deliverToBrowser = useCallback(
    (items: AppNotification[], { summaryOnly = false }: { summaryOnly?: boolean } = {}) => {
      if (!prefs.browser || browserPermission !== "granted") return;

      const undelivered = items.filter((n) => !deliveredRef.current.has(n.id));
      if (undelivered.length === 0) return;

      if (summaryOnly && undelivered.length > 1) {
        const urgent = undelivered.filter((n) => n.priority === "high").length;
        showBrowserNotificationSummary(undelivered.length, urgent);
        undelivered.forEach((n) => markNotificationDelivered(n.id, deliveredRef.current));
        return;
      }

      for (const item of undelivered) {
        showBrowserNotification(item, {
          onClick: () => router.push(item.href),
        });
        markNotificationDelivered(item.id, deliveredRef.current);
      }
    },
    [browserPermission, prefs.browser, router]
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
          deliverToBrowser(newItems);
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
    setNotifications(initialNotifications);
    knownIdsRef.current = new Set(initialNotifications.map((n) => n.id));
  }, [initialNotifications]);

  useEffect(() => {
    if (isFirstPollRef.current) {
      isFirstPollRef.current = false;
      return;
    }

    const interval = setInterval(() => {
      syncNotifications({ deliverNew: true });
    }, POLL_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        syncNotifications({ deliverNew: true });
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
      deliverToBrowser(pending, { summaryOnly: pending.length > 1 });
    }

    return true;
  }, [companyId, deliverToBrowser, prefs]);

  const disableBrowserNotifications = useCallback(() => {
    const nextPrefs = { ...prefs, browser: false };
    setPrefs(nextPrefs);
    saveNotificationPrefs(nextPrefs);
  }, [prefs]);

  const testBrowserNotification = useCallback(() => {
    if (browserPermission !== "granted") return;
    showBrowserNotification({
      id: "test-notification",
      type: "info",
      priority: "normal",
      title: "Alertas ativos",
      message: "Você receberá avisos do Móveis Unghero neste navegador.",
      href: "/crm",
      createdAt: new Date().toISOString(),
    });
  }, [browserPermission]);

  return {
    notifications,
    prefs,
    browserPermission,
    browserSupported: isBrowserNotificationSupported(),
    enablingBrowser,
    enableBrowserNotifications,
    disableBrowserNotifications,
    testBrowserNotification,
    refreshNotifications: () => syncNotifications({ deliverNew: false }),
  };
}
