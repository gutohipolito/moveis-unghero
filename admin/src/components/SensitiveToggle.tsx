"use client";

import React from "react";
import { usePrivacy } from "@/context/PrivacyContext";
import { Eye, EyeOff } from "lucide-react";

/**
 * Botão de olho que controla a exibição de dados sensíveis do cliente
 * (telefone, e-mail, CPF/CNPJ). Os dados vêm OCULTOS por padrão.
 */
export default function SensitiveToggle() {
  const { sensitiveHidden, toggleSensitive } = usePrivacy();

  return (
    <button
      onClick={toggleSensitive}
      type="button"
      className="inline-flex items-center justify-center p-2 rounded-xl bg-white hover:bg-slate-50 text-muted-foreground hover:text-foreground border border-border shadow-xs transition-all duration-200 cursor-pointer group"
      title={sensitiveHidden ? "Mostrar dados sensíveis (telefone, e-mail, CPF/CNPJ)" : "Ocultar dados sensíveis"}
    >
      {sensitiveHidden ? (
        <EyeOff className="h-4.5 w-4.5 text-primary group-hover:scale-105 transition-transform" />
      ) : (
        <Eye className="h-4.5 w-4.5 group-hover:scale-105 transition-transform" />
      )}
    </button>
  );
}
