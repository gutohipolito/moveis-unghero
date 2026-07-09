"use client";

import React from "react";
import { ClipboardList, X } from "lucide-react";
import type { InAppToast } from "@/context/NotificationContext";

interface InAppNotificationStackProps {
  toasts: InAppToast[];
  onDismiss: (id: string) => void;
  onOpen: (id: string, href: string) => void;
}

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
      {toasts.map((toast) => (
        <article
          key={toast.toastKey}
          className="in-app-toast"
          data-priority={toast.priority}
        >
          <div className="in-app-toast-icon-wrap" aria-hidden>
            <img src="/logo.png" alt="" className="in-app-toast-icon" />
            <span className="in-app-toast-icon-badge">
              <ClipboardList className="h-3 w-3" />
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
              Ver briefing
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
      ))}
    </div>
  );
}
