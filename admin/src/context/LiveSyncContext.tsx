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

const FALLBACK_POLL_VISIBLE_MS = 10_000;
const FALLBACK_POLL_HIDDEN_MS = 60_000;

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
      setConnection((current) => (current === "live" ? "live" : "polling"));
      return true;
    } catch {
      setConnection("offline");
      return false;
    }
  }, [applyVersions]);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let fallbackTimer: number | undefined;
    let closed = false;

    const startFallbackPolling = () => {
      if (fallbackTimer) return;

      const tick = () => {
        void fetchVersions();
      };

      fallbackTimer = window.setInterval(
        tick,
        document.visibilityState === "visible"
          ? FALLBACK_POLL_VISIBLE_MS
          : FALLBACK_POLL_HIDDEN_MS
      );
    };

    const connect = () => {
      if (closed || typeof EventSource === "undefined") {
        setConnection("polling");
        void fetchVersions();
        startFallbackPolling();
        return;
      }

      setConnection("connecting");
      eventSource = new EventSource("/api/live");

      eventSource.onopen = () => {
        setConnection("live");
      };

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as {
            type?: string;
            versions?: LiveVersions;
            changed?: LiveEntityKey[];
          };

          if (payload.type === "versions" && payload.versions) {
            applyVersions(payload.versions, payload.changed);
            setConnection("live");
          }
        } catch {
          // Ignora mensagens inválidas.
        }
      };

      eventSource.onerror = () => {
        eventSource?.close();
        eventSource = null;
        setConnection("polling");
        void fetchVersions();
        startFallbackPolling();
      };
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void fetchVersions();
        if (!eventSource && !fallbackTimer) {
          connect();
        }
      }
    };

    connect();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      closed = true;
      eventSource?.close();
      if (fallbackTimer) window.clearInterval(fallbackTimer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [applyVersions, companyId, fetchVersions]);

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
    initialDelayMs?: number;
  }
) {
  const { subscribe } = useLiveSyncContext();
  const syncRef = useRef(options.sync);
  const enabledRef = useRef(options.enabled ?? true);
  syncRef.current = options.sync;
  enabledRef.current = options.enabled ?? true;

  useEffect(() => {
    const initialTimer = window.setTimeout(() => {
      if (enabledRef.current) {
        void syncRef.current();
      }
    }, options.initialDelayMs ?? 2_000);

    const unsubscribe = subscribe({
      entity,
      enabled: () => enabledRef.current,
      sync: () => syncRef.current(),
    });

    return () => {
      window.clearTimeout(initialTimer);
      unsubscribe();
    };
  }, [entity, options.initialDelayMs, subscribe]);
}
