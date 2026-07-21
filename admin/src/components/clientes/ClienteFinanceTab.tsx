"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  type Payment,
  getClientPaymentsAction,
} from "@/app/actions/cliente";
import { payInstallment } from "@/app/actions/operations";
import InstallmentLaunchDialog from "@/components/finance/InstallmentLaunchDialog";
import ReceiptIssueDialog, {
  type ReceiptIssuePrefill,
} from "@/components/finance/ReceiptIssueDialog";
import {
  listClientPaymentReceipts,
  type PaymentReceiptDTO,
} from "@/app/actions/receipts";
import type { ClientProjectSummary } from "@/components/clientes/ClienteProjectsTab";
import { toISODateBR } from "@/lib/brazilDate";
import { labelPaymentMethod } from "@/lib/paymentMethods";
import {
  CheckCircle2,
  CreditCard,
  ExternalLink,
  FileText,
  Loader2,
  Plus,
  Receipt,
} from "lucide-react";

interface ClienteFinanceTabProps {
  clientId: string;
  clientName: string;
  projects: ClientProjectSummary[];
  payments: Payment[];
  onPaymentsChange: (payments: Payment[]) => void;
  onGoToProjects?: () => void;
}

export default function ClienteFinanceTab({
  clientId,
  clientName,
  projects,
  payments,
  onPaymentsChange,
  onGoToProjects,
}: ClienteFinanceTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptPrefill, setReceiptPrefill] = useState<ReceiptIssuePrefill | null>(null);
  const [receipts, setReceipts] = useState<PaymentReceiptDTO[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(true);

  async function refreshReceipts() {
    const res = await listClientPaymentReceipts(clientId);
    if (res.success) setReceipts(res.receipts);
    setLoadingReceipts(false);
  }

  useEffect(() => {
    let active = true;
    setLoadingReceipts(true);
    void listClientPaymentReceipts(clientId).then((res) => {
      if (!active) return;
      if (res.success) setReceipts(res.receipts);
      setLoadingReceipts(false);
    });
    return () => {
      active = false;
    };
  }, [clientId]);

  async function refreshPayments() {
    const res = await getClientPaymentsAction(clientId);
    if (res.success) onPaymentsChange(res.payments);
  }

  async function handleMarkPaid(payment: Payment) {
    setPayingId(payment.id);
    await payInstallment(payment.projectId, payment.id);
    await refreshPayments();
    setPayingId(null);
  }

  function openAvulsoReceipt() {
    setReceiptPrefill({
      referente: "Pagamento referente a móveis planejados",
      quitacao: "PARCIAL",
    });
    setReceiptOpen(true);
  }

  function openInstallmentReceipt(pay: Payment) {
    setReceiptPrefill({
      installmentId: pay.id,
      projectId: pay.projectId,
      valor: pay.valor,
      metodo: pay.metodoCodigo || undefined,
      dataRecebimento: pay.pagoEm ? toISODateBR(pay.pagoEm) : toISODateBR(),
      tipo: pay.tipo,
      numero_parcela: pay.numeroParcela,
      total_parcelas: pay.totalParcelas,
      descricao: pay.descricao,
      quitacao: "PARCIAL",
    });
    setReceiptOpen(true);
  }

  const canAdd = projects.length > 0;
  const projectOptions = projects.map((p) => ({
    id: p.id,
    label: `${p.status_geral} · ${p.id.slice(0, 8)}`,
  }));

  return (
    <>
      <Card className="p-5 glass-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-border/40 pb-3">
          <div className="space-y-1 min-w-0">
            <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
              <CreditCard className="h-4.5 w-4.5 text-primary" /> Histórico de Faturamento e Parcelas
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
              Cadastre o plano com forma de pagamento (PIX, boleto, cartão, dinheiro…). O painel avisa
              antes do vencimento para você preparar cobrança ou recebimento.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-muted-foreground bg-slate-100 px-2.5 py-0.5 rounded-full">
              {payments.length} parcela{payments.length === 1 ? "" : "s"}
            </span>
            <Button
              type="button"
              variant="outline"
              className="text-xs font-bold gap-1.5"
              onClick={openAvulsoReceipt}
            >
              <Receipt className="h-4 w-4" /> Recibo avulso
            </Button>
            <Button
              type="button"
              className="text-xs font-bold gap-1.5 btn-metallic"
              disabled={!canAdd}
              onClick={() => setIsModalOpen(true)}
            >
              <Plus className="h-4 w-4" /> Lançar parcelas
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
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="text-xs font-bold gap-1.5"
                onClick={openAvulsoReceipt}
              >
                <Receipt className="h-4 w-4" /> Emitir recibo avulso
              </Button>
              <Button
                type="button"
                className="text-xs font-bold gap-1.5 btn-metallic"
                onClick={() => setIsModalOpen(true)}
              >
                <Plus className="h-4 w-4" /> Criar plano de parcelas
              </Button>
            </div>
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
                      {pay.metodo ? <span>Método: {pay.metodo}</span> : null}
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
                        <>
                          <span className="text-[9px] font-semibold text-emerald-600 text-center">
                            Pago em: {new Date(pay.pagoEm).toLocaleDateString("pt-BR")}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-[10px] font-bold h-7 px-2 gap-1"
                            onClick={() => openInstallmentReceipt(pay)}
                          >
                            <Receipt className="h-3 w-3" />
                            Emitir recibo
                          </Button>
                        </>
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

        <section className="border-t border-border/40 pt-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Receipt className="h-4 w-4 text-amber-600" />
                Recibos emitidos
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Histórico permanente para reabrir, imprimir ou reenviar ao cliente.
              </p>
            </div>
            {!loadingReceipts ? (
              <span className="text-[10px] font-bold text-muted-foreground bg-slate-100 px-2.5 py-1 rounded-full">
                {receipts.length} recibo{receipts.length === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>

          {loadingReceipts ? (
            <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando recibos...
            </div>
          ) : receipts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 px-4 py-5 text-center text-xs text-muted-foreground">
              Nenhum recibo emitido para este cliente.
            </div>
          ) : (
            <div className="grid gap-2">
              {receipts.map((receipt) => (
                <div
                  key={receipt.id}
                  className="rounded-xl border border-border/50 bg-white/70 px-3.5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="min-w-0 flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                      <FileText className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-foreground">
                        Recibo nº {String(receipt.numero).padStart(4, "0")}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {receipt.referente}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(receipt.data_recebimento).toLocaleDateString("pt-BR")}
                        {" · "}
                        {labelPaymentMethod(receipt.metodo_pagamento)}
                        {" · "}
                        {receipt.quitacao === "TOTAL" ? "Quitação total" : "Quitação parcial"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <strong className="text-sm font-black text-foreground privacy-value">
                      {receipt.valor.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </strong>
                    <Link
                      href={`/recibos/${receipt.id}/print`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-white px-2.5 text-[10px] font-bold text-foreground hover:bg-slate-50"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Abrir
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </Card>

      <InstallmentLaunchDialog
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        projects={projects}
        onSuccess={refreshPayments}
      />

      <ReceiptIssueDialog
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        clientId={clientId}
        clientName={clientName}
        projects={projectOptions}
        prefill={receiptPrefill}
        onIssued={() => void refreshReceipts()}
      />
    </>
  );
}
