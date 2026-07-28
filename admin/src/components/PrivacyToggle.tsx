"use client";

import { usePrivacy, PRIVACY_REVEAL_MS } from "@/context/PrivacyContext";
import HoverTooltip from "@/components/ui/HoverTooltip";
import { Banknote, BanknoteX } from "lucide-react";

function revealSecondsLabel() {
  return Math.round(PRIVACY_REVEAL_MS / 1000);
}

/** Olho de valores financeiros (R$) — ícone distinto do de dados pessoais. */
export default function PrivacyToggle() {
  const { privacyMode, togglePrivacy, privacyLocked } = usePrivacy();

  const label = privacyLocked
    ? "Conta somente leitura: valores financeiros sempre ocultos"
    : privacyMode
      ? `Mostrar valores (R$) — oculta de novo em ${revealSecondsLabel()}s`
      : "Ocultar valores financeiros (R$)";

  const icon = privacyMode ? (
    <BanknoteX className="h-4 w-4 text-amber-700" strokeWidth={2} />
  ) : (
    <Banknote className="h-4 w-4 text-emerald-600" strokeWidth={2} />
  );

  if (privacyLocked) {
    return (
      <HoverTooltip content={label} delayMs={80} side="bottom">
        <span
          className="notification-trigger cursor-not-allowed opacity-60"
          aria-label={label}
        >
          <BanknoteX className="h-4 w-4" strokeWidth={2} />
        </span>
      </HoverTooltip>
    );
  }

  return (
    <HoverTooltip content={label} delayMs={80} side="bottom">
      <button
        type="button"
        onClick={togglePrivacy}
        className="notification-trigger"
        aria-label={label}
        aria-pressed={!privacyMode}
      >
        {icon}
      </button>
    </HoverTooltip>
  );
}
