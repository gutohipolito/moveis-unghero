"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { Bell, BellRing, Monitor, Smartphone, Volume2, VolumeX } from "lucide-react";
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
  const [testStatus, setTestStatus] = useState<"idle" | "ok" | "fail">("idle");
  const panelRef = useRef<HTMLDivElement>(null);

  const open = isOpen ?? internalOpen;
  const setOpen = (value: boolean) => {
    if (onOpenChange) onOpenChange(value);
    else setInternalOpen(value);
  };

  const {
    notifications,
    prefs,
    browserPermission,
    browserSupported,
    enablingBrowser,
    enableBrowserNotifications,
    disableBrowserNotifications,
    toggleNotificationSound,
    testBrowserNotification,
  } = useNotificationContext();

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

  const browserActive = prefs.browser && browserPermission === "granted";
  const browserBlocked = browserPermission === "denied";

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
            <p className="text-sm font-bold text-foreground">Notificações</p>
            {notifCount > 0 && (
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {notifCount} pendente{notifCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="notification-channel-settings">
            <div className="flex items-start gap-2">
              <Monitor className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <p className="text-xs font-bold text-foreground">Alertas no navegador</p>
                <p className="text-[10px] text-muted-foreground leading-snug">
                  Briefings, follow-ups urgentes, SLA e NF pendente aparecem como alerta visual no painel.
                  Alertas do sistema operacional são opcionais abaixo.
                </p>
                {browserBlocked ? (
                  <p className="text-[10px] text-red-700 bg-red-50 border border-red-200 rounded-md px-2 py-1">
                    Permissão bloqueada. Libere nas configurações do navegador para este site.
                  </p>
                ) : !browserSupported ? (
                  <p className="text-[10px] text-muted-foreground">
                    Seu navegador não suporta notificações.
                  </p>
                ) : browserActive ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-md">
                        <BellRing className="h-3 w-3" /> Ativo
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          setTestStatus("idle");
                          const ok = await testBrowserNotification();
                          setTestStatus(ok ? "ok" : "fail");
                        }}
                        className="text-[10px] font-semibold text-primary hover:underline cursor-pointer"
                      >
                        Testar alerta
                      </button>
                      <button
                        type="button"
                        onClick={disableBrowserNotifications}
                        className="text-[10px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        Desativar
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={toggleNotificationSound}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {prefs.sound ? (
                          <>
                            <Volume2 className="h-3 w-3" /> Som ativo
                          </>
                        ) : (
                          <>
                            <VolumeX className="h-3 w-3" /> Som desligado
                          </>
                        )}
                      </button>
                    </div>
                    {testStatus === "ok" ? (
                      <p className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1">
                        Alerta enviado — confira o canto da tela ou a central de notificações do sistema.
                      </p>
                    ) : null}
                    {testStatus === "fail" ? (
                      <p className="text-[10px] text-red-700 bg-red-50 border border-red-200 rounded-md px-2 py-1">
                        Não foi possível exibir o alerta. Verifique a permissão do site nas configurações do navegador.
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={enablingBrowser}
                    onClick={() => enableBrowserNotifications()}
                    className="text-[10px] font-bold text-primary-foreground bg-primary hover:bg-primary/90 px-3 py-1.5 rounded-md transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {enablingBrowser ? "Aguardando permissão..." : "Ativar alertas no navegador"}
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 opacity-50 pt-1 border-t border-border/50">
              <Smartphone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <p className="text-[10px] text-muted-foreground">Push mobile e e-mail — em breve</p>
            </div>
          </div>

          {notifications.length === 0 ? (
            <div className="notification-empty">
              <Bell className="h-8 w-8 text-muted-foreground/40 mb-2 mx-auto" />
              <p className="text-sm text-muted-foreground">Nenhuma notificação no momento.</p>
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
                    <p className="text-xs font-bold text-foreground">{item.title}</p>
                    <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                      {item.message}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="notification-panel-footer">
            <Link
              href="/crm"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Ver funil comercial
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
