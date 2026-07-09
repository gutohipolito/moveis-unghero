import type { AppNotification } from "@/lib/notifications";
import { playNotificationChime } from "@/lib/notificationSound";

export type BrowserPermission = NotificationPermission | "unsupported";

export function isBrowserNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getBrowserPermission(): BrowserPermission {
  if (!isBrowserNotificationSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestBrowserPermission(): Promise<BrowserPermission> {
  if (!isBrowserNotificationSupported()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  const result = await Notification.requestPermission();
  return result;
}

function getNotificationIconUrl(): string {
  if (typeof window === "undefined") return "/pwa-icon/192";
  return `${window.location.origin}/pwa-icon/192`;
}

function buildNotificationOptions(
  notification: AppNotification,
  options?: { playSound?: boolean }
): NotificationOptions {
  const urgent = notification.priority === "high";
  return {
    body: notification.message,
    icon: getNotificationIconUrl(),
    badge: getNotificationIconUrl(),
    tag: notification.id,
    requireInteraction: urgent,
    silent: options?.playSound === false,
    data: {
      href: notification.href,
      notificationId: notification.id,
    },
  };
}

async function showViaServiceWorker(
  title: string,
  options: NotificationOptions
): Promise<boolean> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, options);
    return true;
  } catch (error) {
    console.warn("Falha ao exibir notificação via service worker:", error);
    return false;
  }
}

function showViaConstructor(
  title: string,
  options: NotificationOptions,
  onClick?: () => void
): Notification | null {
  if (!isBrowserNotificationSupported() || Notification.permission !== "granted") {
    return null;
  }

  try {
    const n = new Notification(title, options);

    n.onclick = (event) => {
      event.preventDefault();
      window.focus();
      onClick?.();
      n.close();
    };

    if (!options.requireInteraction) {
      setTimeout(() => n.close(), 8000);
    }

    return n;
  } catch (error) {
    console.warn("Falha ao exibir notificação nativa:", error);
    return null;
  }
}

export async function showBrowserNotification(
  notification: AppNotification,
  options?: { onClick?: () => void; playSound?: boolean }
): Promise<boolean> {
  if (!isBrowserNotificationSupported() || Notification.permission !== "granted") {
    return false;
  }

  const playSound = options?.playSound !== false;
  if (playSound) {
    playNotificationChime({ urgent: notification.priority === "high" });
  }

  const payload = buildNotificationOptions(notification, { playSound });

  const viaSw = await showViaServiceWorker(notification.title, payload);
  if (viaSw) return true;

  const fallback = showViaConstructor(notification.title, payload, () => {
    if (options?.onClick) {
      options.onClick();
    } else if (notification.href) {
      window.location.href = notification.href;
    }
  });

  return fallback !== null;
}

export async function showBrowserNotificationSummary(
  count: number,
  urgentCount: number,
  options?: { playSound?: boolean }
): Promise<boolean> {
  if (!isBrowserNotificationSupported() || Notification.permission !== "granted") {
    return false;
  }

  const playSound = options?.playSound !== false;
  if (playSound) {
    playNotificationChime({ urgent: urgentCount > 0 });
  }

  const title =
    urgentCount > 0
      ? `${urgentCount} alerta${urgentCount !== 1 ? "s" : ""} urgente${urgentCount !== 1 ? "s" : ""}`
      : `${count} lembrete${count !== 1 ? "s" : ""} no painel`;

  const body =
    urgentCount > 0
      ? "Leads sem resposta há mais de 7 dias — retome o contato no funil comercial."
      : "Confira os follow-ups pendentes no funil comercial.";

  const payload: NotificationOptions = {
    body,
    icon: getNotificationIconUrl(),
    tag: "mu-notification-summary",
    silent: !playSound,
    data: { href: "/crm", notificationId: "mu-notification-summary" },
  };

  const viaSw = await showViaServiceWorker(title, payload);
  if (viaSw) return true;

  return showViaConstructor(title, payload, () => {
    window.location.href = "/crm";
  }) !== null;
}
