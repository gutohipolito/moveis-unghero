"use client";

import { useNotificationContext } from "@/context/NotificationContext";
import type { AppNotification } from "@/lib/notifications";

interface UseNotificationDeliveryOptions {
  companyId: string;
  initialNotifications: AppNotification[];
}

/** @deprecated Props ignorados — use dentro de NotificationProvider */
export function useNotificationDelivery(_options?: UseNotificationDeliveryOptions) {
  return useNotificationContext();
}
