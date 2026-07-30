import { prisma } from "@/lib/prisma";
import { fetchCompanyNotifications } from "@/lib/fetchCompanyNotifications";
import { buildPushPayload, sendWebPush } from "@/lib/webPush";
import { getCompanyPermissions } from "@/lib/moduleAccess";
import {
  filterNotificationsForAccess,
  readServerClearedNotificationIds,
} from "@/lib/notificationAccess";

function getPushOrigin(): string {
  return (
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
    "https://admin.moveisunghero.com.br"
  );
}

export async function deliverPendingPushNotifications(): Promise<{
  sent: number;
  failed: number;
  removed: number;
}> {
  const origin = getPushOrigin();
  let sent = 0;
  let failed = 0;
  let removed = 0;

  const subscriptions = await prisma.pushSubscription.findMany({
    include: {
      user: {
        select: {
          company_id: true,
          cargo: true,
          preferences: true,
        },
      },
      deliveries: { select: { notification_id: true } },
    },
  });

  if (subscriptions.length === 0) {
    return { sent, failed, removed };
  }

  const notificationsByCompanyRole = new Map<
    string,
    Awaited<ReturnType<typeof fetchCompanyNotifications>>
  >();
  const permissionsByCompany = new Map<
    string,
    Awaited<ReturnType<typeof getCompanyPermissions>>
  >();

  for (const sub of subscriptions) {
    const companyId = sub.user.company_id;
    const role = sub.user.cargo;
    const cacheKey = `${companyId}:${role}`;

    if (!notificationsByCompanyRole.has(cacheKey)) {
      notificationsByCompanyRole.set(
        cacheKey,
        await fetchCompanyNotifications(companyId, role)
      );
    }
    if (!permissionsByCompany.has(companyId)) {
      permissionsByCompany.set(
        companyId,
        await getCompanyPermissions(companyId)
      );
    }

    const notifications = filterNotificationsForAccess(
      notificationsByCompanyRole.get(cacheKey) ?? [],
      permissionsByCompany.get(companyId),
      role,
      readServerClearedNotificationIds(sub.user.preferences)
    );
    const delivered = new Set(sub.deliveries.map((d) => d.notification_id));
    const pending = notifications.filter((n) => !delivered.has(n.id));

    if (pending.length === 0) continue;

    const pushSub = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    };

    for (const notification of pending) {
      const payload = buildPushPayload(notification, origin);
      const result = await sendWebPush(pushSub, payload);

      if (result.ok) {
        await prisma.pushNotificationSent.create({
          data: {
            subscription_id: sub.id,
            notification_id: notification.id,
          },
        });
        sent += 1;
        continue;
      }

      if (result.gone) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } });
        removed += 1;
        break;
      }

      failed += 1;
    }
  }

  return { sent, failed, removed };
}

export async function sendTestPushToUser(userId: string): Promise<boolean> {
  const origin = getPushOrigin();
  const subscription = await prisma.pushSubscription.findFirst({
    where: { user_id: userId },
    orderBy: { updatedAt: "desc" },
  });

  if (!subscription) return false;

  const payload = buildPushPayload(
    {
      id: `test-push-${Date.now()}`,
      type: "info",
      priority: "normal",
      title: "Push mobile ativo",
      message: "Você receberá alertas do Móveis Unghero mesmo com o app fechado.",
      href: "/crm",
      createdAt: new Date().toISOString(),
    },
    origin
  );

  const result = await sendWebPush(
    {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    },
    payload
  );

  if (!result.ok) {
    if (result.gone) {
      await prisma.pushSubscription.delete({ where: { id: subscription.id } });
    }
    return false;
  }

  return true;
}
