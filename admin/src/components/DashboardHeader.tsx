"use client";

import React, { useEffect, useRef, useState } from "react";
import { logout } from "@/app/actions/login";
import NotificationCenter from "@/components/NotificationCenter";
import { Clock, CloudSun, ChevronDown, LogOut, User as UserIcon } from "lucide-react";
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
  companyId: string;
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
  companyId,
  initialNotifications = [],
}: DashboardHeaderProps) {
  const [now, setNow] = useState<Date | null>(null);
  const [temperature, setTemperature] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
        <NotificationCenter
          companyId={companyId}
          initialNotifications={initialNotifications}
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
