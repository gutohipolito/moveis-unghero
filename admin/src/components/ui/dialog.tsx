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
  showClose?: boolean;
  closeOnBackdrop?: boolean;
}

export function Dialog({
  isOpen,
  onClose,
  children,
  className,
  bodyClassName,
  viewportClassName,
  showClose = true,
  closeOnBackdrop = true,
}: DialogProps) {
  return (
    <ModalShell
      open={isOpen}
      onClose={onClose}
      showClose={showClose}
      closeOnBackdrop={closeOnBackdrop}
      panelClassName={cn("w-full max-w-xl", className)}
      bodyClassName={bodyClassName}
      viewportClassName={viewportClassName}
    >
      {children}
    </ModalShell>
  );
}
