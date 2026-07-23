"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Loader2 } from "lucide-react";
import { approveQuote, rejectQuoteItems } from "@/app/actions/quotes";
import {
  computeApprovalValue,
  suggestProportionalDiscount,
} from "@/lib/quoteApproval";
import { isComparativeTemplate } from "@/lib/quoteTemplates";

export type ApprovalDialogItem = {
  id: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  status?: string | null;
};

interface QuoteApprovalDialogProps {
  open: boolean;
  onClose: () => void;
  quote: {
    id: string;
    project_id: string;
    versao: number;
    subtotal: number;
    desconto: number;
    clientName: string;
    template_tipo?: string | null;
    items: ApprovalDialogItem[];
  } | null;
  onApproved?: (result: {
    approvedItemIds: string[];
    valorAprovado: number;
    remainingPending: number;
  }) => void;
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val);
}

export default function QuoteApprovalDialog({
  open,
  onClose,
  quote,
  onApproved,
}: QuoteApprovalDialogProps) {
  const comparative = isComparativeTemplate(quote?.template_tipo);
  const pendingItems = useMemo(
    () => (quote?.items || []).filter((i) => !i.status || i.status === "PENDENTE"),
    [quote]
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [descontoText, setDescontoText] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !quote) return;
    if (comparative) {
      setSelected(new Set());
      setDescontoText("0");
    } else {
      const ids = new Set(pendingItems.map((i) => i.id));
      setSelected(ids);
      const selectedSubtotalInit = pendingItems.reduce(
        (s, i) => s + Number(i.valor_total),
        0
      );
      const suggested = suggestProportionalDiscount(
        Number(quote.desconto),
        Number(quote.subtotal),
        selectedSubtotalInit
      );
      setDescontoText(suggested.toFixed(2).replace(".", ","));
    }
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when dialog opens / quote changes
  }, [open, quote?.id, comparative]);

  const selectedItems = pendingItems.filter((i) => selected.has(i.id));
  const selectedSubtotal = selectedItems.reduce((s, i) => s + Number(i.valor_total), 0);
  const desconto = (() => {
    const cleaned = descontoText.replace(/\./g, "").replace(",", ".");
    const n = Number(cleaned);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  })();
  const valorAprovado = computeApprovalValue(selectedSubtotal, desconto);
  const suggested = quote
    ? suggestProportionalDiscount(
        Number(quote.desconto),
        Number(quote.subtotal),
        selectedSubtotal
      )
    : 0;

  const toggle = (id: string) => {
    if (comparative) {
      setSelected(new Set([id]));
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(pendingItems.map((i) => i.id)));
  const clearAll = () => setSelected(new Set());

  const applySuggestedDiscount = () => {
    setDescontoText(suggested.toFixed(2).replace(".", ","));
  };

  const handleApprove = async () => {
    if (!quote || selected.size === 0) {
      setError(comparative ? "Selecione a opção escolhida pelo cliente." : "Selecione ao menos um item.");
      return;
    }
    if (comparative && selected.size !== 1) {
      setError("Proposta comparativa: selecione exatamente uma opção.");
      return;
    }
    if (desconto > selectedSubtotal) {
      setError("Desconto maior que o subtotal selecionado.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await approveQuote(quote.project_id, quote.id, quote.versao, {
      itemIds: Array.from(selected),
      desconto,
    });
    setSaving(false);
    if (!res.success) {
      setError(res.error || "Não foi possível registrar a aprovação.");
      return;
    }
    onApproved?.({
      approvedItemIds: res.approvedItemIds || Array.from(selected),
      valorAprovado: res.valorAprovado ?? valorAprovado,
      remainingPending: res.remainingPending ?? 0,
    });
    onClose();
  };

  const handleRejectSelected = async () => {
    if (!quote || selected.size === 0) {
      setError("Selecione ao menos um item para recusar.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await rejectQuoteItems(
      quote.project_id,
      quote.id,
      quote.versao,
      Array.from(selected)
    );
    setSaving(false);
    if (!res.success) {
      setError(res.error || "Não foi possível recusar os itens.");
      return;
    }
    onApproved?.({
      approvedItemIds: [],
      valorAprovado: 0,
      remainingPending: pendingItems.length - selected.size,
    });
    onClose();
  };

  if (!quote) return null;

  return (
    <Dialog isOpen={open} onClose={onClose} className="max-w-2xl">
      <div className="p-5 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            {comparative ? "Aprovar opção escolhida" : "Registrar aprovação"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {comparative
              ? `${quote.clientName} · Proposta comparativa v${quote.versao}. Selecione a única opção fechada pelo cliente — as demais serão recusadas automaticamente.`
              : `${quote.clientName} · Proposta v${quote.versao}. Selecione os itens aprovados pelo cliente.`}
          </p>
        </div>

        {pendingItems.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Não há itens pendentes neste orçamento.
          </p>
        ) : (
          <>
            {!comparative ? (
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-primary font-semibold hover:underline"
                >
                  Selecionar todos
                </button>
                <span className="text-muted-foreground">·</span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-muted-foreground font-semibold hover:underline"
                >
                  Limpar
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-amber-800 bg-amber-500/10 border border-amber-500/20 rounded-md px-2.5 py-1.5 leading-snug">
                Escolha exclusiva: só a opção marcada entra em Aprovados. O PDF permanece no projeto e não vai para pendências comerciais.
              </p>
            )}

            <div className="max-h-64 overflow-y-auto rounded-xl border border-border/60 divide-y divide-border/40">
              {pendingItems.map((item) => {
                const checked = selected.has(item.id);
                return (
                  <label
                    key={item.id}
                    className={`flex items-start gap-3 p-3 cursor-pointer transition-colors ${
                      checked ? "bg-emerald-50/70" : "hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type={comparative ? "radio" : "checkbox"}
                      name={comparative ? "comparative-option" : undefined}
                      className="mt-1 h-4 w-4 accent-emerald-600"
                      checked={checked}
                      onChange={() => toggle(item.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {item.descricao}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Qtd {item.quantidade} · Unit. {formatCurrency(item.valor_unitario)}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-foreground shrink-0">
                      {formatCurrency(item.valor_total)}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="rounded-xl border border-border/60 bg-slate-50/80 p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {comparative ? "Valor da opção" : "Subtotal selecionado"}
                </span>
                <strong>{formatCurrency(selectedSubtotal)}</strong>
              </div>
              {!comparative ? (
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Desconto desta aprovação</span>
                    <p className="text-[11px] text-muted-foreground/80">
                      Sugerido proporcional: {formatCurrency(suggested)}{" "}
                      <button
                        type="button"
                        className="text-primary font-semibold hover:underline"
                        onClick={applySuggestedDiscount}
                      >
                        aplicar
                      </button>
                    </p>
                  </div>
                  <Input
                    value={descontoText}
                    onChange={(e) => setDescontoText(e.target.value)}
                    className="w-32 text-right h-9"
                    inputMode="decimal"
                  />
                </div>
              ) : null}
              <div className="flex justify-between text-sm border-t border-border/50 pt-3">
                <span className="font-semibold text-foreground">Valor aprovado</span>
                <strong className="text-emerald-700 text-base">
                  {formatCurrency(valorAprovado)}
                </strong>
              </div>
            </div>
          </>
        )}

        {error && (
          <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          {pendingItems.length > 0 && (
            <>
              {!comparative ? (
                <Button
                  type="button"
                  variant="outline"
                  className="border-rose-200 text-rose-700 hover:bg-rose-50"
                  onClick={handleRejectSelected}
                  disabled={saving || selected.size === 0}
                >
                  Recusar selecionados
                </Button>
              ) : null}
              <Button
                type="button"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleApprove}
                disabled={saving || selected.size === 0}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...
                  </>
                ) : comparative ? (
                  "Confirmar opção escolhida"
                ) : (
                  "Confirmar aprovação"
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </Dialog>
  );
}
