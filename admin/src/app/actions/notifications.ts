"use server";

import {
  type AppNotification,
} from "@/lib/notifications";
import { fetchCompanyNotifications } from "@/lib/fetchCompanyNotifications";
import { assertCompanyAccess, getAuthContext } from "@/lib/auth-guard";
import { isDatabaseOffline } from "@/lib/prisma";

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
    const notifications = await fetchCompanyNotifications(companyId);
    return { success: true, notifications };
  } catch (error) {
    console.error("Erro ao buscar notificações:", error);
    return { success: false, notifications: [] };
  }
}
