"use client";

import React from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

interface HowToAccordionProps {
  title: string;
  children: React.ReactNode;
  /** Aberto por padrão (ex.: primeira visita). Default: fechado. */
  defaultOpen?: boolean;
  className?: string;
  tone?: "amber" | "neutral";
}

/** Bloco “Como usar” recolhível — economiza espaço em telas menores. */
export default function HowToAccordion({
  title,
  children,
  defaultOpen = false,
  className = "",
  tone = "amber",
}: HowToAccordionProps) {
  const shell =
    tone === "neutral"
      ? "border-border/60 bg-slate-50/70"
      : "border-amber-200/70 bg-amber-50/50";
  const summary =
    tone === "neutral"
      ? "text-foreground hover:bg-slate-100/70"
      : "text-amber-950 hover:bg-amber-50/80";
  const icon =
    tone === "neutral" ? "text-muted-foreground" : "text-amber-700/80";
  const chevron =
    tone === "neutral" ? "text-muted-foreground/70" : "text-amber-800/60";
  const body =
    tone === "neutral"
      ? "text-muted-foreground border-border/50"
      : "text-amber-950/85 border-amber-200/40";

  return (
    <details
      className={`group rounded-xl border overflow-hidden ${shell} ${className}`}
      open={defaultOpen || undefined}
    >
      <summary
        className={`flex items-center justify-between gap-2 px-4 py-3 cursor-pointer list-none select-none transition-colors [&::-webkit-details-marker]:hidden ${summary}`}
      >
        <span className="flex items-center gap-2 min-w-0">
          <HelpCircle className={`h-3.5 w-3.5 shrink-0 ${icon}`} aria-hidden />
          <span className="text-xs font-bold truncate">{title}</span>
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180 ${chevron}`}
        />
      </summary>
      <div className={`px-4 pb-3.5 pt-0 text-xs leading-relaxed border-t ${body}`}>
        <div className="pt-3 space-y-2">{children}</div>
      </div>
    </details>
  );
}
