"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CircleAlert } from "lucide-react";
import { useNotificationContext } from "@/context/NotificationContext";

interface NotificationCenterProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function NotificationCenter({
  isOpen,
  onOpenChange,
}: NotificationCenterProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const open = isOpen ?? internalOpen;
  const setOpen = (value: boolean) => {
    if (onOpenChange) onOpenChange(value);
    else setInternalOpen(value);
  };

  const { notifications } = useNotificationContext();

  const notifCount = notifications.length;
  const urgentCount = notifications.filter((n) => n.priority === "high").length;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="notification-trigger"
        aria-label="Notificações"
        aria-expanded={open}
      >
        <Bell className="h-4 w-4" />
        {notifCount > 0 && (
          <span
            className={`notification-badge ${urgentCount > 0 ? "notification-badge-urgent" : ""}`}
          >
            {notifCount > 9 ? "9+" : notifCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <div>
              <p className="text-sm font-bold text-foreground">Notificações do sistema</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Prazos, pendências e atividades importantes.
              </p>
            </div>
            {notifCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">
                {notifCount} nova{notifCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {notifications.length === 0 ? (
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
              {notifications.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`notification-item ${item.priority === "high" ? "notification-item-urgent" : ""}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        item.priority === "high"
                          ? "bg-red-500/10 text-red-600"
                          : "bg-primary/10 text-primary"
                      }`}>
                        {item.priority === "high" ? (
                          <CircleAlert className="h-3.5 w-3.5" />
                        ) : (
                          <Bell className="h-3.5 w-3.5" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground">{item.title}</p>
                        <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
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
