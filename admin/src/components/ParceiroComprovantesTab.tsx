"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, FileText, Loader2, Receipt } from "lucide-react";
import {
  listPartnerCommissionReceipts,
  type PartnerCommissionReceiptDTO,
} from "@/app/actions/partnerCommissions";
import { formatCurrencyBRL } from "@/lib/currencyExtenso";
import { Card } from "@/components/ui/card";

const STATUS_LABEL: Record<string, string> = {
  PENDENTE: "Pendente",
  AGENDADA: "Agendada",
  PAGA: "Paga",
  CANCELADA: "Cancelada",
};

export default function ParceiroComprovantesTab({ partnerId }: { partnerId: string }) {
  const [receipts, setReceipts] = useState<PartnerCommissionReceiptDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const res = await listPartnerCommissionReceipts(partnerId);
    setLoading(false);
    if (res.success) setReceipts(res.receipts);
  }, [partnerId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <Card className="p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <Receipt className="h-4 w-4 text-amber-600" />
            Comprovantes emitidos
          </h4>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Histórico dos documentos enviados (ou prontos para enviar) a este parceiro. Abra para
            imprimir, WhatsApp ou e-mail.
          </p>
        </div>
        {!loading ? (
          <span className="text-[10px] font-bold text-muted-foreground bg-slate-100 px-2.5 py-1 rounded-full">
            {receipts.length} comprovante{receipts.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando comprovantes…
        </div>
      ) : receipts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 px-4 py-8 text-center space-y-2">
          <FileText className="h-7 w-7 text-muted-foreground/40 mx-auto" />
          <p className="text-xs font-semibold text-foreground">
            Nenhum comprovante emitido ainda
          </p>
          <p className="text-[11px] text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Na aba Comissões, use <strong>Emitir comprovante</strong> na linha do lançamento
            (informe a NF). O documento fica salvo aqui para reabrir e enviar ao parceiro.
          </p>
        </div>
      ) : (
        <div className="grid gap-2">
          {receipts.map((receipt) => {
            const numeroLabel = String(receipt.numero).padStart(4, "0");
            const orcamento =
              receipt.orcamento_codigo ||
              (receipt.orcamento_versao != null ? `v${receipt.orcamento_versao}` : null);
            return (
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
                      Comprovante Nº {numeroLabel}
                      {orcamento ? ` · ${orcamento}` : ""}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Cliente: {receipt.cliente_nome}
                      {" · "}
                      {receipt.percentual}% sobre{" "}
                      {formatCurrencyBRL(receipt.base_valor)}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Emitido em{" "}
                      {new Date(receipt.createdAt).toLocaleDateString("pt-BR")}
                      {receipt.nota_fiscal_numero
                        ? ` · NF ${receipt.nota_fiscal_numero}`
                        : ""}
                      {receipt.commission_status
                        ? ` · Comissão ${STATUS_LABEL[receipt.commission_status] ?? receipt.commission_status}`
                        : ""}
                      {receipt.emitido_por_nome ? ` · por ${receipt.emitido_por_nome}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <strong className="text-sm font-black text-foreground privacy-value tabular-nums">
                    {formatCurrencyBRL(receipt.valor_comissao)}
                  </strong>
                  <Link
                    href={`/comissoes/${receipt.id}/print`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-white px-2.5 text-[10px] font-bold text-foreground hover:bg-slate-50"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Abrir
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
