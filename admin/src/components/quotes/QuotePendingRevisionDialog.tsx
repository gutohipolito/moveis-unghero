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
  subitens?: string[] | null;
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

type RowState = {
  descricao: string;
  quantidade: string;
  detalhes: string;
  unit: string;
  total: string;
};

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

function normalizeSubitens(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
}

function parseDetalhes(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function sameSubitens(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((item, index) => item === b[index]);
}

function moneyEquals(a: number, b: number) {
  return Math.round(a * 100) === Math.round(b * 100);
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
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [validade, setValidade] = useState("");
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !quote) return;
    const next: Record<string, RowState> = {};
    for (const item of pendingItems) {
      next[item.id] = {
        descricao: item.descricao || "",
        quantidade: String(item.quantidade || 1),
        detalhes: normalizeSubitens(item.subitens).join(", "),
        unit: Number(item.valor_unitario).toFixed(2).replace(".", ","),
        total: Number(item.valor_total).toFixed(2).replace(".", ","),
      };
    }
    setRows(next);
    setValidade(toISODateBR(quote.validade));
    setMotivo("");
    setError(null);
  }, [open, quote, pendingItems]);

  const updateRow = (id: string, patch: Partial<RowState>) => {
    setRows((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        ...patch,
      },
    }));
  };

  const handleSave = async () => {
    if (!quote) return;

    const items: Array<{
      id: string;
      valor_unitario: number;
      valor_total: number;
      quantidade: number;
      descricao: string;
      subitens: string[];
    }> = [];

    for (const item of pendingItems) {
      const row = rows[item.id];
      if (!row) continue;

      const descricao = row.descricao.trim();
      const quantidade = Number.parseInt(row.quantidade, 10);
      const unit = parseMoney(row.unit);
      const total = parseMoney(row.total);
      const subitens = parseDetalhes(row.detalhes);
      const originalSubitens = normalizeSubitens(item.subitens);

      if (!descricao) {
        setError("Preencha a descrição de todos os itens editados.");
        return;
      }
      if (!Number.isFinite(quantidade) || quantidade < 1) {
        setError("Quantidade deve ser um número inteiro maior que zero.");
        return;
      }
      if (!Number.isFinite(unit) || !Number.isFinite(total)) {
        setError("Informe valores unitário e total válidos.");
        return;
      }

      const changed =
        descricao !== item.descricao ||
        quantidade !== Number(item.quantidade) ||
        !moneyEquals(unit, Number(item.valor_unitario)) ||
        !moneyEquals(total, Number(item.valor_total)) ||
        !sameSubitens(subitens, originalSubitens);

      if (!changed) continue;

      items.push({
        id: item.id,
        descricao,
        quantidade,
        valor_unitario: unit,
        valor_total: total,
        subitens,
      });
    }

    if (items.length === 0 && validade === toISODateBR(quote.validade)) {
      setError("Altere ao menos um item pendente ou a validade.");
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
      setError(res.error || "Não foi possível editar os itens.");
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
            Editar itens pendentes
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {quote.clientName} · Proposta v{quote.versao}. Altere cômodos/itens
            antes de aprovar, sem criar outra versão. Cada edição fica no
            histórico.
          </p>
        </div>

        {pendingItems.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Não há itens pendentes para editar.
          </p>
        ) : (
          <div className="max-h-[28rem] overflow-y-auto rounded-xl border border-border/60 divide-y divide-border/40">
            {pendingItems.map((item) => (
              <div key={item.id} className="p-3 space-y-2">
                <div className="flex justify-between gap-3">
                  <label className="text-[11px] text-muted-foreground">
                    Item / cômodo
                  </label>
                  <span className="text-xs text-muted-foreground shrink-0">
                    Atual: {formatCurrency(item.valor_total)}
                  </span>
                </div>
                <Input
                  value={rows[item.id]?.descricao || ""}
                  onChange={(e) => updateRow(item.id, { descricao: e.target.value })}
                  className="h-9 font-semibold"
                  placeholder="Ex.: Cozinha"
                />
                <div>
                  <label className="text-[11px] text-muted-foreground">
                    Detalhes (vírgula ou linha)
                  </label>
                  <textarea
                    value={rows[item.id]?.detalhes || ""}
                    onChange={(e) => updateRow(item.id, { detalhes: e.target.value })}
                    className="mt-1 w-full min-h-[64px] rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="Ex.: Torre de forno, ilha, nicho"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] text-muted-foreground">Qtd</label>
                    <Input
                      value={rows[item.id]?.quantidade || ""}
                      onChange={(e) =>
                        updateRow(item.id, { quantidade: e.target.value })
                      }
                      className="h-9"
                      inputMode="numeric"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">Unitário</label>
                    <Input
                      value={rows[item.id]?.unit || ""}
                      onChange={(e) => updateRow(item.id, { unit: e.target.value })}
                      className="h-9"
                      inputMode="decimal"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">Total</label>
                    <Input
                      value={rows[item.id]?.total || ""}
                      onChange={(e) => updateRow(item.id, { total: e.target.value })}
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
              placeholder="Ex.: cliente pediu troca no item da cozinha"
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
              "Salvar edição"
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
