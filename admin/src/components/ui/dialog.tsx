import * as React from "react";
import { cn } from "@/lib/utils";
import { ModalShell } from "@/components/ui/modal-shell";

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  viewportClassName?: string;
  closeClassName?: string;
  backdropClassName?: string;
  showClose?: boolean;
  closeOnBackdrop?: boolean;
  fullscreen?: boolean;
}

export function Dialog({
  isOpen,
  onClose,
  children,
  className,
  bodyClassName,
  viewportClassName,
  closeClassName,
  backdropClassName,
  showClose = true,
  closeOnBackdrop = true,
  fullscreen = false,
}: DialogProps) {
  return (
    <ModalShell
      open={isOpen}
      onClose={onClose}
      showClose={showClose}
      closeOnBackdrop={closeOnBackdrop}
      fullscreen={fullscreen}
      panelClassName={cn(!fullscreen && "w-full max-w-xl min-w-0", className)}
      bodyClassName={cn("min-w-0", bodyClassName)}
      viewportClassName={viewportClassName}
      closeClassName={closeClassName}
      backdropClassName={backdropClassName}
    >
      {children}
    </ModalShell>
  );
}
