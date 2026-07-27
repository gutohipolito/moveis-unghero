"use client";

import React from "react";
import { usePrivacy } from "@/context/PrivacyContext";
import { Eye, EyeOff } from "lucide-react";

export default function PrivacyToggle() {
  const { privacyMode, togglePrivacy, privacyLocked } = usePrivacy();

  if (privacyLocked) {
    return (
      <span
        className="inline-flex items-center justify-center p-2 rounded-xl bg-slate-100 text-slate-400 border border-border shadow-xs cursor-not-allowed"
        title="Conta somente leitura: valores financeiros sempre ocultos"
      >
        <EyeOff className="h-4.5 w-4.5" />
      </span>
    );
  }

  return (
    <button
      onClick={togglePrivacy}
      type="button"
      className="inline-flex items-center justify-center p-2 rounded-xl bg-white hover:bg-slate-50 text-muted-foreground hover:text-foreground border border-border shadow-xs transition-all duration-200 cursor-pointer group"
      title={privacyMode ? "Mostrar valores financeiros (R$)" : "Ocultar valores financeiros (R$)"}
    >
      {privacyMode ? (
        <EyeOff className="h-4.5 w-4.5 text-primary group-hover:scale-105 transition-transform" />
      ) : (
        <Eye className="h-4.5 w-4.5 group-hover:scale-105 transition-transform" />
      )}
    </button>
  );
}
