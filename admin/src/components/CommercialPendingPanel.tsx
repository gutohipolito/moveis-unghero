"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock, ExternalLink, Loader2, PencilLine, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getCommercialPendingQuotes,
  type CommercialPendingQuote,
} from "@/app/actions/quotes";
import QuoteApprovalDialog from "@/components/quotes/QuoteApprovalDialog";
import { formatDateBR, toISODateBR } from "@/lib/brazilDate";
import { PrivacyMoney } from "@/components/privacy/PrivacyMoney";
import { usePermissions } from "@/context/PermissionsContext";
import { isQuoteCommerciallyExpired } from "@/lib/quoteApproval";

function isExpired(dateInput: string) {
  return toISODateBR(dateInput) < toISODateBR();
}

interface CommercialPendingPanelProps {
  onNotify?: (type: "success" | "error", title: string, message: string) => void;
}

export default function CommercialPendingPanel({ onNotify }: CommercialPendingPanelProps) {
  const { isReadOnly } = usePermissions();
  const [quotes, setQuotes] = useState<CommercialPendingQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvalQuote, setApprovalQuote] = useState<CommercialPendingQuote | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getCommercialPendingQuotes();
    if (res.success) {
      setQuotes(res.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        Carregando pendências comerciais...
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border border-dashed border-border bg-white/60 p-10 text-center">
        <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-3" />
        <h3 className="font-bold text-foreground">Nenhuma pendência comercial</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          Quando um orçamento for aprovado parcialmente, os itens restantes
          aparecerão aqui para acompanhamento e nova aprovação.
        </p>
      </div>
    );
  }

  const totalPending = quotes.reduce((s, q) => s + q.pendingTotal, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-foreground">Pendências comerciais</h3>
          <p className="text-sm text-muted-foreground">
            {quotes.length} orçamento(s) com itens ainda em aberto · total pendente{" "}
            <PrivacyMoney value={totalPending} as="strong" className="text-amber-800" />
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {quotes.map((q) => {
          const expired = isExpired(q.validade);
          const isPartial = q.approvedCount > 0;
          const commerciallyExpired = isQuoteCommerciallyExpired(expired, {
            hasApproved: isPartial,
            hasPending: q.pendingCount > 0,
          });

          const cardTone = isPartial
            ? "border-amber-300 bg-amber-500/10"
            : commerciallyExpired
              ? "border-rose-300 bg-rose-500/10"
              : "border-amber-200 bg-white";

          return (
            <div
              key={q.id}
              className={`rounded-[var(--radius-md)] border p-4 shadow-xs space-y-3 ${cardTone}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-foreground truncate">{q.project.client.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {q.project.client.cidade} · Proposta v{q.versao} · Projeto{" "}
                    {q.project.status_geral.replace(/_/g, " ")}
                  </p>
                </div>
                {isPartial ? (
                  <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-900">
                    Aprovação parcial
                  </span>
                ) : commerciallyExpired ? (
                  <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                    <AlertTriangle className="h-3 w-3" /> Vencido
                  </span>
                ) : (
                  <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    <Clock className="h-3 w-3" /> Pendente
                  </span>
                )}
              </div>

              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Já aprovado</span>
                  <strong className="text-emerald-700"><PrivacyMoney value={q.approvedTotal} /></strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ainda pendente</span>
                  <strong className="text-amber-800"><PrivacyMoney value={q.pendingTotal} /></strong>
                </div>
                {!isPartial ? (
                  <div className="flex justify-between text-xs pt-1">
                    <span className="text-muted-foreground">Validade</span>
                    <span className={commerciallyExpired ? "text-rose-700 font-semibold" : ""}>
                      {formatDateBR(q.validade)}
                    </span>
                  </div>
                ) : null}
              </div>

              <ul className="text-xs text-muted-foreground space-y-0.5 max-h-20 overflow-y-auto">
                {q.items
                  .filter((i) => i.status === "PENDENTE")
                  .map((i) => (
                    <li key={i.id} className="truncate">
                      • {i.descricao} (<PrivacyMoney value={i.valor_total} />)
                    </li>
                  ))}
              </ul>

              <div className="flex flex-wrap gap-2 pt-1">
                {!isReadOnly ? (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                    onClick={() => setApprovalQuote(q)}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                    Registrar aprovação
                  </Button>
                ) : null}
                {!isReadOnly ? (
                  <Link href={`/projects/${q.project_id}?tab=quotes&editQuote=${q.id}`}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-amber-300 text-amber-800 h-8"
                    >
                      <PencilLine className="h-3.5 w-3.5 mr-1.5" />
                      Editar proposta
                    </Button>
                  </Link>
                ) : null}
                <Link href={`/quotes/${q.id}/print`} target="_blank">
                  <Button size="sm" variant="outline" className="h-8">
                    <Printer className="h-3.5 w-3.5" />
                  </Button>
                </Link>
                <Link href={`/projects/${q.project_id}`}>
                  <Button size="sm" variant="outline" className="h-8">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <QuoteApprovalDialog
        open={!!approvalQuote}
        onClose={() => setApprovalQuote(null)}
        quote={
          approvalQuote
            ? {
                id: approvalQuote.id,
                project_id: approvalQuote.project_id,
                versao: approvalQuote.versao,
                subtotal: approvalQuote.subtotal,
                desconto: approvalQuote.desconto,
                clientName: approvalQuote.project.client.nome,
                template_tipo: approvalQuote.template_tipo,
                items: approvalQuote.items,
              }
            : null
        }
        onRequestEdit={
          approvalQuote
            ? () => {
                window.location.href = `/projects/${approvalQuote.project_id}?tab=quotes&editQuote=${approvalQuote.id}`;
              }
            : undefined
        }
        onApproved={({ remainingPending, valorAprovado }) => {
          onNotify?.(
            "success",
            remainingPending > 0 ? "Aprovação parcial" : "Itens aprovados",
            remainingPending > 0
              ? `R$ ${valorAprovado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} aprovados. Ainda restam ${remainingPending} item(ns).`
              : "Todos os itens pendentes foram aprovados."
          );
          void load();
        }}
      />
    </div>
  );
}
