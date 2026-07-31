"use client";

import { useEffect } from "react";
import { TABLET_LAYOUT_MQ } from "@/hooks/useTabletLayout";
import { enterDocumentFullscreen, isDocumentFullscreen } from "@/lib/fullscreen";

const IMMERSIVE_TRIED_KEY = "mu_immersive_fs_session";

function isInstalledApp() {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    nav.standalone === true
  );
}

/**
 * No tablet (e no PWA instalado), tenta ocupar a tela inteira —
 * ocultando barras do navegador/sistema quando o browser permitir.
 *
 * - Android PWA: o manifest já pede `fullscreen`.
 * - Demais casos: Fullscreen API na abertura + 1º toque se o browser exigir gesto.
 * - O usuário também pode usar o botão “Tela cheia” no header.
 */
export default function PwaImmersiveMode() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const tablet = window.matchMedia(TABLET_LAYOUT_MQ).matches;
    const installed = isInstalledApp();
    if (!tablet && !installed) return;

    let cancelled = false;

    const tryEnter = async () => {
      if (cancelled || sessionStorage.getItem(IMMERSIVE_TRIED_KEY) === "1") {
        return;
      }
      if (isDocumentFullscreen()) {
        try {
          sessionStorage.setItem(IMMERSIVE_TRIED_KEY, "1");
        } catch {
          // ignore
        }
        return;
      }
      const ok = await enterDocumentFullscreen();
      if (ok) {
        try {
          sessionStorage.setItem(IMMERSIVE_TRIED_KEY, "1");
        } catch {
          // ignore
        }
      }
    };

    void tryEnter();

    const onFirstGesture = () => {
      void tryEnter().finally(() => {
        window.removeEventListener("pointerdown", onFirstGesture, true);
        window.removeEventListener("keydown", onFirstGesture, true);
      });
    };

    window.addEventListener("pointerdown", onFirstGesture, true);
    window.addEventListener("keydown", onFirstGesture, true);

    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", onFirstGesture, true);
      window.removeEventListener("keydown", onFirstGesture, true);
    };
  }, []);

  return null;
}
