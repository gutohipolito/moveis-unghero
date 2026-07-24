"use client";

import { useEffect, useState } from "react";
import { Eye, Loader2, MonitorSmartphone, Smartphone } from "lucide-react";
import {
  getProjectQuoteViewHistory,
  type QuoteViewHistoryItem,
} from "@/app/actions/quoteViews";

function formatWhen(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const time = date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (sameDay) return `Hoje · ${time}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  if (isYesterday) return `Ontem · ${time}`;

  return `${date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  })} · ${time}`;
}

function DeviceIcon({ device }: { device: string | null }) {
  if (device === "Mobile" || device === "Tablet") {
    return <Smartphone className="h-3 w-3 shrink-0 opacity-70" />;
  }
  return <MonitorSmartphone className="h-3 w-3 shrink-0 opacity-70" />;
}

export default function KanbanCardQuoteViews({
  projectId,
  active,
}: {
  projectId: string;
  active: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<QuoteViewHistoryItem[]>([]);
  const [neverOpened, setNeverOpened] = useState(false);
  const [sharedAt, setSharedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!active || loaded) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    void getProjectQuoteViewHistory(projectId).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (!res.success) {
        setError(res.error || "Falha ao carregar.");
        return;
      }
      setItems(res.items || []);
      setNeverOpened(Boolean(res.neverOpened));
      setSharedAt(res.sharedAt ?? null);
      setLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [active, loaded, projectId]);

  if (!active) return null;

  if (loading && !loaded) {
    return (
      <div className="flex items-center justify-center gap-2 py-4 text-[10px] text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Carregando aberturas…
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-[10px] text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-2 py-2">
        {error}
      </p>
    );
  }

  if (neverOpened && items.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 space-y-1">
        <p className="text-[10px] font-bold text-amber-900 flex items-center gap-1">
          <Eye className="h-3 w-3" />
          Proposta ainda não aberta
        </p>
        <p className="text-[9px] text-amber-800/90 leading-snug">
          O link foi enviado
          {sharedAt
            ? ` em ${new Date(sharedAt).toLocaleDateString("pt-BR")}`
            : ""}
          , mas o cliente ainda não acessou.
        </p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-[10px] text-muted-foreground bg-slate-50 border border-border rounded-lg px-2 py-2">
        Nenhuma abertura registrada ainda. O histórico aparece quando o cliente abrir o link.
      </p>
    );
  }

  return (
    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-1.5 rounded-lg border border-border/70 bg-white px-2 py-1.5"
        >
          <DeviceIcon device={item.device} />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold text-foreground leading-tight truncate">
              {item.deviceLabel}
            </p>
            <p className="text-[9px] text-muted-foreground mt-0.5 truncate">
              {formatWhen(item.viewedAt)}
              <span className="text-muted-foreground/70"> · {item.quoteLabel}</span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
