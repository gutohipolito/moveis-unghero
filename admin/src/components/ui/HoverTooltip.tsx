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

function canUseHoverTooltips(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

/**
 * Tooltip de hover do sistema (não usa title nativo do navegador).
 * Em touch/mobile não abre no tap — evita tooltip “preso” após selecionar.
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
  const hoverOkRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const close = useCallback(() => {
    clearTimer();
    setOpen(false);
    setCoords(null);
  }, [clearTimer]);

  const reposition = useCallback(() => {
    const anchor = wrapRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return;
    const rect = anchor.getBoundingClientRect();
    // Âncora fora da tela / desmontando — não mostra tooltip “solto”
    if (rect.width === 0 && rect.height === 0) {
      setCoords(null);
      return;
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(MAX_WIDTH, vw - MARGIN * 2);
    const panelH = panel.offsetHeight;
    if (panelH < 4) return;

    let left = rect.left + rect.width / 2 - width / 2;
    left = Math.min(left, vw - width - MARGIN);
    left = Math.max(MARGIN, left);

    let placement: "top" | "bottom" = side;
    let top =
      placement === "top" ? rect.top - GAP - panelH : rect.bottom + GAP;

    if (placement === "top" && top < MARGIN) {
      placement = "bottom";
      top = rect.bottom + GAP;
    } else if (placement === "bottom" && top + panelH > vh - MARGIN) {
      const above = rect.top - GAP - panelH;
      if (above >= MARGIN) {
        placement = "top";
        top = above;
      }
    }

    setCoords({ top, left, width, placement });
  }, [side]);

  useEffect(() => {
    hoverOkRef.current = canUseHoverTooltips();
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => {
      hoverOkRef.current = mq.matches;
      if (!mq.matches) close();
    };
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [close]);

  useLayoutEffect(() => {
    if (!open) return;
    reposition();
    const id = window.requestAnimationFrame(() => reposition());
    return () => window.cancelAnimationFrame(id);
  }, [open, reposition, content]);

  useEffect(() => {
    if (!open) return;
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
        if (!hoverOkRef.current) return;
        clearTimer();
        timerRef.current = window.setTimeout(() => setOpen(true), delayMs);
      }}
      onMouseLeave={() => {
        close();
      }}
      onPointerDown={() => {
        // Clique/tap: nunca deixa tooltip preso após interação
        close();
      }}
      aria-describedby={open && coords ? tooltipId : undefined}
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
              top: coords?.top ?? 0,
              left: coords?.left ?? 0,
              width: coords?.width ?? MAX_WIDTH,
              opacity: coords ? 1 : 0,
              pointerEvents: "none",
            }}
            className="z-[300] rounded-xl border border-border bg-card px-3 py-2 text-left shadow-lg shadow-slate-900/12"
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
