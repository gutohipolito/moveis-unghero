"use client";

import type { PushSubscriptionJSON } from "@/lib/pushTypes";

export function isPushNotificationSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function getVapidPublicKeyFromEnv(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null;
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushNotificationSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function subscribeToWebPush(): Promise<{
  success: boolean;
  subscription?: PushSubscriptionJSON;
  error?: string;
}> {
  if (!isPushNotificationSupported()) {
    return { success: false, error: "unsupported" };
  }

  const publicKey = getVapidPublicKeyFromEnv();
  if (!publicKey) {
    return { success: false, error: "missing_vapid" };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { success: false, error: "denied" };
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
  }

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { success: false, error: "invalid_subscription" };
  }

  return {
    success: true,
    subscription: {
      endpoint: json.endpoint,
      keys: {
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      },
    },
  };
}

export async function unsubscribeFromWebPush(): Promise<boolean> {
  const subscription = await getPushSubscription();
  if (!subscription) return true;

  try {
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint }),
    });
    return true;
  } catch {
    return false;
  }
}

export async function registerPushSubscriptionOnServer(
  subscription: PushSubscriptionJSON
): Promise<boolean> {
  try {
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      }),
    });
    const data = (await res.json()) as { success?: boolean };
    return res.ok && data.success === true;
  } catch {
    return false;
  }
}

export async function testPushOnServer(): Promise<boolean> {
  try {
    const res = await fetch("/api/push/test", { method: "POST" });
    const data = (await res.json()) as { success?: boolean };
    return res.ok && data.success === true;
  } catch {
    return false;
  }
}
