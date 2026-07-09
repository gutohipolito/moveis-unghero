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
        className="modal-backdrop"
        aria-label="Fechar modal"
        tabIndex={-1}
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      <div className={cn("modal-viewport", fullscreen && "modal-viewport-fullscreen")}>
        <div
          className={cn(
            "modal-panel",
            fullscreen && "modal-panel-fullscreen",
            panelClassName
          )}
          onClick={(event) => event.stopPropagation()}
        >
          {showClose ? (
            <button
              type="button"
              onClick={onClose}
              className="modal-close-btn"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
          <div className={cn("modal-panel-body", bodyClassName)}>{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
}
