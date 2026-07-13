"use client";

import React, { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";

interface InfoTooltipProps {
  children: React.ReactNode;
  label?: string;
  className?: string;
}

export default function InfoTooltip({
  children,
  label = "Mais informações",
  className = "",
}: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div
      ref={ref}
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center justify-center h-6 w-6 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
      >
        <Info className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="tooltip"
          className="absolute left-0 top-8 z-50 w-72 rounded-xl border border-slate-200 bg-white p-3.5 text-left shadow-xl shadow-slate-900/10 normal-case"
        >
          {children}
        </div>
      )}
    </div>
  );
}

/** Corpo padronizado do tooltip: título opcional + lista de itens. */
export function TooltipBody({
  title,
  items,
}: {
  title?: string;
  items: React.ReactNode[];
}) {
  return (
    <>
      {title && <p className="text-xs font-bold text-slate-700 mb-1.5">{title}</p>}
      <ul className="space-y-1.5 text-[11px] leading-relaxed text-slate-600 list-disc pl-4 font-medium">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </>
  );
}
