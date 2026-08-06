"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  BellRing,
  Check,
  ChevronDown,
  IdCard,
  Loader2,
  LogOut,
  Mail,
  Monitor,
  Volume2,
  VolumeX,
} from "lucide-react";
import { logoutParceiro } from "@/app/actions/parceiroPortal";
import type { PartnerPortalData } from "@/lib/partnerPortal";
import { getPartnerRoleLabel } from "@/lib/partnerTypes";
import {
  getBrowserPermission,
  isBrowserNotificationSupported,
  requestBrowserPermission,
  showBrowserNotification,
  type BrowserPermission,
} from "@/lib/browserNotifications";
import {
  loadNotificationPrefs,
  saveNotificationPrefs,
  DEFAULT_NOTIFICATION_PREFS,
  type NotificationPreferences,
} from "@/lib/notificationChannels";
import { cn } from "@/lib/utils";
import { DownloadIcon, useAnimatedIconHover } from "@/components/icons";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function PartnerNotificationSettings() {
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFS);
  const [permission, setPermission] = useState<BrowserPermission>("default");
  const [browserSupported, setBrowserSupported] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [testState, setTestState] = useState<"idle" | "ok" | "fail">("idle");

  useEffect(() => {
    setPrefs(loadNotificationPrefs());
    setPermission(getBrowserPermission());
    setBrowserSupported(isBrowserNotificationSupported());
  }, []);

  const browserActive = prefs.browser && permission === "granted";
  const blocked = permission === "denied";

  const updatePrefs = (next: NotificationPreferences) => {
    setPrefs(next);
    saveNotificationPrefs(next);
  };

  const enableBrowser = async () => {
    setEnabling(true);
    try {
      const result = await requestBrowserPermission();
      setPermission(result);
      if (result === "granted") {
        updatePrefs({ ...prefs, browser: true });
      }
    } finally {
      setEnabling(false);
    }
  };

  const disableBrowser = () => {
    updatePrefs({ ...prefs, browser: false });
  };

  const testBrowser = async () => {
    const ok = await showBrowserNotification(
      {
        id: `partner-test-${Date.now()}`,
        title: "Móveis Unghero",
        message: "Notificações do portal do parceiro ativas.",
        href: "/parceiro/painel",
        type: "info",
        priority: "normal",
        createdAt: new Date().toISOString(),
      },
      { playSound: prefs.sound }
    );
    setTestState(ok ? "ok" : "fail");
    window.setTimeout(() => setTestState("idle"), 2200);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5 px-1">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Notificações
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Ative alertas do portal neste dispositivo.
          </p>
        </div>
        <BellRing className="h-4 w-4 text-primary shrink-0 mt-0.5" />
      </div>

      <div className="rounded-xl border border-border bg-background/70 p-3">
        <div className="flex items-start gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            <Monitor className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-foreground">Navegador</p>
            <p className="text-[10px] text-muted-foreground">
              {blocked
                ? "Bloqueado nas configurações do navegador."
                : browserActive
                  ? "Alertas do portal liberados neste dispositivo."
                  : "Receba notificações importantes sobre projetos em andamento."}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {!browserSupported ? (
                <span className="text-[10px] font-semibold text-muted-foreground">
                  Não suportado neste navegador.
                </span>
              ) : browserActive ? (
                <>
                  <button
                    type="button"
                    onClick={() => void testBrowser()}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-[10px] font-bold text-primary-foreground"
                  >
                    {testState === "ok" ? (
                      <>
                        <Check className="h-3 w-3" /> Enviado
                      </>
                    ) : testState === "fail" ? (
                      "Falhou"
                    ) : (
                      "Testar"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={disableBrowser}
                    className="inline-flex items-center rounded-md border border-border px-2.5 py-1.5 text-[10px] font-bold text-muted-foreground"
                  >
                    Desativar
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => void enableBrowser()}
                  disabled={enabling || blocked}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-[10px] font-bold text-primary-foreground disabled:opacity-50"
                >
                  {enabling ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  {blocked ? "Bloqueado" : "Ativar"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background/70 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              {prefs.sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground">Som</p>
              <p className="text-[10px] text-muted-foreground">Toque ao receber alerta.</p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={prefs.sound}
            onClick={() => updatePrefs({ ...prefs, sound: !prefs.sound })}
            className={cn(
              "relative h-6 w-10 shrink-0 rounded-full border transition-colors",
              prefs.sound
                ? "border-primary/40 bg-primary"
                : "border-border bg-muted"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                prefs.sound && "translate-x-4"
              )}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

type Props = {
  partner: PartnerPortalData;
  onOpenSettings: () => void;
};

export default function ParceiroUserMenu({
  partner,
  onOpenSettings,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const installIcon = useAnimatedIconHover();
  const roleLabel = getPartnerRoleLabel(partner.tipo, partner.nome);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        className="parceiro-user-trigger"
        aria-expanded={menuOpen}
        aria-haspopup="true"
      >
        <div className="parceiro-user-avatar">
          {partner.fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={partner.fotoUrl} alt="" className="h-full w-full rounded-full object-cover" />
          ) : (
            <span className="text-[10px] font-black tracking-wide text-zinc-200/90">
              {getInitials(partner.nome)}
            </span>
          )}
          <span className="parceiro-user-online-dot" aria-label="Online" />
        </div>
        <div className="hidden sm:block text-left min-w-0">
          <p className="text-[13px] font-bold text-white truncate max-w-[140px] leading-tight">
            {partner.nome.split(" ")[0]}
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-white/55 truncate max-w-[140px] mt-0.5">
            {roleLabel}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-white/55 transition-transform",
            menuOpen && "rotate-180"
          )}
        />
      </button>

      {menuOpen && (
        <div className="dashboard-user-menu parceiro-user-menu">
          <div className="dashboard-user-menu-profile">
            <div className="dashboard-user-menu-avatar">
              {partner.fotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={partner.fotoUrl}
                  alt=""
                  className="h-full w-full rounded-xl object-cover"
                />
              ) : (
                <span className="text-xs font-black text-primary">
                  {getInitials(partner.nome)}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">{partner.nome}</p>
              <span className="mt-1 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
                {roleLabel}
              </span>
              {partner.email && (
                <p className="mt-1.5 flex items-center gap-1 truncate text-[10px] text-muted-foreground">
                  <Mail className="h-3 w-3 shrink-0" />
                  {partner.email}
                </p>
              )}
            </div>
          </div>

          <div className="dashboard-user-menu-settings">
            <PartnerNotificationSettings />
          </div>

          <div className="flex items-center gap-2 border-t border-border bg-muted/20 px-3 py-2">
            <BellRing className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground">
              Preferências salvas neste dispositivo.
            </p>
          </div>

          <div className="p-2">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onOpenSettings();
              }}
              className="dashboard-user-menu-item w-full rounded-lg"
            >
              <IdCard className="h-4 w-4" />
              Configurações
            </button>
            <div
              className="parceiro-user-menu-soon"
              aria-disabled="true"
              {...installIcon.hoverHandlers}
            >
              <DownloadIcon ref={installIcon.iconRef} size={16} className="shrink-0 opacity-55" />
              <span className="flex-1">Instalar aplicativo</span>
              <span className="parceiro-soon-sticker">Em breve</span>
            </div>
            <form action={logoutParceiro}>
              <button
                type="submit"
                className="dashboard-user-menu-item dashboard-user-menu-logout w-full rounded-lg"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
