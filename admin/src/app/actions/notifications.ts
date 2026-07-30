"use server";

import {
  type AppNotification,
} from "@/lib/notifications";
import { fetchCompanyNotifications } from "@/lib/fetchCompanyNotifications";
import { assertCompanyAccess, getAuthContext } from "@/lib/auth-guard";
import { isDatabaseOffline, prisma } from "@/lib/prisma";
import { getCompanyPermissions } from "@/lib/moduleAccess";
import {
  filterNotificationsForAccess,
  readServerClearedNotificationIds,
} from "@/lib/notificationAccess";

export async function getNotifications(companyId: string): Promise<{
  success: boolean;
  notifications: AppNotification[];
}> {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, notifications: [] };
  }
  try {
    assertCompanyAccess(auth, companyId);
  } catch {
    return { success: false, notifications: [] };
  }

  if (isDatabaseOffline()) {
    return { success: true, notifications: [] };
  }

  try {
    const [notifications, permissions, user] = await Promise.all([
      fetchCompanyNotifications(companyId, auth.cargo),
      getCompanyPermissions(companyId),
      prisma.user.findUnique({
        where: { id: auth.userId },
        select: { preferences: true },
      }),
    ]);
    const filtered = filterNotificationsForAccess(
      notifications,
      permissions,
      auth.cargo,
      readServerClearedNotificationIds(user?.preferences)
    );
    return { success: true, notifications: filtered };
  } catch (error) {
    console.error("Erro ao buscar notificações:", error);
    return { success: false, notifications: [] };
  }
}
