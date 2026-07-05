"use client";

import ActionDialog from "@/components/ActionDialog";
import { useActionDialog } from "@/hooks/useActionDialog";

type ActionDialogController = ReturnType<typeof useActionDialog>;

export function ActionDialogHost({ dialog }: { dialog: ActionDialogController }) {
  const { state, loading, close, handleConfirm } = dialog;
  if (!state) return null;

  return (
    <ActionDialog
      open
      variant={state.variant}
      title={state.title}
      message={state.message}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      loading={loading}
      onConfirm={state.variant === "confirm" ? handleConfirm : undefined}
      onClose={close}
    />
  );
}

export { useActionDialog };
