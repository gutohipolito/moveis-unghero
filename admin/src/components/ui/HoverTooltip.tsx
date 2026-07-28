"use client";

import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

type Coords = { top: number; left: number; width: number; placement: "top" | "bottom" };

const GAP = 8;
const MARGIN = 8;
const MAX_WIDTH = 260;
const OPEN_DELAY_MS = 280;

interface HoverTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  /** Preferência inicial; reposiciona se não couber. */
  side?: "top" | "bottom";
  className?: string;
  disabled?: boolean;
  /** Delay antes de abrir (ms). Default 280; use ~80 no header. */
  delayMs?: number;
}

/**
 * Tooltip de hover do sistema (não usa title nativo do navegador).
 * Posiciona em fixed e evita cortar no overflow dos cards.
 */
export default function HoverTooltip({
  content,
  children,
  side = "top",
  className = "",
  disabled = false,
  delayMs = OPEN_DELAY_MS,
}: HoverTooltipProps) {
  const tooltipId = useId();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reposition = useCallback(() => {
    const anchor = wrapRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(MAX_WIDTH, vw - MARGIN * 2);
    const panelH = panelRef.current?.offsetHeight ?? 0;

    let left = rect.left + rect.width / 2 - width / 2;
    left = Math.min(left, vw - width - MARGIN);
    left = Math.max(MARGIN, left);

    let placement: "top" | "bottom" = side;
    let top =
      placement === "top" ? rect.top - GAP - panelH : rect.bottom + GAP;

    if (placement === "top" && top < MARGIN) {
      placement = "bottom";
      top = rect.bottom + GAP;
    } else if (placement === "bottom" && panelH && top + panelH > vh - MARGIN) {
      const above = rect.top - GAP - panelH;
      if (above >= MARGIN) {
        placement = "top";
        top = above;
      }
    }

    setCoords({ top, left, width, placement });
  }, [side]);

  useLayoutEffect(() => {
    if (open) reposition();
  }, [open, reposition, content]);

  useEffect(() => {
    if (!open) return;
    reposition();
    const onScroll = () => reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, reposition]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  if (disabled || content == null || content === false || content === "") {
    return <>{children}</>;
  }

  return (
    <span
      ref={wrapRef}
      className={`inline-flex max-w-full min-w-0 ${className}`}
      onMouseEnter={() => {
        clearTimer();
        timerRef.current = window.setTimeout(() => setOpen(true), delayMs);
      }}
      onMouseLeave={() => {
        clearTimer();
        setOpen(false);
        setCoords(null);
      }}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      aria-describedby={open ? tooltipId : undefined}
    >
      {children}
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            id={tooltipId}
            role="tooltip"
            style={{
              position: "fixed",
              top: coords?.top ?? -9999,
              left: coords?.left ?? -9999,
              width: coords?.width ?? MAX_WIDTH,
              visibility: coords ? "visible" : "hidden",
            }}
            className="z-[300] pointer-events-none rounded-xl border border-border bg-card px-3 py-2 text-left shadow-lg shadow-slate-900/12 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="text-[11px] leading-relaxed font-medium text-foreground/90">
              {content}
            </div>
          </div>,
          document.body
        )}
    </span>
  );
}
