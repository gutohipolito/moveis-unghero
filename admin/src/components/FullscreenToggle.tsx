"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import HoverTooltip from "@/components/ui/HoverTooltip";
import { useFullscreen } from "@/hooks/useFullscreen";

/** Botão do header para entrar/sair da tela cheia (oculta barras do sistema/navegador). */
export default function FullscreenToggle() {
  const { supported, active, toggle } = useFullscreen();

  if (!supported) return null;

  const label = active
    ? "Sair da tela cheia"
    : "Tela cheia — ocultar barras do sistema";

  return (
    <HoverTooltip content={label} delayMs={80} side="bottom">
      <button
        type="button"
        onClick={() => {
          void toggle();
        }}
        className="notification-trigger"
        aria-label={label}
        aria-pressed={active}
        title={label}
      >
        {active ? (
          <Minimize2 className="h-4 w-4 text-primary" strokeWidth={2} />
        ) : (
          <Maximize2 className="h-4 w-4" strokeWidth={2} />
        )}
      </button>
    </HoverTooltip>
  );
}
