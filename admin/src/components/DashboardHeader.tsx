"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Clock, CloudSun, ChevronDown, LogOut, User as UserIcon } from "lucide-react";
import { logout } from "@/app/actions/login";
import type { AppNotification } from "@/lib/notifications";

const TIMEZONE = "America/Sao_Paulo";
const FARROUPILHA = { lat: -28.2758, lon: -51.7750 };

interface DashboardHeaderProps {
  user: {
    name: string;
    email?: string;
    image?: string | null;
    cargo?: string;
  };
  initialNotifications?: AppNotification[];
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
  initialNotifications = [],
}: DashboardHeaderProps) {
  const [now, setNow] = useState<Date | null>(null);
  const [temperature, setTemperature] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const notifications = initialNotifications;
  const notifCount = notifications.length;
  const urgentCount = notifications.filter((n) => n.priority === "high").length;

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadWeather() {
      try {
        const url = new URL("https://api.open-meteo.com/v1/forecast");
        url.searchParams.set("latitude", String(FARROUPILHA.lat));
        url.searchParams.set("longitude", String(FARROUPILHA.lon));
        url.searchParams.set("current", "temperature_2m");
        url.searchParams.set("timezone", TIMEZONE);

        const res = await fetch(url.toString());
        if (!res.ok) return;

        const data = await res.json();
        const temp = data?.current?.temperature_2m;
        if (!cancelled && typeof temp === "number") {
          setTemperature(Math.round(temp));
        }
      } catch {
        // Falha silenciosa
      }
    }

    loadWeather();
    const refresh = setInterval(loadWeather, 30 * 60_000);
    return () => {
      cancelled = true;
      clearInterval(refresh);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (menuOpen || notifOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen, notifOpen]);

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
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => {
              setNotifOpen(!notifOpen);
              setMenuOpen(false);
            }}
            className="notification-trigger"
            aria-label="Notificações"
            aria-expanded={notifOpen}
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

          {notifOpen && (
            <div className="notification-panel">
              <div className="notification-panel-header">
                <p className="text-sm font-bold text-foreground">Notificações</p>
                {notifCount > 0 && (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    {notifCount} pendente{notifCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="notification-empty">
                  <Bell className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma notificação no momento.</p>
                </div>
              ) : (
                <ul className="notification-list">
                  {notifications.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        onClick={() => setNotifOpen(false)}
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
                  onClick={() => setNotifOpen(false)}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Ver funil comercial
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(!menuOpen);
              setNotifOpen(false);
            }}
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
            </div>
            <div className="hidden sm:block text-left min-w-0">
              <p className="text-sm font-medium text-foreground truncate max-w-[140px]">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate max-w-[140px]">{user.cargo || "COMERCIAL"}</p>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${menuOpen ? "rotate-180" : ""}`} />
          </button>

          {menuOpen && (
            <div className="dashboard-user-menu">
              <div className="px-3 py-2 border-b border-border sm:hidden">
                <p className="text-sm font-medium text-foreground">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.cargo || "COMERCIAL"}</p>
              </div>
              {now && (
                <div className="px-3 py-2 border-b border-border sm:hidden text-xs text-muted-foreground space-y-1">
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
              <form action={logout}>
                <button type="submit" className="dashboard-user-menu-item w-full">
                  <LogOut className="h-4 w-4" />
                  Sair do painel
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
