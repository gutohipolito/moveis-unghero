"use client";

import React from "react";
import { usePrivacy } from "@/context/PrivacyContext";
import { Eye, EyeOff } from "lucide-react";

export default function PrivacyToggle() {
  const { privacyMode, togglePrivacy } = usePrivacy();

  return (
    <button
      onClick={togglePrivacy}
      type="button"
      className="inline-flex items-center justify-center p-2 rounded-xl bg-white hover:bg-slate-50 text-muted-foreground hover:text-foreground border border-border shadow-xs transition-all duration-200 cursor-pointer group"
      title={privacyMode ? "Mostrar valores financeiros" : "Ocultar valores financeiros (Modo Apresentação)"}
    >
      {privacyMode ? (
        <EyeOff className="h-4.5 w-4.5 text-primary group-hover:scale-105 transition-transform" />
      ) : (
        <Eye className="h-4.5 w-4.5 group-hover:scale-105 transition-transform" />
      )}
    </button>
  );
}
