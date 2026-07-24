"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import {
  ClipboardList,
  Clock,
  FileWarning,
  PhoneCall,
  Receipt,
  Wallet,
  PackageOpen,
  UserRound,
  CalendarClock,
  X,
  type LucideIcon,
} from "lucide-react";
import type { InAppToast } from "@/context/NotificationContext";
import { getInAppToastMeta, type NotificationType } from "@/lib/notifications";
import {
  TOAST_SNOOZE_OPTIONS,
  type ToastSnoozeOption,
} from "@/lib/notificationChannels";

interface InAppNotificationStackProps {
  toasts: InAppToast[];
  onDismiss: (id: string) => void;
  onOpen: (id: string, href: string) => void;
  onSnooze: (id: string, option: ToastSnoozeOption) => void;
}

const TOAST_ICONS: Partial<Record<NotificationType, LucideIcon>> = {
  new_briefing: ClipboardList,
  follow_up: PhoneCall,
  sla_due: Clock,
  invoice_pending: Receipt,
  installment_due: Wallet,
  supply_ticket: PackageOpen,
  quote_stale: FileWarning,
  lead_no_quote: UserRound,
  quote_expiring: CalendarClock,
};

export default function InAppNotificationStack({
  toasts,
  onDismiss,
  onOpen,
  onSnooze,
}: InAppNotificationStackProps) {
  const [openSnoozeId, setOpenSnoozeId] = useState<string | null>(null);
  const menuId = useId();
  const stackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openSnoozeId) return;

    function onPointerDown(event: MouseEvent) {
      if (!stackRef.current?.contains(event.target as Node)) {
        setOpenSnoozeId(null);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenSnoozeId(null);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openSnoozeId]);

  if (toasts.length === 0) return null;

  return (
    <div
      ref={stackRef}
      className="in-app-toast-stack"
      role="region"
      aria-label="Alertas do painel"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const { actionLabel, accent } = getInAppToastMeta(toast);
        const Icon = TOAST_ICONS[toast.type] ?? ClipboardList;
        const snoozeOpen = openSnoozeId === toast.toastKey;

        return (
          <article
            key={toast.toastKey}
            className="in-app-toast"
            data-priority={toast.priority}
            data-accent={accent}
            data-type={toast.type}
          >
            <button
              type="button"
              className="in-app-toast-close"
              onClick={() => onDismiss(toast.toastKey)}
              aria-label="Fechar alerta"
            >
              <X className="h-3 w-3" strokeWidth={2.5} />
            </button>

            <button
              type="button"
              className="in-app-toast-main"
              onClick={() => onOpen(toast.toastKey, toast.href)}
            >
              <div className="in-app-toast-icon-wrap" aria-hidden>
                <img src="/logo.png" alt="" className="in-app-toast-icon" />
                <span className="in-app-toast-icon-badge">
                  <Icon className="h-3 w-3" />
                </span>
              </div>

              <div className="in-app-toast-body">
                <p className="in-app-toast-title">{toast.title}</p>
                <p className="in-app-toast-message">{toast.message}</p>
              </div>
            </button>

            <div className="in-app-toast-actions">
              <button
                type="button"
                className="in-app-toast-action"
                onClick={() => onOpen(toast.toastKey, toast.href)}
              >
                {actionLabel}
              </button>
              <div className="in-app-toast-snooze">
                <button
                  type="button"
                  className="in-app-toast-action in-app-toast-action-muted"
                  aria-expanded={snoozeOpen}
                  aria-controls={`${menuId}-${toast.toastKey}`}
                  onClick={() =>
                    setOpenSnoozeId((prev) =>
                      prev === toast.toastKey ? null : toast.toastKey
                    )
                  }
                >
                  Lembrar depois
                </button>
                {snoozeOpen ? (
                  <div
                    id={`${menuId}-${toast.toastKey}`}
                    className="in-app-toast-snooze-menu"
                    role="menu"
                  >
                    {TOAST_SNOOZE_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        role="menuitem"
                        className="in-app-toast-snooze-item"
                        onClick={() => {
                          setOpenSnoozeId(null);
                          onSnooze(toast.toastKey, option.id);
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
