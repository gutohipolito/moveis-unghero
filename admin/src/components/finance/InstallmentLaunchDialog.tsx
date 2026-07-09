"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import {
  createInstallment,
  createInstallmentPlan,
} from "@/app/actions/operations";
import { labelProjectStatus } from "@/lib/navLabels";
import {
  PAYMENT_METHOD_OPTIONS,
  type PaymentMethod,
  getPaymentMethodAlertDays,
} from "@/lib/paymentMethods";
import { Loader2, Plus } from "lucide-react";

export interface InstallmentProjectOption {
  id: string;
  status_geral: string;
  valor_previsto: number;
}

interface InstallmentLaunchDialogProps {
  open: boolean;
  onClose: () => void;
  projects: InstallmentProjectOption[];
  onSuccess: () => void | Promise<void>;
}

function defaultDueDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().split("T")[0];
}

export default function InstallmentLaunchDialog({
  open,
  onClose,
  projects,
  onSuccess,
}: InstallmentLaunchDialogProps) {
  const [mode, setMode] = useState<"unica" | "plano">("plano");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    projectId: projects[0]?.id ?? "",
    valor: "",
    valorTotal: "",
    quantidade: "3",
    data_vencimento: defaultDueDate(),
    intervalo_dias: "30",
    tipo: "PARCELA" as "ENTRADA" | "PARCELA",
    metodo_pagamento: "PIX" as PaymentMethod,
    primeira_eh_entrada: true,
  });

  const valorParcelaPreview = useMemo(() => {
    const total = Number(form.valorTotal);
    const qtd = Number(form.quantidade);
    if (!total || !qtd || qtd <= 0) return null;
    return Math.round((total / qtd) * 100) / 100;
  }, [form.valorTotal, form.quantidade]);

  const alertDays = getPaymentMethodAlertDays(form.metodo_pagamento);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.projectId) return;

    setSubmitting(true);
    setError(null);

    let ok = false;

    if (mode === "unica") {
      const res = await createInstallment(form.projectId, {
        valor: Number(form.valor),
        data_vencimento: form.data_vencimento,
        tipo: form.tipo,
        metodo_pagamento: form.metodo_pagamento,
      });
      ok = res.success;
      if (!res.success) setError(res.error ?? "Não foi possível lançar a parcela.");
    } else {
      const res = await createInstallmentPlan(form.projectId, {
        valor_total: Number(form.valorTotal),
        quantidade_parcelas: Number(form.quantidade),
        primeira_data_vencimento: form.data_vencimento,
        metodo_pagamento: form.metodo_pagamento,
        intervalo_dias: Number(form.intervalo_dias) || 30,
        primeira_eh_entrada: form.primeira_eh_entrada,
      });
      ok = res.success;
      if (!res.success) setError(res.error ?? "Não foi possível criar o plano.");
    }

    setSubmitting(false);

    if (ok) {
      onClose();
      await onSuccess();
    }
  }

  return (
    <Dialog isOpen={open} onClose={onClose} className="max-w-lg w-full">
      <div className="space-y-4 pr-6">
        <div>
          <h3 className="text-lg font-bold text-foreground">Lançar parcelas</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Informe o método de pagamento e o número de parcelas. O painel avisa com antecedência
            (boleto: 5 dias, PIX/dinheiro: 3 dias, cartão: 1 dia).
          </p>
        </div>

        <div className="flex gap-1 p-1 bg-slate-100 rounded-lg text-xs font-bold">
          <button
            type="button"
            className={`flex-1 py-1.5 rounded-md transition-all ${mode === "plano" ? "bg-white shadow-xs text-foreground" : "text-muted-foreground"}`}
            onClick={() => setMode("plano")}
          >
            Plano parcelado
          </button>
          <button
            type="button"
            className={`flex-1 py-1.5 rounded-md transition-all ${mode === "unica" ? "bg-white shadow-xs text-foreground" : "text-muted-foreground"}`}
            onClick={() => setMode("unica")}
          >
            Parcela única
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground block">Projeto</label>
            <Select
              required
              value={form.projectId}
              onChange={(e) => setForm({ ...form, projectId: e.target.value })}
              className="border-border bg-slate-50 text-sm w-full"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  #{project.id.slice(0, 8).toUpperCase()} · {labelProjectStatus(project.status_geral)} ·{" "}
                  {Number(project.valor_previsto).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                    maximumFractionDigits: 0,
                  })}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground block">Forma de pagamento</label>
            <Select
              value={form.metodo_pagamento}
              onChange={(e) =>
                setForm({ ...form, metodo_pagamento: e.target.value as PaymentMethod })
              }
              className="border-border bg-slate-50 text-sm w-full"
            >
              {PAYMENT_METHOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} — alerta {opt.alertDaysBefore}d antes
                </option>
              ))}
            </Select>
            <p className="text-[10px] text-muted-foreground">
              Você será avisado até {alertDays} dia{alertDays === 1 ? "" : "s"} antes do vencimento.
            </p>
          </div>

          {mode === "plano" ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground block">Valor total (R$)</label>
                  <Input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.valorTotal}
                    onChange={(e) => setForm({ ...form, valorTotal: e.target.value })}
                    className="border-border bg-slate-50 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground block">Nº de parcelas</label>
                  <Input
                    required
                    type="number"
                    min="1"
                    max="60"
                    value={form.quantidade}
                    onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
                    className="border-border bg-slate-50 text-sm"
                  />
                </div>
              </div>

              {valorParcelaPreview ? (
                <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  Serão criadas <strong>{form.quantidade}</strong> parcelas de{" "}
                  <strong>
                    {valorParcelaPreview.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </strong>{" "}
                  via {PAYMENT_METHOD_OPTIONS.find((m) => m.value === form.metodo_pagamento)?.label}.
                </p>
              ) : null}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground block">1º vencimento</label>
                  <Input
                    required
                    type="date"
                    value={form.data_vencimento}
                    onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })}
                    className="border-border bg-slate-50 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground block">Intervalo (dias)</label>
                  <Input
                    required
                    type="number"
                    min="1"
                    max="365"
                    value={form.intervalo_dias}
                    onChange={(e) => setForm({ ...form, intervalo_dias: e.target.value })}
                    className="border-border bg-slate-50 text-sm"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.primeira_eh_entrada}
                  onChange={(e) => setForm({ ...form, primeira_eh_entrada: e.target.checked })}
                  className="rounded border-border"
                />
                Primeira parcela é entrada / sinal
              </label>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground block">Valor (R$)</label>
                <Input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                  className="border-border bg-slate-50 text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground block">Vencimento</label>
                  <Input
                    required
                    type="date"
                    value={form.data_vencimento}
                    onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })}
                    className="border-border bg-slate-50 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground block">Tipo</label>
                  <Select
                    value={form.tipo}
                    onChange={(e) =>
                      setForm({ ...form, tipo: e.target.value as "ENTRADA" | "PARCELA" })
                    }
                    className="border-border bg-slate-50 text-sm w-full"
                  >
                    <option value="PARCELA">Parcela</option>
                    <option value="ENTRADA">Entrada / Sinal</option>
                  </Select>
                </div>
              </div>
            </>
          )}

          {error ? <p className="text-xs text-destructive font-medium">{error}</p> : null}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="text-xs font-bold"
              disabled={submitting}
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting} className="font-bold btn-metallic gap-1.5">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {submitting ? "Salvando..." : mode === "plano" ? "Criar plano" : "Lançar parcela"}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
