"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CircleAlert } from "lucide-react";
import { useNotificationContext } from "@/context/NotificationContext";
import type { AppNotification } from "@/lib/notifications";

interface NotificationCenterProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function NotificationCenter({
  isOpen,
  onOpenChange,
}: NotificationCenterProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [panelItems, setPanelItems] = useState<AppNotification[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  const open = isOpen ?? internalOpen;
  const { notifications, clearNotifications } = useNotificationContext();
  const notificationsRef = useRef(notifications);
  notificationsRef.current = notifications;

  const setMenuOpen = (value: boolean) => {
    if (onOpenChange) onOpenChange(value);
    else setInternalOpen(value);
  };

  const requestOpen = (value: boolean) => {
    if (value && !open) {
      const snapshot = [...notificationsRef.current];
      setPanelItems(snapshot);
      if (snapshot.length > 0) {
        clearNotifications(snapshot.map((n) => n.id));
      }
    }
    if (!value) {
      setPanelItems([]);
    }
    setMenuOpen(value);
  };

  // Fecha via outro menu do header (notes/reminders) sem passar por requestOpen.
  useEffect(() => {
    if (!open) setPanelItems([]);
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        requestOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const handleClearAll = () => {
    const ids =
      panelItems.length > 0
        ? panelItems.map((n) => n.id)
        : notificationsRef.current.map((n) => n.id);
    clearNotifications(ids);
    setPanelItems([]);
  };

  const badgeCount = notifications.length;
  const urgentCount = notifications.filter((n) => n.priority === "high").length;
  const listItems = open ? panelItems : notifications;
  const listCount = listItems.length;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => requestOpen(!open)}
        className="notification-trigger"
        aria-label="Notificações"
        aria-expanded={open}
      >
        <Bell className="h-4 w-4" />
        {badgeCount > 0 && (
          <span
            className={`notification-badge ${urgentCount > 0 ? "notification-badge-urgent" : ""}`}
          >
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <div className="notification-panel-heading">
              <p className="notification-panel-title">Notificações do sistema</p>
              <p className="notification-panel-subtitle">
                Prazos, pendências e atividades importantes.
              </p>
            </div>
            {listCount > 0 && (
              <div className="notification-panel-meta">
                <span className="notification-panel-count">
                  {listCount} nova{listCount !== 1 ? "s" : ""}
                </span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="notification-panel-clear"
                >
                  Limpar todas
                </button>
              </div>
            )}
          </div>

          {listItems.length === 0 ? (
            <div className="notification-empty">
              <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <Bell className="h-5 w-5" />
              </span>
              <p className="text-sm font-semibold text-foreground">Tudo em dia</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Nenhuma notificação do sistema no momento.
              </p>
            </div>
          ) : (
            <ul className="notification-list">
              {listItems.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={() => requestOpen(false)}
                    className={`notification-item ${item.priority === "high" ? "notification-item-urgent" : ""}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                          item.priority === "high"
                            ? "bg-red-500/10 text-red-600"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {item.priority === "high" ? (
                          <CircleAlert className="h-3.5 w-3.5" />
                        ) : (
                          <Bell className="h-3.5 w-3.5" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-foreground">{item.title}</p>
                        <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 break-words">
                          {item.message}
                        </p>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
