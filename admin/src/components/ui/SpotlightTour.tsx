"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export type SpotlightTourStep = {
  id: string;
  title: string;
  body: string;
  /** CSS selector within the modal (e.g. [data-tour-id="env-category"]) */
  target: string;
};

type SpotlightTourProps = {
  open: boolean;
  steps: SpotlightTourStep[];
  /** Root element that contains the targets (modal body). */
  rootRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onFinish: () => void;
};

type HoleRect = { top: number; left: number; width: number; height: number };

export default function SpotlightTour({
  open,
  steps,
  rootRef,
  onClose,
  onFinish,
}: SpotlightTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [hole, setHole] = useState<HoleRect | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) setStepIndex(0);
  }, [open]);

  const measure = useCallback(() => {
    if (!open || !rootRef.current) {
      setHole(null);
      return;
    }
    const step = steps[stepIndex];
    if (!step) {
      setHole(null);
      return;
    }
    const el = rootRef.current.querySelector(step.target) as HTMLElement | null;
    if (!el) {
      setHole(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    const pad = 8;
    setHole({
      top: rect.top - pad,
      left: rect.left - pad,
      width: rect.width + pad * 2,
      height: rect.height + pad * 2,
    });
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [open, rootRef, stepIndex, steps]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open, measure]);

  if (!mounted || !open || steps.length === 0) return null;

  const step = steps[stepIndex];
  const isLast = stepIndex >= steps.length - 1;
  const isFirst = stepIndex === 0;

  const cardTop =
    hole && hole.top + hole.height + 12 < window.innerHeight - 180
      ? hole.top + hole.height + 12
      : Math.max(16, (hole?.top ?? 80) - 160);

  const isNarrow =
    typeof window !== "undefined" && window.innerWidth < 768;

  const cardStyle: CSSProperties = isNarrow
    ? {
        left: 12,
        right: 12,
        bottom: "max(12px, env(safe-area-inset-bottom, 0px))",
        width: "auto",
        transform: "none",
      }
    : {
        top: cardTop,
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(340px, calc(100vw - 24px))",
      };

  const content: ReactNode = (
    <div className="fixed inset-0 z-[220]" role="dialog" aria-modal="true" aria-label="Tour guiado">
      {/* Dim via four panes around the hole so the target stays “vivo” */}
      {hole ? (
        <>
          <button
            type="button"
            aria-label="Fechar tour"
            className="absolute bg-black/60 cursor-default border-0 p-0"
            style={{ top: 0, left: 0, right: 0, height: Math.max(0, hole.top) }}
            onClick={onClose}
          />
          <button
            type="button"
            aria-label="Fechar tour"
            className="absolute bg-black/60 cursor-default border-0 p-0"
            style={{
              top: hole.top + hole.height,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            onClick={onClose}
          />
          <button
            type="button"
            aria-label="Fechar tour"
            className="absolute bg-black/60 cursor-default border-0 p-0"
            style={{
              top: hole.top,
              left: 0,
              width: Math.max(0, hole.left),
              height: hole.height,
            }}
            onClick={onClose}
          />
          <button
            type="button"
            aria-label="Fechar tour"
            className="absolute bg-black/60 cursor-default border-0 p-0"
            style={{
              top: hole.top,
              left: hole.left + hole.width,
              right: 0,
              height: hole.height,
            }}
            onClick={onClose}
          />
          <div
            className="pointer-events-none absolute rounded-xl ring-2 ring-amber-300/90 shadow-lg"
            style={{
              top: hole.top,
              left: hole.left,
              width: hole.width,
              height: hole.height,
            }}
          />
        </>
      ) : (
        <button
          type="button"
          aria-label="Fechar tour"
          className="absolute inset-0 bg-black/60 border-0 p-0 cursor-default"
          onClick={onClose}
        />
      )}

      <div
        className="absolute z-[221] rounded-xl border border-border bg-card p-4 shadow-xl"
        style={cardStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Passo {stepIndex + 1} de {steps.length}
            </p>
            <h4 className="text-sm font-bold text-foreground mt-0.5">{step.title}</h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:bg-muted cursor-pointer"
            aria-label="Fechar tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{step.body}</p>
          <div className="flex items-center justify-between gap-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer min-h-10 px-2 touch-manipulation"
          >
            Pular
          </button>
          <div className="flex gap-2">
            {!isFirst ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs font-semibold h-10 min-w-[5.5rem] touch-manipulation"
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
                Voltar
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              className="text-xs font-semibold h-10 min-w-[5.5rem] touch-manipulation"
              onClick={() => {
                if (isLast) {
                  onFinish();
                  return;
                }
                setStepIndex((i) => i + 1);
              }}
            >
              {isLast ? (
                "Entendi"
              ) : (
                <>
                  Próximo
                  <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
