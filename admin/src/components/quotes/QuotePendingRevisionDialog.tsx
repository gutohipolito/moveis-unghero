"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, PencilLine } from "lucide-react";
import { revisePendingQuoteItems } from "@/app/actions/quotes";
import { toISODateBR } from "@/lib/brazilDate";

export type RevisionDialogItem = {
  id: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  status?: string | null;
};

interface QuotePendingRevisionDialogProps {
  open: boolean;
  onClose: () => void;
  quote: {
    id: string;
    project_id: string;
    versao: number;
    validade: string;
    clientName: string;
    items: RevisionDialogItem[];
  } | null;
  onRevised?: () => void;
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val);
}

function parseMoney(raw: string): number {
  const cleaned = raw.trim().replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

export default function QuotePendingRevisionDialog({
  open,
  onClose,
  quote,
  onRevised,
}: QuotePendingRevisionDialogProps) {
  const pendingItems = useMemo(
    () => (quote?.items || []).filter((i) => !i.status || i.status === "PENDENTE"),
    [quote]
  );
  const [rows, setRows] = useState<
    Record<string, { unit: string; total: string }>
  >({});
  const [validade, setValidade] = useState("");
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !quote) return;
    const next: Record<string, { unit: string; total: string }> = {};
    for (const item of pendingItems) {
      next[item.id] = {
        unit: Number(item.valor_unitario).toFixed(2).replace(".", ","),
        total: Number(item.valor_total).toFixed(2).replace(".", ","),
      };
    }
    setRows(next);
    setValidade(toISODateBR(quote.validade));
    setMotivo("");
    setError(null);
  }, [open, quote, pendingItems]);

  const handleSave = async () => {
    if (!quote) return;
    const items = pendingItems
      .map((item) => {
        const row = rows[item.id];
        if (!row) return null;
        const unit = parseMoney(row.unit);
        const total = parseMoney(row.total);
        if (!Number.isFinite(unit) || !Number.isFinite(total)) return null;
        if (
          unit === Number(item.valor_unitario) &&
          total === Number(item.valor_total)
        ) {
          return null;
        }
        return {
          id: item.id,
          valor_unitario: unit,
          valor_total: total,
        };
      })
      .filter(Boolean) as Array<{
      id: string;
      valor_unitario: number;
      valor_total: number;
    }>;

    if (items.length === 0 && validade === toISODateBR(quote.validade)) {
      setError("Altere ao menos um valor ou a validade.");
      return;
    }

    setSaving(true);
    setError(null);
    const res = await revisePendingQuoteItems({
      projectId: quote.project_id,
      quoteId: quote.id,
      version: quote.versao,
      validade: validade || undefined,
      motivo: motivo || undefined,
      items,
    });
    setSaving(false);
    if (!res.success) {
      setError(res.error || "Não foi possível revisar os itens.");
      return;
    }
    onRevised?.();
    onClose();
  };

  if (!quote) return null;

  return (
    <Dialog isOpen={open} onClose={onClose} className="max-w-2xl">
      <div className="p-5 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <PencilLine className="h-5 w-5 text-amber-600" />
            Revisar valores pendentes
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {quote.clientName} · Proposta v{quote.versao}. Itens já aprovados
            permanecem congelados.
          </p>
        </div>

        {pendingItems.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Não há itens pendentes para revisar.
          </p>
        ) : (
          <div className="max-h-72 overflow-y-auto rounded-xl border border-border/60 divide-y divide-border/40">
            {pendingItems.map((item) => (
              <div key={item.id} className="p-3 space-y-2">
                <div className="flex justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{item.descricao}</p>
                  <span className="text-xs text-muted-foreground shrink-0">
                    Atual: {formatCurrency(item.valor_total)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-muted-foreground">Unitário</label>
                    <Input
                      value={rows[item.id]?.unit || ""}
                      onChange={(e) =>
                        setRows((prev) => ({
                          ...prev,
                          [item.id]: {
                            unit: e.target.value,
                            total: prev[item.id]?.total || "",
                          },
                        }))
                      }
                      className="h-9"
                      inputMode="decimal"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">Total</label>
                    <Input
                      value={rows[item.id]?.total || ""}
                      onChange={(e) =>
                        setRows((prev) => ({
                          ...prev,
                          [item.id]: {
                            unit: prev[item.id]?.unit || "",
                            total: e.target.value,
                          },
                        }))
                      }
                      className="h-9"
                      inputMode="decimal"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Nova validade</label>
            <Input
              type="date"
              value={validade}
              onChange={(e) => setValidade(e.target.value)}
              className="h-9"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Motivo (opcional)</label>
            <Input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="h-9"
              placeholder="Ex.: reajuste de materiais"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || pendingItems.length === 0}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...
              </>
            ) : (
              "Salvar revisão"
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
