"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const PUBLIC_ORIGINS = new Set([
  "https://moveisunghero.com.br",
  "https://www.moveisunghero.com.br",
]);

function resolveParentOrigin(): string | null {
  try {
    const ancestors = window.location.ancestorOrigins;
    if (ancestors && ancestors.length > 0) {
      const origin = ancestors[0];
      if (origin && PUBLIC_ORIGINS.has(origin)) return origin;
    }
  } catch {
    /* Safari antigo / sem ancestorOrigins */
  }

  try {
    if (document.referrer) {
      const origin = new URL(document.referrer).origin;
      if (PUBLIC_ORIGINS.has(origin)) return origin;
    }
  } catch {
    /* referrer inválido */
  }

  return null;
}

/** Avisa o wrapper HostGator para manter a URL pública alinhada à navegação. */
export default function ParceiroPublicFrameSync() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.parent === window) return;

    const search = window.location.search || "";
    const path = `${pathname}${search}`;
    const payload = { type: "unghero-parceiro-nav", path };
    const parentOrigin = resolveParentOrigin();

    // Só envia para a origem real do parent — evita erro www vs apex no console.
    if (parentOrigin) {
      window.parent.postMessage(payload, parentOrigin);
      return;
    }

    // Fallback seguro: parent valida event.origin === admin.
    window.parent.postMessage(payload, "*");
  }, [pathname]);

  return null;
}
