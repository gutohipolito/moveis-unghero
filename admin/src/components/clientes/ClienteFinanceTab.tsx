"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import {
  type Payment,
  getClientPaymentsAction,
} from "@/app/actions/cliente";
import { createInstallment, payInstallment } from "@/app/actions/operations";
import { labelProjectStatus } from "@/lib/navLabels";
import type { ClientProjectSummary } from "@/components/clientes/ClienteProjectsTab";
import {
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  Plus,
} from "lucide-react";

interface ClienteFinanceTabProps {
  clientId: string;
  projects: ClientProjectSummary[];
  payments: Payment[];
  onPaymentsChange: (payments: Payment[]) => void;
  onGoToProjects?: () => void;
}

function defaultDueDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().split("T")[0];
}

export default function ClienteFinanceTab({
  clientId,
  projects,
  payments,
  onPaymentsChange,
  onGoToProjects,
}: ClienteFinanceTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    projectId: projects[0]?.id ?? "",
    valor: "",
    data_vencimento: defaultDueDate(),
    tipo: "PARCELA" as "ENTRADA" | "PARCELA",
  });

  async function refreshPayments() {
    const res = await getClientPaymentsAction(clientId);
    if (res.success) onPaymentsChange(res.payments);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.projectId || !form.valor || !form.data_vencimento) return;

    setSubmitting(true);
    setError(null);

    const res = await createInstallment(form.projectId, {
      valor: Number(form.valor),
      data_vencimento: form.data_vencimento,
      tipo: form.tipo,
    });

    setSubmitting(false);

    if (res.success) {
      setIsModalOpen(false);
      setForm({
        projectId: projects[0]?.id ?? "",
        valor: "",
        data_vencimento: defaultDueDate(),
        tipo: "PARCELA",
      });
      await refreshPayments();
    } else {
      setError(res.error ?? "Não foi possível lançar a parcela.");
    }
  }

  async function handleMarkPaid(payment: Payment) {
    setPayingId(payment.id);
    await payInstallment(payment.projectId, payment.id);
    await refreshPayments();
    setPayingId(null);
  }

  const canAdd = projects.length > 0;

  return (
    <>
      <Card className="p-5 glass-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-border/40 pb-3">
          <div className="space-y-1 min-w-0">
            <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
              <CreditCard className="h-4.5 w-4.5 text-primary" /> Histórico de Faturamento e Parcelas
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
              Lance entradas e parcelas após a <strong>aprovação do orçamento</strong> ou assinatura do contrato.
              Cada lançamento fica vinculado a um projeto e aparece também no módulo Financeiro.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-muted-foreground bg-slate-100 px-2.5 py-0.5 rounded-full">
              {payments.length} parcela{payments.length === 1 ? "" : "s"}
            </span>
            <Button
              type="button"
              className="text-xs font-bold gap-1.5 btn-metallic"
              disabled={!canAdd}
              onClick={() => {
                setError(null);
                setForm((prev) => ({
                  ...prev,
                  projectId: prev.projectId || projects[0]?.id || "",
                }));
                setIsModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Lançar parcela
            </Button>
          </div>
        </div>

        {!canAdd ? (
          <div className="p-8 text-center text-sm text-muted-foreground border-2 border-dashed border-border/60 rounded-2xl space-y-3">
            <p>Este cliente ainda não tem projetos. Crie um projeto antes de registrar parcelas.</p>
            {onGoToProjects ? (
              <Button type="button" variant="outline" className="text-xs font-bold" onClick={onGoToProjects}>
                Ir para Projetos
              </Button>
            ) : null}
          </div>
        ) : payments.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground border-2 border-dashed border-border/60 rounded-2xl space-y-3">
            <p>Nenhuma parcela lançada ainda.</p>
            <p className="text-xs">
              Você também pode cadastrar em{" "}
              <strong>Projetos → abrir projeto → Financeiro → Lançar Parcela</strong>.
            </p>
            <Button
              type="button"
              className="text-xs font-bold gap-1.5 btn-metallic"
              onClick={() => setIsModalOpen(true)}
            >
              <Plus className="h-4 w-4" /> Lançar primeira parcela
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map((pay) => {
              const isPaid = pay.status === "PAGO";
              const isLate = pay.status === "ATRASADO";

              return (
                <div
                  key={pay.id}
                  className="p-4 rounded-xl border border-border/50 bg-slate-50/50 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center hover:bg-slate-50 transition-all"
                >
                  <div className="space-y-1 min-w-0">
                    <strong className="text-sm font-bold text-foreground block">{pay.descricao}</strong>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>Vencimento: {new Date(pay.vencimento).toLocaleDateString("pt-BR")}</span>
                      <Link
                        href={`/projects/${pay.projectId}`}
                        className="inline-flex items-center gap-1 text-primary font-semibold hover:underline"
                      >
                        Ver projeto
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-right">
                      <span className="text-xs font-medium text-muted-foreground block">Valor</span>
                      <strong className="text-sm font-black text-foreground privacy-value">
                        {pay.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </strong>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <span
                        className={`text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full border text-center ${
                          isPaid
                            ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                            : isLate
                              ? "bg-rose-50 text-rose-600 border-rose-200"
                              : "bg-amber-50 text-amber-600 border-amber-200"
                        }`}
                      >
                        {pay.status}
                      </span>
                      {pay.pagoEm ? (
                        <span className="text-[9px] font-semibold text-emerald-600 text-center">
                          Pago em: {new Date(pay.pagoEm).toLocaleDateString("pt-BR")}
                        </span>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-[10px] font-bold h-7 px-2 gap-1"
                          disabled={payingId === pay.id}
                          onClick={() => handleMarkPaid(pay)}
                        >
                          {payingId === pay.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3" />
                          )}
                          Registrar pagamento
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Dialog isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} className="max-w-md w-full">
        <div className="space-y-4 pr-6">
          <div>
            <h3 className="text-lg font-bold text-foreground">Lançar parcela</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Vincule a um projeto do cliente. Ideal após fechamento comercial (status Aprovado ou posterior).
            </p>
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

            {error ? <p className="text-xs text-destructive font-medium">{error}</p> : null}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="text-xs font-bold"
                disabled={submitting}
                onClick={() => setIsModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="font-bold btn-metallic gap-1.5">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {submitting ? "Lançando..." : "Confirmar"}
              </Button>
            </div>
          </form>
        </div>
      </Dialog>
    </>
  );
}
