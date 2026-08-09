"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Info } from "lucide-react";

interface InfoTooltipProps {
  children: React.ReactNode;
  label?: string;
  className?: string;
}

type Coords = { top: number; left: number; width: number };

const GAP = 8;
const MARGIN = 8;
const MAX_WIDTH = 288; // w-72

export default function InfoTooltip({
  children,
  label = "Mais informações",
  className = "",
}: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const reposition = useCallback(() => {
    const btn = btnRef.current;
    const panel = panelRef.current;
    if (!btn || !panel) return;
    const rect = btn.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      setCoords(null);
      return;
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(MAX_WIDTH, vw - MARGIN * 2);
    const panelH = panel.offsetHeight;
    if (panelH < 4) return;

    let left = rect.left;
    left = Math.min(left, vw - width - MARGIN);
    left = Math.max(MARGIN, left);

    let top = rect.bottom + GAP;
    if (top + panelH > vh - MARGIN) {
      const above = rect.top - GAP - panelH;
      if (above >= MARGIN) top = above;
      else top = Math.max(MARGIN, vh - panelH - MARGIN);
    }

    setCoords({ top, left, width });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    reposition();
    const id = window.requestAnimationFrame(() => reposition());
    return () => window.cancelAnimationFrame(id);
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;

    const onDocDown = (e: MouseEvent) => {
      if (
        wrapRef.current?.contains(e.target as Node) ||
        panelRef.current?.contains(e.target as Node)
      )
        return;
      setOpen(false);
      setCoords(null);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setCoords(null);
      }
    };
    const onScroll = () => reposition();

    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onEsc);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onEsc);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, reposition]);

  return (
    <div
      ref={wrapRef}
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => {
        setOpen(false);
        setCoords(null);
      }}
    >
      <button
        ref={btnRef}
        type="button"
        aria-label={label}
        onClick={() =>
          setOpen((o) => {
            if (o) setCoords(null);
            return !o;
          })
        }
        className="inline-flex items-center justify-center h-6 w-6 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
      >
        <Info className="h-4 w-4" />
      </button>

      {open && (
        <div
          ref={panelRef}
          role="tooltip"
          style={{
            position: "fixed",
            top: coords?.top ?? 0,
            left: coords?.left ?? 0,
            width: coords?.width ?? MAX_WIDTH,
            opacity: coords ? 1 : 0,
            pointerEvents: coords ? "auto" : "none",
          }}
          className="z-[200] rounded-xl border border-slate-200 bg-white p-3.5 text-left shadow-xl shadow-slate-900/10 normal-case"
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
