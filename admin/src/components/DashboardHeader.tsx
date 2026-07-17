"use client";

import React, { useEffect, useRef, useState } from "react";
import { logout } from "@/app/actions/login";
import HeaderQuickActions from "@/components/HeaderQuickActions";
import NotificationChannelSettings from "@/components/NotificationChannelSettings";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import {
  BellRing,
  ChevronDown,
  Clock,
  CloudSun,
  Download,
  LogOut,
  Mail,
  User as UserIcon,
} from "lucide-react";
import type { AppNotification } from "@/lib/notifications";
import type { OperatorNote, OperatorReminder } from "@/lib/operatorWorkspace";

const TIMEZONE = "America/Sao_Paulo";
const FARROUPILHA = { lat: -28.2758, lon: -51.7750 };

interface DashboardHeaderProps {
  user: {
    name: string;
    email?: string;
    image?: string | null;
    cargo?: string;
  };
  companyId: string;
  initialNotifications?: AppNotification[];
  initialNotes?: OperatorNote[];
  initialReminders?: OperatorReminder[];
  isDbOnline?: boolean;
}

function formatLocalTime(date: Date) {
  return date.toLocaleTimeString("pt-BR", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatLocalDate(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    timeZone: TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function DashboardHeader({
  user,
  companyId,
  initialNotifications = [],
  initialNotes = [],
  initialReminders = [],
  isDbOnline = true,
}: DashboardHeaderProps) {
  const [now, setNow] = useState<Date | null>(null);
  const [temperature, setTemperature] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { canInstall, installing, install } = usePwaInstall();

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let refreshTimer: ReturnType<typeof setInterval> | undefined;

    const loadWeather = () => {
      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.searchParams.set("latitude", String(FARROUPILHA.lat));
      url.searchParams.set("longitude", String(FARROUPILHA.lon));
      url.searchParams.set("current", "temperature_2m");
      url.searchParams.set("timezone", TIMEZONE);

      fetch(url.toString())
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          const temp = data?.current?.temperature_2m;
          if (!cancelled && typeof temp === "number") {
            setTemperature(Math.round(temp));
          }
        })
        .catch(() => {
          // Falha silenciosa
        });
    };

    const startTimer = window.setTimeout(() => {
      loadWeather();
      refreshTimer = setInterval(loadWeather, 30 * 60_000);
    }, 2500);

    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
      if (refreshTimer) clearInterval(refreshTimer);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen]);

  return (
    <header className="dashboard-topbar sticky top-0 z-40 shrink-0">
      <div className="flex items-center gap-4 min-w-0">
        {now && (
          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 text-primary shrink-0" />
            <div className="leading-tight">
              <span className="font-semibold text-foreground tabular-nums">{formatLocalTime(now)}</span>
              <span className="hidden lg:inline text-muted-foreground"> · {formatLocalDate(now)}</span>
            </div>
          </div>
        )}

        {temperature !== null && (
          <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground pl-3 border-l border-border">
            <CloudSun className="h-4 w-4 text-primary shrink-0" />
            <span>
              <span className="font-semibold text-foreground">{temperature}°C</span>
              <span className="hidden md:inline text-muted-foreground"> · Farroupilha</span>
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Status do Banco de Dados Desktop */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-250/20 rounded-xl select-none mr-1">
          <span className="relative flex h-2 w-2">
            {isDbOnline ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            )}
          </span>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">banco de dados</span>
        </div>

        <HeaderQuickActions
          companyId={companyId}
          initialNotifications={initialNotifications}
          initialNotes={initialNotes}
          initialReminders={initialReminders}
        />

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="dashboard-user-trigger"
            aria-expanded={menuOpen}
            aria-haspopup="true"
          >
            <div className="dashboard-user-avatar">
              {user.image ? (
                <img src={user.image} alt="" className="w-full h-full object-cover rounded-full" />
              ) : (
                <UserIcon className="h-4 w-4 text-primary" />
              )}
              <span className="dashboard-user-online-dot" aria-label="Usuário online" />
            </div>
            <div className="hidden sm:block text-left min-w-0">
              <p className="text-[13px] font-bold text-foreground truncate max-w-[150px] leading-tight">
                {user.name}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground truncate max-w-[150px] mt-0.5">
                {user.cargo || "COMERCIAL"}
              </p>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${menuOpen ? "rotate-180" : ""}`} />
          </button>

          {menuOpen && (
            <div className="dashboard-user-menu">
              <div className="dashboard-user-menu-profile">
                <div className="dashboard-user-menu-avatar">
                  {user.image ? (
                    <img src={user.image} alt="" className="h-full w-full rounded-xl object-cover" />
                  ) : (
                    <UserIcon className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">{user.name}</p>
                  <span className="mt-1 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
                    {user.cargo || "COMERCIAL"}
                  </span>
                  {user.email && (
                    <p className="mt-1.5 flex items-center gap-1 truncate text-[10px] text-muted-foreground">
                      <Mail className="h-3 w-3 shrink-0" />
                      {user.email}
                    </p>
                  )}
                </div>
              </div>

              {now && (
                <div className="grid grid-cols-2 gap-2 border-b border-border bg-muted/20 px-3 py-2.5 text-[10px] text-muted-foreground sm:hidden">
                  <p className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> {formatLocalTime(now)} · {formatLocalDate(now)}
                  </p>
                  {temperature !== null && (
                    <p className="flex items-center gap-1.5">
                      <CloudSun className="h-3.5 w-3.5" /> {temperature}°C em Farroupilha
                    </p>
                  )}
                </div>
              )}

              <div className="dashboard-user-menu-settings">
                <NotificationChannelSettings />
              </div>

              <div className="flex items-center gap-2 border-t border-border bg-muted/20 px-3 py-2">
                <BellRing className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground">
                  Preferências salvas neste dispositivo.
                </p>
              </div>

              <div className="p-2">
              {canInstall && (
                <button
                  type="button"
                  onClick={() => {
                    void install();
                    setMenuOpen(false);
                  }}
                  disabled={installing}
                  className="dashboard-user-menu-item w-full rounded-lg"
                >
                  <Download className="h-4 w-4" />
                  {installing ? "Instalando..." : "Instalar aplicativo"}
                </button>
              )}
              <form action={logout}>
                <button type="submit" className="dashboard-user-menu-item dashboard-user-menu-logout w-full rounded-lg">
                  <LogOut className="h-4 w-4" />
                  Sair do painel
                </button>
              </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
