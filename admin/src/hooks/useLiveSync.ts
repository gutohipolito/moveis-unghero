"use client";

import { useEffect, useRef } from "react";

export const LIVE_SYNC_POLL_VISIBLE_MS = 15 * 1000;
export const LIVE_SYNC_POLL_HIDDEN_MS = 5 * 60 * 1000;
export const LIVE_SYNC_INITIAL_MS = 2 * 1000;

interface UseLiveSyncOptions {
  sync: () => void | Promise<void>;
  enabled?: boolean;
  pollVisibleMs?: number;
  pollHiddenMs?: number;
  initialDelayMs?: number;
}

/** Sincroniza dados em segundo plano enquanto a aba está aberta (multi-operador). */
export function useLiveSync({
  sync,
  enabled = true,
  pollVisibleMs = LIVE_SYNC_POLL_VISIBLE_MS,
  pollHiddenMs = LIVE_SYNC_POLL_HIDDEN_MS,
  initialDelayMs = LIVE_SYNC_INITIAL_MS,
}: UseLiveSyncOptions) {
  const syncRef = useRef(sync);
  syncRef.current = sync;

  useEffect(() => {
    if (!enabled) return;

    const run = () => {
      void syncRef.current();
    };

    const initialTimer = window.setTimeout(run, initialDelayMs);

    const tick = () => run();

    let interval = window.setInterval(
      tick,
      document.visibilityState === "visible" ? pollVisibleMs : pollHiddenMs
    );

    const onVisible = () => {
      window.clearInterval(interval);
      if (document.visibilityState === "visible") {
        run();
      }
      interval = window.setInterval(
        tick,
        document.visibilityState === "visible" ? pollVisibleMs : pollHiddenMs
      );
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, pollVisibleMs, pollHiddenMs, initialDelayMs]);
}
