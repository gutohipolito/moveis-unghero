"use client";

import { useEffect } from "react";

const RELOAD_KEY = "mu_chunk_reload";

export default function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Falha silenciosa — PWA ainda funciona via manifest em alguns browsers
    });
  }, []);

  // Após deploy, HTML antigo pode pedir chunks CSS/JS que já não existem (404).
  useEffect(() => {
    function onChunkError(event: ErrorEvent) {
      const target = event.target;
      if (!(target instanceof HTMLLinkElement) && !(target instanceof HTMLScriptElement)) {
        return;
      }

      const href = target instanceof HTMLLinkElement ? target.href : target.src;
      if (!href || !href.includes("/_next/static/")) return;

      try {
        if (sessionStorage.getItem(RELOAD_KEY) === "1") return;
        sessionStorage.setItem(RELOAD_KEY, "1");
      } catch {
        return;
      }

      window.location.reload();
    }

    function clearReloadFlag() {
      try {
        sessionStorage.removeItem(RELOAD_KEY);
      } catch {
        // ignore
      }
    }

    // Se a página carregou ok, libera um novo reload futuro.
    clearReloadFlag();
    window.addEventListener("error", onChunkError, true);
    return () => window.removeEventListener("error", onChunkError, true);
  }, []);

  return null;
}
