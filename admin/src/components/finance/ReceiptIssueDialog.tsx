"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Receipt } from "lucide-react";
import {
  createPaymentReceipt,
} from "@/app/actions/receipts";
import { suggestReferenteFromInstallment } from "@/lib/receiptShare";
import {
  PAYMENT_METHOD_OPTIONS,
  type PaymentMethod,
} from "@/lib/paymentMethods";
import { toISODateBR } from "@/lib/brazilDate";
import { currencyToExtenso, formatCurrencyBRL } from "@/lib/currencyExtenso";

export type ReceiptIssuePrefill = {
  installmentId?: string;
  projectId?: string;
  valor?: number;
  metodo?: PaymentMethod | string;
  referente?: string;
  dataRecebimento?: string;
  quitacao?: "TOTAL" | "PARCIAL";
  tipo?: string;
  numero_parcela?: number | null;
  total_parcelas?: number | null;
  descricao?: string | null;
};

type ProjectOption = { id: string; label: string };

interface ReceiptIssueDialogProps {
  open: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  projects?: ProjectOption[];
  prefill?: ReceiptIssuePrefill | null;
  onIssued?: (receiptId: string) => void;
}

function parseMoneyInput(raw: string): number {
  const cleaned = raw
    .trim()
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

export default function ReceiptIssueDialog({
  open,
  onClose,
  clientId,
  clientName,
  projects = [],
  prefill,
  onIssued,
}: ReceiptIssueDialogProps) {
  const [valorText, setValorText] = useState("");
  const [referente, setReferente] = useState("");
  const [metodo, setMetodo] = useState<PaymentMethod>("PIX");
  const [dataRecebimento, setDataRecebimento] = useState(toISODateBR());
  const [quitacao, setQuitacao] = useState<"TOTAL" | "PARCIAL">("PARCIAL");
  const [projectId, setProjectId] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const suggested =
      prefill?.referente ||
      suggestReferenteFromInstallment({
        tipo: prefill?.tipo || "PARCELA",
        numero_parcela: prefill?.numero_parcela,
        total_parcelas: prefill?.total_parcelas,
        descricao: prefill?.descricao,
      });
    setValorText(
      prefill?.valor != null
        ? prefill.valor.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : ""
    );
    setReferente(suggested);
    const metodoPrefill = prefill?.metodo;
    setMetodo(
      metodoPrefill && PAYMENT_METHOD_OPTIONS.some((m) => m.value === metodoPrefill)
        ? (metodoPrefill as PaymentMethod)
        : "PIX"
    );
    setDataRecebimento(prefill?.dataRecebimento || toISODateBR());
    setQuitacao(prefill?.quitacao || (prefill?.installmentId ? "PARCIAL" : "PARCIAL"));
    setProjectId(prefill?.projectId || "");
    setObservacoes("");
    setError(null);
  }, [open, prefill]);

  const valor = useMemo(() => parseMoneyInput(valorText), [valorText]);
  const valorPreview =
    Number.isFinite(valor) && valor > 0
      ? `${formatCurrencyBRL(valor)} — ${currencyToExtenso(valor)}`
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!Number.isFinite(valor) || valor <= 0) {
      setError("Informe o valor recebido.");
      return;
    }
    if (!referente.trim()) {
      setError("Informe a que se refere o pagamento.");
      return;
    }

    setSaving(true);
    const res = await createPaymentReceipt({
      clientId,
      valor,
      referente: referente.trim(),
      metodo_pagamento:
        prefill?.installmentId &&
        !(prefill.metodo && PAYMENT_METHOD_OPTIONS.some((m) => m.value === prefill.metodo))
          ? undefined
          : metodo,
      data_recebimento: dataRecebimento,
      quitacao,
      projectId: projectId || prefill?.projectId || null,
      installmentId: prefill?.installmentId || null,
      observacoes: observacoes.trim() || null,
    });
    setSaving(false);

    if (!res.success) {
      setError(res.error);
      return;
    }

    onClose();
    onIssued?.(res.receipt.id);
    window.open(`/recibos/${res.receipt.id}/print`, "_blank", "noopener,noreferrer");
  }

  return (
    <Dialog isOpen={open} onClose={onClose} className="max-w-lg">
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-black text-foreground flex items-center gap-2">
            <Receipt className="h-5 w-5 text-amber-600" />
            Emitir recibo
          </h2>
          <p className="text-xs text-muted-foreground">
            Recebedor: <strong>Móveis Unghero LTDA</strong> (PJ). Pagador:{" "}
            <strong>{clientName}</strong>. O CPF/CNPJ do cliente será lido do cadastro.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Valor recebido *
          </label>
          <Input
            value={valorText}
            onChange={(e) => setValorText(e.target.value)}
            placeholder="0,00"
            inputMode="decimal"
            required
            autoFocus
          />
          {valorPreview ? (
            <p className="text-[10px] text-muted-foreground leading-snug">{valorPreview}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Referente a *
          </label>
          <Input
            value={referente}
            onChange={(e) => setReferente(e.target.value)}
            placeholder="Ex.: Parcela 2/5 — móveis planejados"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Forma de pagamento
            </label>
            <select
              value={metodo}
              onChange={(e) => setMetodo(e.target.value as PaymentMethod)}
              className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm"
            >
              {PAYMENT_METHOD_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Data do recebimento
            </label>
            <Input
              type="date"
              value={dataRecebimento}
              onChange={(e) => setDataRecebimento(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Quitação
            </label>
            <select
              value={quitacao}
              onChange={(e) => setQuitacao(e.target.value as "TOTAL" | "PARCIAL")}
              className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm"
            >
              <option value="PARCIAL">Parcial</option>
              <option value="TOTAL">Total</option>
            </select>
          </div>
          {!prefill?.installmentId && projects.length > 0 ? (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Projeto (opcional)
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm"
              >
                <option value="">Sem vínculo</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Observações (opcional)
          </label>
          <Input
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Ex.: PIX recebido às 14h"
          />
        </div>

        {error ? (
          <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-md px-3 py-2">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" className="btn-metallic gap-1.5" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
            Gerar recibo
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
