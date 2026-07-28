"use client";

import { usePrivacy, PRIVACY_REVEAL_MS } from "@/context/PrivacyContext";
import HoverTooltip from "@/components/ui/HoverTooltip";
import { ContactRound, ShieldOff } from "lucide-react";

function revealSecondsLabel() {
  return Math.round(PRIVACY_REVEAL_MS / 1000);
}

/**
 * Dados sensíveis (telefone, e-mail, CPF/CNPJ).
 * Ícone e cor diferentes do toggle de valores financeiros.
 */
export default function SensitiveToggle() {
  const { sensitiveHidden, toggleSensitive, privacyLocked } = usePrivacy();

  const label = privacyLocked
    ? "Conta somente leitura: dados sensíveis sempre ocultos"
    : sensitiveHidden
      ? `Mostrar telefone, e-mail e documento — oculta de novo em ${revealSecondsLabel()}s`
      : "Ocultar dados sensíveis";

  const icon = sensitiveHidden ? (
    <ShieldOff className="h-4 w-4 text-sky-700" strokeWidth={2} />
  ) : (
    <ContactRound className="h-4 w-4 text-sky-600" strokeWidth={2} />
  );

  if (privacyLocked) {
    return (
      <HoverTooltip content={label} delayMs={80} side="bottom">
        <span
          className="notification-trigger cursor-not-allowed opacity-60"
          aria-label={label}
        >
          <ShieldOff className="h-4 w-4" strokeWidth={2} />
        </span>
      </HoverTooltip>
    );
  }

  return (
    <HoverTooltip content={label} delayMs={80} side="bottom">
      <button
        type="button"
        onClick={toggleSensitive}
        className="notification-trigger"
        aria-label={label}
        aria-pressed={!sensitiveHidden}
      >
        {icon}
      </button>
    </HoverTooltip>
  );
}
