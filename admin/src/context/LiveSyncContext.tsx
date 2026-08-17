"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { LiveEntityKey, LiveVersions } from "@/lib/liveEntities";
import { getChangedLiveEntities } from "@/lib/liveVersions";

// Polling curto no cliente (sem SSE persistente). Evita manter uma função
// serverless aberta o tempo todo na Vercel e permite o Neon escalar a zero
// quando ninguém está usando (abas ocultas usam intervalo bem maior).
const POLL_VISIBLE_MS = 50_000;
const POLL_HIDDEN_MS = 5 * 60_000;

type LiveSubscriber = {
  id: string;
  entity: LiveEntityKey;
  enabled: () => boolean;
  sync: () => void | Promise<void>;
};

interface LiveSyncContextValue {
  versions: Partial<LiveVersions>;
  connection: "connecting" | "live" | "polling" | "offline";
  subscribe: (subscriber: Omit<LiveSubscriber, "id">) => () => void;
}

const LiveSyncContext = createContext<LiveSyncContextValue | null>(null);

function createSubscriberId() {
  return `live-${Math.random().toString(36).slice(2)}`;
}

export function LiveSyncProvider({
  companyId,
  children,
}: {
  companyId: string;
  children: ReactNode;
}) {
  const [versions, setVersions] = useState<Partial<LiveVersions>>({});
  const [connection, setConnection] = useState<LiveSyncContextValue["connection"]>("connecting");
  const subscribersRef = useRef<LiveSubscriber[]>([]);
  const versionsRef = useRef<Partial<LiveVersions>>({});

  const notifySubscribers = useCallback((changed: LiveEntityKey[]) => {
    if (changed.length === 0) return;

    for (const subscriber of subscribersRef.current) {
      if (!changed.includes(subscriber.entity)) continue;
      if (!subscriber.enabled()) continue;
      void subscriber.sync();
    }
  }, []);

  const applyVersions = useCallback(
    (nextVersions: LiveVersions, changed?: LiveEntityKey[]) => {
      const entities =
        changed && changed.length > 0
          ? changed
          : getChangedLiveEntities(versionsRef.current, nextVersions);
      versionsRef.current = nextVersions;
      setVersions(nextVersions);
      if (entities.length > 0) {
        notifySubscribers(entities);
      }
    },
    [notifySubscribers]
  );

  const fetchVersions = useCallback(async () => {
    try {
      const response = await fetch("/api/live/versions", { cache: "no-store" });
      if (!response.ok) throw new Error("versions_fetch_failed");
      const data = (await response.json()) as { versions: LiveVersions };
      applyVersions(data.versions);
      setConnection("polling");
      return true;
    } catch {
      setConnection("offline");
      return false;
    }
  }, [applyVersions]);

  useEffect(() => {
    let timer: number | undefined;
    let closed = false;

    const schedule = () => {
      if (closed) return;
      if (timer) window.clearTimeout(timer);
      const delay =
        document.visibilityState === "visible" ? POLL_VISIBLE_MS : POLL_HIDDEN_MS;
      timer = window.setTimeout(tick, delay);
    };

    const tick = () => {
      if (closed) return;
      // Só consulta quando a aba está visível — abas ocultas ficam ociosas
      // para o Neon poder dormir e não gastar compute/execução à toa.
      if (document.visibilityState === "visible") {
        void fetchVersions();
      }
      schedule();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void fetchVersions();
        schedule();
      }
    };

    setConnection("polling");
    void fetchVersions();
    schedule();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      closed = true;
      if (timer) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [companyId, fetchVersions]);

  const subscribe = useCallback((subscriber: Omit<LiveSubscriber, "id">) => {
    const entry: LiveSubscriber = { ...subscriber, id: createSubscriberId() };
    subscribersRef.current = [...subscribersRef.current, entry];

    return () => {
      subscribersRef.current = subscribersRef.current.filter((item) => item.id !== entry.id);
    };
  }, []);

  const value = useMemo(
    () => ({
      versions,
      connection,
      subscribe,
    }),
    [versions, connection, subscribe]
  );

  return <LiveSyncContext.Provider value={value}>{children}</LiveSyncContext.Provider>;
}

export function useLiveSyncContext() {
  const context = useContext(LiveSyncContext);
  if (!context) {
    throw new Error("useLiveSyncContext deve ser usado dentro de LiveSyncProvider");
  }
  return context;
}

/** Inscreve uma tela/entidade na sincronização em tempo real. */
export function useLiveEntity(
  entity: LiveEntityKey,
  options: {
    sync: () => void | Promise<void>;
    enabled?: boolean;
    /** Delay antes do sync inicial. Ignorado se `skipInitialSync` for true. */
    initialDelayMs?: number;
    /** Não refetch no mount — use quando a tela já veio com dados SSR. */
    skipInitialSync?: boolean;
  }
) {
  const { subscribe } = useLiveSyncContext();
  const syncRef = useRef(options.sync);
  const enabledRef = useRef(options.enabled ?? true);
  syncRef.current = options.sync;
  enabledRef.current = options.enabled ?? true;

  useEffect(() => {
    let initialTimer: number | undefined;
    if (!options.skipInitialSync) {
      initialTimer = window.setTimeout(() => {
        if (enabledRef.current) {
          void syncRef.current();
        }
      }, options.initialDelayMs ?? 2_000);
    }

    const unsubscribe = subscribe({
      entity,
      enabled: () => enabledRef.current,
      sync: () => syncRef.current(),
    });

    return () => {
      if (initialTimer !== undefined) window.clearTimeout(initialTimer);
      unsubscribe();
    };
  }, [entity, options.initialDelayMs, options.skipInitialSync, subscribe]);
}
