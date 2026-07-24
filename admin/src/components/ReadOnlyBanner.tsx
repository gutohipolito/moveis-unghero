"use client";

import { usePermissions } from "@/context/PermissionsContext";
import { EyeOff } from "lucide-react";

/** Faixa discreta para contas VIEWER (somente leitura). */
export default function ReadOnlyBanner() {
  const { isReadOnly } = usePermissions();
  if (!isReadOnly) return null;

  return (
    <div className="mx-4 mt-3 mb-1 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
      <EyeOff className="h-3.5 w-3.5 shrink-0" />
      Conta somente leitura: você pode navegar, mas valores sensíveis ficam ocultos e ações (criar, editar, aprovar, PDF) estão bloqueadas.
    </div>
  );
}
