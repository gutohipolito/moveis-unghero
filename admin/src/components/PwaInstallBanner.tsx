"use client";

import { Download, X } from "lucide-react";
import { usePwaInstall } from "@/hooks/usePwaInstall";

export default function PwaInstallBanner() {
  const { canInstall, isInstalled, installing, install, dismiss } = usePwaInstall();

  if (isInstalled || !canInstall) return null;

  return (
    <div className="pwa-install-banner" role="region" aria-label="Instalar aplicativo">
      <div className="pwa-install-banner-content">
        <Download className="h-4 w-4 text-primary shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">Instalar o painel</p>
          <p className="text-xs text-muted-foreground">
            Acesso rápido na área de trabalho ou tela inicial, como um app.
          </p>
        </div>
        <button
          type="button"
          onClick={() => install()}
          disabled={installing}
          className="pwa-install-banner-action"
        >
          {installing ? "Instalando..." : "Instalar"}
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="pwa-install-banner-dismiss"
          aria-label="Dispensar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
