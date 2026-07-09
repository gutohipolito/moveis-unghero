import webpush from "web-push";
import type { AppNotification } from "@/lib/notifications";

let configured = false;

function ensureWebPushConfigured() {
  if (configured) return true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:contato@moveisunghero.com.br";

  if (!publicKey || !privateKey) {
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export function isWebPushConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export function getVapidPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null;
}

export interface PushSubscriptionKeys {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export function buildPushPayload(notification: AppNotification, origin: string) {
  const urgent = notification.priority === "high";
  return JSON.stringify({
    title: notification.title,
    body: notification.message,
    icon: `${origin}/pwa-icon/192`,
    badge: `${origin}/pwa-icon/192`,
    tag: notification.id,
    requireInteraction: urgent,
    data: {
      href: notification.href,
      notificationId: notification.id,
    },
  });
}

export async function sendWebPush(
  subscription: PushSubscriptionKeys,
  payload: string
): Promise<{ ok: true } | { ok: false; statusCode?: number; gone: boolean }> {
  if (!ensureWebPushConfigured()) {
    return { ok: false, gone: false };
  }

  try {
    await webpush.sendNotification(subscription, payload);
    return { ok: true };
  } catch (error: unknown) {
    const statusCode =
      error && typeof error === "object" && "statusCode" in error
        ? Number((error as { statusCode: number }).statusCode)
        : undefined;
    const gone = statusCode === 404 || statusCode === 410;
    console.warn("Web push falhou:", statusCode, error);
    return { ok: false, statusCode, gone };
  }
}
