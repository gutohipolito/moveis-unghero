"use client";

import React, { useEffect, useState } from "react";
import { Clock } from "lucide-react";

const TIMEZONE = "America/Sao_Paulo";

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

/** Relógio do header do portal (mesmo fuso do painel da fábrica). */
export default function ParceiroTopbarClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!now) {
    return (
      <div className="parceiro-topbar-clock" aria-hidden>
        <Clock className="h-4 w-4 shrink-0" />
        <span className="parceiro-topbar-clock-time">--:--</span>
      </div>
    );
  }

  return (
    <div className="parceiro-topbar-clock">
      <Clock className="h-4 w-4 shrink-0" aria-hidden />
      <div className="parceiro-topbar-clock-text">
        <span className="parceiro-topbar-clock-time">{formatLocalTime(now)}</span>
        <span className="parceiro-topbar-clock-date">{formatLocalDate(now)}</span>
      </div>
    </div>
  );
}
