"use client";

import React from "react";
import { usePrivacy, PRIVACY_REVEAL_MS } from "@/context/PrivacyContext";
import { Eye, EyeOff } from "lucide-react";

function revealSecondsLabel() {
  return Math.round(PRIVACY_REVEAL_MS / 1000);
}

/**
 * Botão de olho que controla a exibição de dados sensíveis do cliente
 * (telefone, e-mail, CPF/CNPJ). Os dados vêm OCULTOS por padrão e voltam
 * a ocultar após a revelação temporária.
 */
export default function SensitiveToggle() {
  const { sensitiveHidden, toggleSensitive, privacyLocked } = usePrivacy();

  if (privacyLocked) {
    return (
      <span
        className="inline-flex items-center justify-center p-2 rounded-xl bg-slate-100 text-slate-400 border border-border shadow-xs cursor-not-allowed"
        title="Conta somente leitura: dados sensíveis sempre ocultos"
      >
        <EyeOff className="h-4.5 w-4.5" />
      </span>
    );
  }

  return (
    <button
      onClick={toggleSensitive}
      type="button"
      className="inline-flex items-center justify-center p-2 rounded-xl bg-white hover:bg-slate-50 text-muted-foreground hover:text-foreground border border-border shadow-xs transition-all duration-200 cursor-pointer group"
      title={
        sensitiveHidden
          ? `Mostrar dados sensíveis (telefone, e-mail, CPF/CNPJ) — oculta de novo em ${revealSecondsLabel()}s`
          : "Ocultar dados sensíveis"
      }
    >
      {sensitiveHidden ? (
        <EyeOff className="h-4.5 w-4.5 text-primary group-hover:scale-105 transition-transform" />
      ) : (
        <Eye className="h-4.5 w-4.5 group-hover:scale-105 transition-transform" />
      )}
    </button>
  );
}
