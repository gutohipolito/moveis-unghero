"use client";

import { useCallback, useState } from "react";
import type { ActionDialogVariant } from "@/components/ActionDialog";

interface DialogState {
  variant: ActionDialogVariant;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void | Promise<void>;
}

export function useActionDialog() {
  const [state, setState] = useState<DialogState | null>(null);
  const [loading, setLoading] = useState(false);

  const close = useCallback(() => {
    if (!loading) setState(null);
  }, [loading]);

  const showSuccess = useCallback((title: string, message: string) => {
    setState({ variant: "success", title, message });
  }, []);

  const showError = useCallback((title: string, message: string) => {
    setState({ variant: "error", title, message });
  }, []);

  const confirmAction = useCallback(
    (options: {
      title: string;
      message: string;
      confirmLabel?: string;
      cancelLabel?: string;
      onConfirm: () => void | Promise<void>;
    }) => {
      setState({
        variant: "confirm",
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel,
        cancelLabel: options.cancelLabel,
        onConfirm: options.onConfirm,
      });
    },
    []
  );

  const handleConfirm = useCallback(async () => {
    if (!state?.onConfirm) return;

    setLoading(true);
    try {
      await state.onConfirm();
    } finally {
      setLoading(false);
      setState((current) => (current?.variant === "confirm" ? null : current));
    }
  }, [state]);

  return {
    state,
    loading,
    close,
    showSuccess,
    showError,
    confirmAction,
    handleConfirm,
  };
}
