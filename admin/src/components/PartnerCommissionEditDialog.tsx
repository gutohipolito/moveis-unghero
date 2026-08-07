"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Pencil, RefreshCw } from "lucide-react";
import {
  getApprovedQuoteBase,
  updatePartnerCommission,
  type PartnerCommissionDTO,
} from "@/app/actions/partnerCommissions";
import { formatCurrencyBRL } from "@/lib/currencyExtenso";

type ConfirmFn = (options: {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
}) => void;

interface PartnerCommissionEditDialogProps {
  open: boolean;
  commission: PartnerCommissionDTO | null;
  onClose: () => void;
  confirmAction: ConfirmFn;
  showSuccess: (title: string, message: string) => void;
  showError: (title: string, message: string) => void;
  onUpdated: (commission: PartnerCommissionDTO) => void;
}

export default function PartnerCommissionEditDialog({
  open,
  commission,
  onClose,
  confirmAction,
  showSuccess,
  showError,
  onUpdated,
}: PartnerCommissionEditDialogProps) {
  const [percentual, setPercentual] = useState("5");
  const [dataPrevista, setDataPrevista] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [baseValor, setBaseValor] = useState(0);
  const [liveBase, setLiveBase] = useState<number | null>(null);
  const [loadingBase, setLoadingBase] = useState(false);
  const [refreshBase, setRefreshBase] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !commission) return;
    setPercentual(String(commission.percentual).replace(".", ","));
    setDataPrevista(commission.data_pagamento_prevista || "");
    setObservacoes(commission.observacoes || "");
    setBaseValor(commission.base_valor);
    setLiveBase(null);
    setRefreshBase(false);
    setError(null);
    setLoadingBase(true);
    void (async () => {
      const res = await getApprovedQuoteBase(commission.quote_id);
      setLoadingBase(false);
      if (res.success) setLiveBase(res.base);
    })();
  }, [open, commission]);

  const pct = Number(percentual.replace(",", "."));
  const effectiveBase = refreshBase && liveBase != null ? liveBase : baseValor;
  const previewValor = useMemo(() => {
    if (!Number.isFinite(pct) || pct <= 0) return 0;
    return Math.round(((effectiveBase * pct) / 100) * 100) / 100;
  }, [effectiveBase, pct]);

  const baseChanged =
    liveBase != null &&
    commission != null &&
    Math.abs(liveBase - commission.base_valor) >= 0.01;

  if (!open || !commission) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      setError("Informe um percentual válido (ex.: 5).");
      return;
    }

    const nextBase = refreshBase && liveBase != null ? liveBase : commission.base_valor;
    const nextValor = Math.round(((nextBase * pct) / 100) * 100) / 100;

    confirmAction({
      title: "Confirmar alteração da comissão?",
      message: `De ${commission.percentual}% · ${formatCurrencyBRL(commission.valor_comissao)} (base ${formatCurrencyBRL(commission.base_valor)}) para ${pct}% · ${formatCurrencyBRL(nextValor)} (base ${formatCurrencyBRL(nextBase)}).`,
      confirmLabel: "Salvar alterações",
      onConfirm: async () => {
        setSaving(true);
        setError(null);
        const res = await updatePartnerCommission({
          id: commission.id,
          percentual: pct,
          refreshBase: refreshBase || undefined,
          data_pagamento_prevista: dataPrevista || null,
          observacoes: observacoes || null,
        });
        setSaving(false);
        if (!res.success) {
          setError(res.error);
          showError("Não foi possível salvar", res.error);
          return;
        }
        onUpdated(res.commission);
        showSuccess("Comissão atualizada", "Percentual e valores foram recalculados.");
        onClose();
      },
    });
  };

  return (
    <Dialog isOpen={open} onClose={onClose} className="max-w-md w-full p-0 overflow-hidden">
      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="px-5 py-4 border-b border-border/60 bg-slate-50/80">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Pencil className="h-4 w-4 text-primary" />
            Editar comissão
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {commission.partner_nome} · {commission.cliente_nome} ·{" "}
            {commission.orcamento_codigo || `v${commission.orcamento_versao}`}
          </p>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="rounded-xl border border-border/60 bg-slate-50/60 px-3.5 py-3 space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-muted-foreground">Base congelada</span>
              <strong className="tabular-nums">{formatCurrencyBRL(commission.base_valor)}</strong>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-muted-foreground">Base atual do orçamento</span>
              <strong className="tabular-nums">
                {loadingBase
                  ? "…"
                  : liveBase != null
                    ? formatCurrencyBRL(liveBase)
                    : "—"}
              </strong>
            </div>
            {baseChanged ? (
              <label className="flex items-start gap-2 text-[11px] text-amber-900 bg-amber-50 border border-amber-200/70 rounded-lg px-2.5 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={refreshBase}
                  onChange={(e) => setRefreshBase(e.target.checked)}
                />
                <span className="leading-snug">
                  <span className="font-bold inline-flex items-center gap-1">
                    <RefreshCw className="h-3 w-3" /> Atualizar base
                  </span>{" "}
                  com as aprovações atuais (útil após aprovação parcial).
                </span>
              </label>
            ) : (
              <p className="text-[10px] text-muted-foreground leading-snug">
                A base do orçamento está igual à do lançamento.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Percentual (%)
            </label>
            <Input
              value={percentual}
              onChange={(e) => setPercentual(e.target.value)}
              inputMode="decimal"
              className="h-10 font-semibold"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Data prevista de pagamento
            </label>
            <Input
              type="date"
              value={dataPrevista}
              onChange={(e) => setDataPrevista(e.target.value)}
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Observações
            </label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
            />
          </div>

          <p className="text-xs font-semibold text-foreground tabular-nums">
            Valor previsto: {formatCurrencyBRL(previewValor)}
            {refreshBase ? " (com base atualizada)" : ""}
          </p>

          {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
        </div>

        <div className="px-5 py-3 border-t border-border/60 flex justify-end gap-2 bg-white">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" className="font-bold gap-2" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
            Salvar
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
