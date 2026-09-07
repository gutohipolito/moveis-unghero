"use client";

import React, { useEffect, useState } from "react";
import { CalendarDays, Clock, CloudSun } from "lucide-react";

const TIMEZONE = "America/Sao_Paulo";
const FARROUPILHA = { lat: -28.2758, lon: -51.775 };

function formatLocalTime(date: Date) {
  return date.toLocaleTimeString("pt-BR", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatLocalDate(date: Date) {
  const weekday = date.toLocaleDateString("pt-BR", {
    timeZone: TIMEZONE,
    weekday: "long",
  });
  const day = date.toLocaleDateString("pt-BR", {
    timeZone: TIMEZONE,
    day: "numeric",
  });
  const month = date.toLocaleDateString("pt-BR", {
    timeZone: TIMEZONE,
    month: "long",
  });
  const label = `${weekday}, ${day} de ${month}`;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Relógio, data e temperatura do header do portal (fuso America/Sao_Paulo). */
export default function ParceiroTopbarClock() {
  const [now, setNow] = useState<Date | null>(null);
  const [temperature, setTemperature] = useState<number | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
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
          /* falha silenciosa */
        });
    };

    const startTimer = window.setTimeout(() => {
      loadWeather();
      refreshTimer = setInterval(loadWeather, 30 * 60_000);
    }, 1200);

    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
      if (refreshTimer) clearInterval(refreshTimer);
    };
  }, []);

  if (!now) {
    return (
      <div className="parceiro-topbar-clock" aria-hidden>
        <div className="parceiro-topbar-meta-item">
          <Clock className="h-4 w-4 shrink-0" />
          <span className="parceiro-topbar-clock-time">--:--</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="parceiro-topbar-clock"
      aria-label={`Horário ${formatLocalTime(now)}. ${formatLocalDate(now)}${
        temperature !== null ? `. ${temperature} graus em Farroupilha` : ""
      }`}
    >
      <div className="parceiro-topbar-meta-item">
        <Clock className="h-4 w-4 shrink-0" aria-hidden />
        <span className="parceiro-topbar-clock-time">{formatLocalTime(now)}</span>
      </div>
      <div className="parceiro-topbar-meta-item parceiro-topbar-meta-date">
        <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
        <span className="parceiro-topbar-clock-date">{formatLocalDate(now)}</span>
      </div>
      {temperature !== null ? (
        <div className="parceiro-topbar-meta-item">
          <CloudSun className="h-4 w-4 shrink-0" aria-hidden />
          <span className="parceiro-topbar-clock-temp">
            <span className="parceiro-topbar-clock-temp-value">{temperature}°C</span>
            <span className="parceiro-topbar-clock-temp-place">Farroupilha</span>
          </span>
        </div>
      ) : null}
    </div>
  );
}
