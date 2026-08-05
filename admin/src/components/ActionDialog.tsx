"use client";

import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, XCircle, Loader2 } from "lucide-react";

export type ActionDialogVariant = "confirm" | "success" | "error";

interface ActionDialogProps {
  open: boolean;
  variant: ActionDialogVariant;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  /** Tom do botão de confirmação (padrão: destructive). */
  confirmTone?: "destructive" | "primary";
  onConfirm?: () => void;
  onClose: () => void;
}

const VARIANT_CONFIG: Record<
  ActionDialogVariant,
  { icon: React.ComponentType<{ className?: string }>; iconClass: string; bgClass: string }
> = {
  confirm: {
    icon: AlertTriangle,
    iconClass: "text-amber-600",
    bgClass: "bg-amber-500/10",
  },
  success: {
    icon: CheckCircle2,
    iconClass: "text-emerald-600",
    bgClass: "bg-emerald-500/10",
  },
  error: {
    icon: XCircle,
    iconClass: "text-destructive",
    bgClass: "bg-destructive/10",
  },
};

export default function ActionDialog({
  open,
  variant,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  loading = false,
  confirmTone = "destructive",
  onConfirm,
  onClose,
}: ActionDialogProps) {
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;
  const isConfirm = variant === "confirm";

  return (
    <Dialog isOpen={open} onClose={loading ? () => {} : onClose} className="max-w-md">
      <div className="flex flex-col items-center text-center gap-4 pt-2 pb-1">
        <div className={`p-3 rounded-2xl ${config.bgClass}`}>
          <Icon className={`h-8 w-8 ${config.iconClass}`} />
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{message}</p>
        </div>

        <div className={`flex gap-3 w-full pt-2 ${isConfirm ? "" : "justify-center"}`}>
          {isConfirm ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="flex-1 font-semibold"
                onClick={onClose}
                disabled={loading}
              >
                {cancelLabel}
              </Button>
              <Button
                type="button"
                variant={confirmTone === "primary" ? "default" : "destructive"}
                className={`flex-1 font-semibold${confirmTone === "primary" ? " btn-metallic" : ""}`}
                onClick={onConfirm}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  confirmLabel
                )}
              </Button>
            </>
          ) : (
            <Button type="button" className="min-w-[8rem] font-semibold btn-metallic" onClick={onClose}>
              Entendi
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
