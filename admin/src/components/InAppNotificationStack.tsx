"use client";

import React from "react";
import {
  ClipboardList,
  Clock,
  PhoneCall,
  Receipt,
  X,
  type LucideIcon,
} from "lucide-react";
import type { InAppToast } from "@/context/NotificationContext";
import { getInAppToastMeta, type NotificationType } from "@/lib/notifications";

interface InAppNotificationStackProps {
  toasts: InAppToast[];
  onDismiss: (id: string) => void;
  onOpen: (id: string, href: string) => void;
}

const TOAST_ICONS: Partial<Record<NotificationType, LucideIcon>> = {
  new_briefing: ClipboardList,
  follow_up: PhoneCall,
  sla_due: Clock,
  invoice_pending: Receipt,
};

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  return "hoje";
}

export default function InAppNotificationStack({
  toasts,
  onDismiss,
  onOpen,
}: InAppNotificationStackProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="in-app-toast-stack"
      role="region"
      aria-label="Alertas do painel"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const { actionLabel, accent } = getInAppToastMeta(toast);
        const Icon = TOAST_ICONS[toast.type] ?? ClipboardList;

        return (
          <article
            key={toast.toastKey}
            className="in-app-toast"
            data-priority={toast.priority}
            data-accent={accent}
            data-type={toast.type}
          >
            <div className="in-app-toast-icon-wrap" aria-hidden>
              <img src="/logo.png" alt="" className="in-app-toast-icon" />
              <span className="in-app-toast-icon-badge">
                <Icon className="h-3 w-3" />
              </span>
            </div>

            <div className="in-app-toast-body">
              <div className="in-app-toast-head">
                <p className="in-app-toast-app">Móveis Unghero</p>
                <span className="in-app-toast-time">{formatTimeAgo(toast.createdAt)}</span>
              </div>
              <p className="in-app-toast-title">{toast.title}</p>
              <p className="in-app-toast-message">{toast.message}</p>
              <button
                type="button"
                className="in-app-toast-action"
                onClick={() => onOpen(toast.toastKey, toast.href)}
              >
                {actionLabel}
              </button>
            </div>

            <button
              type="button"
              className="in-app-toast-close"
              onClick={() => onDismiss(toast.toastKey)}
              aria-label="Fechar alerta"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </article>
        );
      })}
    </div>
  );
}
