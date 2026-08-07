"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import {
  ClipboardList,
  Clock,
  FileWarning,
  PhoneCall,
  BellRing,
  Receipt,
  Wallet,
  PackageOpen,
  UserRound,
  CalendarClock,
  ChevronDown,
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
  card_note: BellRing,
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuId = useId();
  const stackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenuId) return;

    function onPointerDown(event: MouseEvent) {
      if (!stackRef.current?.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenMenuId(null);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openMenuId]);

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
        const menuOpen = openMenuId === toast.toastKey;
        const optionsMenuId = `${menuId}-${toast.toastKey}`;

        return (
          <article
            key={toast.toastKey}
            className="in-app-toast"
            data-priority={toast.priority}
            data-accent={accent}
            data-type={toast.type}
            data-menu-open={menuOpen ? "true" : undefined}
          >
            <button
              type="button"
              className="in-app-toast-close"
              onClick={() => onDismiss(toast.toastKey)}
              aria-label="Fechar alerta"
            >
              <X className="h-3 w-3" strokeWidth={2.5} />
            </button>

            <div className="in-app-toast-row">
              <div className="in-app-toast-icon-wrap" aria-hidden>
                <img src="/logo.png" alt="" className="in-app-toast-icon" />
                <span className="in-app-toast-icon-badge">
                  <Icon className="h-3 w-3" />
                </span>
              </div>

              <div className="in-app-toast-content">
                <button
                  type="button"
                  className="in-app-toast-main"
                  onClick={() => onOpen(toast.toastKey, toast.href)}
                >
                  <p className="in-app-toast-title">{toast.title}</p>
                  <p className="in-app-toast-message">{toast.message}</p>
                </button>

                <div className="in-app-toast-options">
                  <button
                    type="button"
                    className="in-app-toast-options-btn"
                    aria-expanded={menuOpen}
                    aria-haspopup="menu"
                    aria-controls={optionsMenuId}
                    onClick={() =>
                      setOpenMenuId((prev) =>
                        prev === toast.toastKey ? null : toast.toastKey
                      )
                    }
                  >
                    Opções
                    <ChevronDown
                      className="h-3 w-3 in-app-toast-options-chevron"
                      strokeWidth={2.5}
                    />
                  </button>

                  {menuOpen ? (
                    <div id={optionsMenuId} className="in-app-toast-options-menu" role="menu">
                      <button
                        type="button"
                        role="menuitem"
                        className="in-app-toast-options-item"
                        onClick={() => {
                          setOpenMenuId(null);
                          onOpen(toast.toastKey, toast.href);
                        }}
                      >
                        {actionLabel}
                      </button>
                      <div className="in-app-toast-options-sep" role="separator" />
                      <p className="in-app-toast-options-label">Lembrar depois</p>
                      {TOAST_SNOOZE_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          role="menuitem"
                          className="in-app-toast-options-item"
                          onClick={() => {
                            setOpenMenuId(null);
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
            </div>
          </article>
        );
      })}
    </div>
  );
}
