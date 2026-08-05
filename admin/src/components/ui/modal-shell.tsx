"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  panelClassName?: string;
  bodyClassName?: string;
  viewportClassName?: string;
  closeClassName?: string;
  backdropClassName?: string;
  showClose?: boolean;
  closeOnBackdrop?: boolean;
  fullscreen?: boolean;
}

export function ModalShell({
  open,
  onClose,
  children,
  panelClassName,
  bodyClassName,
  viewportClassName,
  closeClassName,
  backdropClassName,
  showClose = true,
  closeOnBackdrop = true,
  fullscreen = false,
}: ModalShellProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="modal-root" role="dialog" aria-modal="true">
      <button
        type="button"
        className={cn("modal-backdrop", backdropClassName)}
        aria-label="Fechar modal"
        tabIndex={-1}
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      <div className={cn("modal-viewport", fullscreen && "modal-viewport-fullscreen", viewportClassName)}>
        <div
          className={cn(
            "modal-panel",
            fullscreen && "modal-panel-fullscreen",
            panelClassName
          )}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            // Enter em input/select não deve submeter formulário nem ativar
            // o primeiro botão do modal (comportamento comum de operadores).
            if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
            const target = event.target as HTMLElement | null;
            if (!target) return;
            const tag = target.tagName;
            if (tag === "TEXTAREA" || target.isContentEditable) return;
            if (tag === "BUTTON" || tag === "A" || target.getAttribute("role") === "button") return;
            if (tag === "INPUT" || tag === "SELECT") {
              event.preventDefault();
            }
          }}
        >
          {showClose ? (
            <button
              type="button"
              onClick={onClose}
              className={cn("modal-close-btn", fullscreen && "modal-close-btn-fullscreen", closeClassName)}
              aria-label="Fechar"
            >
              <X className="h-4.5 w-4.5" strokeWidth={2.5} />
            </button>
          ) : null}
          <div className={cn("modal-panel-body", bodyClassName)}>{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
}
