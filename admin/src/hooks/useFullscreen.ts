"use client";

import { useCallback, useEffect, useState } from "react";
import {
  canUseFullscreenApi,
  enterDocumentFullscreen,
  exitDocumentFullscreen,
  isDocumentFullscreen,
} from "@/lib/fullscreen";

export function useFullscreen() {
  const [supported, setSupported] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    setSupported(canUseFullscreenApi());
    setActive(isDocumentFullscreen());

    const sync = () => setActive(isDocumentFullscreen());
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync as EventListener);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener(
        "webkitfullscreenchange",
        sync as EventListener
      );
    };
  }, []);

  const enter = useCallback(async () => {
    const ok = await enterDocumentFullscreen();
    setActive(isDocumentFullscreen());
    return ok;
  }, []);

  const exit = useCallback(async () => {
    const ok = await exitDocumentFullscreen();
    setActive(isDocumentFullscreen());
    return ok;
  }, []);

  const toggle = useCallback(async () => {
    if (isDocumentFullscreen()) return exit();
    return enter();
  }, [enter, exit]);

  return { supported, active, enter, exit, toggle };
}
