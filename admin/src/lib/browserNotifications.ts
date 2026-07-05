import type { AppNotification } from "@/lib/notifications";

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

export function showBrowserNotification(
  notification: AppNotification,
  options?: { onClick?: () => void }
) {
  if (!isBrowserNotificationSupported() || Notification.permission !== "granted") {
    return null;
  }

  const n = new Notification(notification.title, {
    body: notification.message,
    icon: "/logo.png",
    badge: "/logo.png",
    tag: notification.id,
    requireInteraction: notification.priority === "high",
    silent: notification.priority !== "high",
  });

  n.onclick = (event) => {
    event.preventDefault();
    window.focus();
    if (options?.onClick) {
      options.onClick();
    } else if (notification.href) {
      window.location.href = notification.href;
    }
    n.close();
  };

  if (notification.priority !== "high") {
    setTimeout(() => n.close(), 8000);
  }

  return n;
}

export function showBrowserNotificationSummary(count: number, urgentCount: number) {
  if (!isBrowserNotificationSupported() || Notification.permission !== "granted") {
    return null;
  }

  const title =
    urgentCount > 0
      ? `${urgentCount} alerta${urgentCount !== 1 ? "s" : ""} urgente${urgentCount !== 1 ? "s" : ""}`
      : `${count} lembrete${count !== 1 ? "s" : ""} no painel`;

  const body =
    urgentCount > 0
      ? "Leads sem resposta há mais de 7 dias — retome o contato no funil comercial."
      : "Confira os follow-ups pendentes no funil comercial.";

  const n = new Notification(title, {
    body,
    icon: "/logo.png",
    tag: "mu-notification-summary",
  });

  n.onclick = () => {
    window.focus();
    window.location.href = "/crm";
    n.close();
  };

  setTimeout(() => n.close(), 10000);
  return n;
}
