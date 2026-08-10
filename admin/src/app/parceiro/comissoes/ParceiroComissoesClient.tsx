"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  FileText,
  Wallet,
} from "lucide-react";
import type { PartnerCommissionStatus } from "@prisma/client";
import type {
  PartnerPortalCommission,
  PartnerPortalData,
} from "@/lib/partnerPortal";
import ParceiroPortalShell from "@/app/parceiro/ParceiroPortalShell";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<PartnerCommissionStatus, string> = {
  PENDENTE: "Pendente",
  AGENDADA: "Agendada",
  PAGA: "Paga",
  CANCELADA: "Cancelada",
};

type FilterId = "all" | "open" | "paid" | "cancelled";

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function statusClass(status: PartnerCommissionStatus) {
  if (status === "PAGA") {
    return "bg-emerald-500/15 text-emerald-300 border-emerald-500/25";
  }
  if (status === "AGENDADA") {
    return "bg-sky-500/15 text-sky-300 border-sky-500/25";
  }
  if (status === "CANCELADA") {
    return "bg-slate-500/15 text-slate-400 border-slate-500/25";
  }
  return "bg-amber-500/15 text-amber-300 border-amber-500/25";
}

interface ParceiroComissoesClientProps {
  partner: PartnerPortalData;
  commissions: PartnerPortalCommission[];
  pendente: number;
  pago: number;
  isAdminPreview?: boolean;
}

export default function ParceiroComissoesClient({
  partner,
  commissions,
  pendente,
  pago,
  isAdminPreview = false,
}: ParceiroComissoesClientProps) {
  const [filter, setFilter] = useState<FilterId>("all");

  const counts = useMemo(() => {
    let open = 0;
    let paid = 0;
    let cancelled = 0;
    for (const c of commissions) {
      if (c.status === "PAGA") paid += 1;
      else if (c.status === "CANCELADA") cancelled += 1;
      else open += 1;
    }
    return { open, paid, cancelled };
  }, [commissions]);

  const filtered = useMemo(() => {
    if (filter === "open") {
      return commissions.filter(
        (c) => c.status === "PENDENTE" || c.status === "AGENDADA"
      );
    }
    if (filter === "paid") return commissions.filter((c) => c.status === "PAGA");
    if (filter === "cancelled") {
      return commissions.filter((c) => c.status === "CANCELADA");
    }
    return commissions;
  }, [commissions, filter]);

  return (
    <ParceiroPortalShell partner={partner} isAdminPreview={isAdminPreview}>
      <div className="space-y-5">
        <div>
          <p className="parceiro-page-kicker">Financeiro</p>
          <h1 className="parceiro-page-title">Comissões</h1>
          <p className="parceiro-page-desc">
            Acompanhe valores lançados pela Móveis Unghero. Somente leitura —
            pagamentos e comprovantes são emitidos pela equipe.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="partner-card p-4">
            <div className="partner-card-accent" />
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/50">
              A receber
            </p>
            <p className="mt-1 text-xl font-black text-amber-300 tabular-nums">
              {formatMoney(pendente)}
            </p>
          </div>
          <div className="partner-card p-4">
            <div className="partner-card-accent" />
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/50">
              Já pago
            </p>
            <p className="mt-1 text-xl font-black text-emerald-300 tabular-nums">
              {formatMoney(pago)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: "all" as const, label: `Todas · ${commissions.length}` },
              { id: "open" as const, label: `Em aberto · ${counts.open}` },
              { id: "paid" as const, label: `Pagas · ${counts.paid}` },
              {
                id: "cancelled" as const,
                label: `Canceladas · ${counts.cancelled}`,
              },
            ] as const
          ).map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setFilter(chip.id)}
              className={cn(
                "parceiro-filter-chip",
                filter === chip.id && "is-active"
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="partner-card p-10 text-center space-y-3">
            <div className="partner-card-accent" />
            <Wallet className="h-8 w-8 mx-auto text-white/35" />
            <p className="text-sm font-semibold text-white/80">
              Nenhuma comissão neste filtro
            </p>
            <p className="text-xs text-white/45 max-w-sm mx-auto leading-relaxed">
              Quando a equipe lançar uma comissão vinculada a um projeto seu, ela
              aparece aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((c) => (
              <article key={c.id} className="partner-card p-4 space-y-3">
                <div className="partner-card-accent" />
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {c.cliente_nome}
                    </p>
                    <p className="text-[11px] text-white/50 mt-0.5">
                      {c.orcamento_codigo || "Orçamento"}
                      {c.orcamento_versao ? ` · v${c.orcamento_versao}` : ""}
                      {" · "}
                      {c.percentual.toLocaleString("pt-BR", {
                        maximumFractionDigits: 2,
                      })}
                      % sobre {formatMoney(c.base_valor)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0",
                      statusClass(c.status)
                    )}
                  >
                    {STATUS_LABEL[c.status]}
                  </span>
                </div>

                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                      Valor
                    </p>
                    <p className="text-lg font-black text-white tabular-nums">
                      {formatMoney(c.valor_comissao)}
                    </p>
                    <p className="text-[11px] text-white/45 mt-1">
                      Previsto: {formatDate(c.data_pagamento_prevista)}
                      {c.data_pagamento_efetiva
                        ? ` · Pago em ${formatDate(c.data_pagamento_efetiva)}`
                        : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/parceiro/projetos/${c.project_id}`}
                      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-[11px] font-bold border border-white/15 text-white/80 hover:bg-white/5 transition-colors"
                    >
                      Ver projeto
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                    {c.receipt_id ? (
                      <Link
                        href={`/parceiro/comissoes/${c.receipt_id}/print`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-[11px] font-bold bg-white text-slate-900 hover:bg-white/90 transition-colors"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Comprovante
                        {c.receipt_numero != null
                          ? ` nº ${String(c.receipt_numero).padStart(4, "0")}`
                          : ""}
                      </Link>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </ParceiroPortalShell>
  );
}
