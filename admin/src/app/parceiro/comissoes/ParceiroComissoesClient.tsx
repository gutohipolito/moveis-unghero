"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, FileText, Wallet } from "lucide-react";
import type { PartnerCommissionStatus } from "@prisma/client";
import type {
  PartnerPortalCommission,
  PartnerPortalData,
} from "@/lib/partnerPortal";
import ParceiroPortalShell from "@/app/parceiro/ParceiroPortalShell";
import ParceiroFilterPills from "@/app/parceiro/ParceiroFilterPills";
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
      <div className="parceiro-veio-finance">
        <header className="parceiro-veio-finance-header">
          <p className="parceiro-veio-finance-kicker">Financeiro</p>
          <h1 className="parceiro-veio-title">Comissões e recibos</h1>
          <p className="parceiro-veio-subtitle">
            Recibos emitidos pela Móveis Unghero. Valores e comprovantes aparecem
            só após a emissão — em modo leitura.
          </p>
        </header>

        <section className="parceiro-veio-finance-totals" aria-label="Totais">
          <div className="parceiro-veio-finance-total is-open">
            <span className="parceiro-veio-finance-total-label">A receber</span>
            <span className="parceiro-veio-finance-total-value">
              {formatMoney(pendente)}
            </span>
          </div>
          <div className="parceiro-veio-finance-total is-paid">
            <span className="parceiro-veio-finance-total-label">Já pago</span>
            <span className="parceiro-veio-finance-total-value">
              {formatMoney(pago)}
            </span>
          </div>
        </section>

        <ParceiroFilterPills
          variant="finance"
          aria-label="Filtrar comissões"
          value={filter}
          onChange={(id) => setFilter(id as FilterId)}
          options={[
            { id: "all", label: "Todas", count: commissions.length },
            { id: "open", label: "Em aberto", count: counts.open },
            { id: "paid", label: "Pagas", count: counts.paid },
            { id: "cancelled", label: "Canceladas", count: counts.cancelled },
          ]}
        />

        {filtered.length === 0 ? (
          <section className="parceiro-veio-empty">
            <Wallet className="h-7 w-7 text-[var(--partner-muted,#a9a7a2)]" aria-hidden />
            <h2 className="parceiro-veio-empty-title">Nenhum recibo neste filtro</h2>
            <p className="parceiro-veio-empty-desc">
              Quando a Móveis Unghero emitir um recibo de comissão, ele aparece aqui
              para consulta.
            </p>
          </section>
        ) : (
          <ul className="parceiro-veio-finance-list">
            {filtered.map((c) => {
              const receiptLabel =
                c.receipt_numero != null
                  ? `Comprovante nº ${String(c.receipt_numero).padStart(4, "0")}`
                  : "Abrir comprovante";
              return (
                <li key={c.id}>
                  <article
                    className={cn(
                      "parceiro-veio-finance-row",
                      `is-${c.status.toLowerCase()}`
                    )}
                  >
                    <div className="parceiro-veio-finance-row-main">
                      <div className="parceiro-veio-finance-row-top">
                        <h2 className="parceiro-veio-finance-client">
                          {c.cliente_nome}
                        </h2>
                        <span
                          className={cn(
                            "parceiro-veio-finance-status",
                            `is-${c.status.toLowerCase()}`
                          )}
                        >
                          {STATUS_LABEL[c.status]}
                        </span>
                      </div>
                      <p className="parceiro-veio-finance-meta">
                        {c.orcamento_codigo || "Orçamento"}
                        {c.orcamento_versao ? ` · v${c.orcamento_versao}` : ""}
                        {" · "}
                        {c.percentual.toLocaleString("pt-BR", {
                          maximumFractionDigits: 2,
                        })}
                        % sobre {formatMoney(c.base_valor)}
                      </p>
                    </div>

                    <div className="parceiro-veio-finance-amount">
                      <span className="parceiro-veio-finance-amount-value">
                        {formatMoney(c.valor_comissao)}
                      </span>
                      <span className="parceiro-veio-finance-amount-date">
                        {c.data_pagamento_efetiva
                          ? `Pago em ${formatDate(c.data_pagamento_efetiva)}`
                          : `Previsto ${formatDate(c.data_pagamento_prevista)}`}
                      </span>
                    </div>

                    <div className="parceiro-veio-finance-actions">
                      <Link
                        href={`/parceiro/projetos/${c.project_id}`}
                        className="parceiro-veio-finance-btn is-ghost"
                      >
                        Ver projeto
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                      {c.receipt_id ? (
                        <Link
                          href={`/parceiro/comissoes/${c.receipt_id}/print`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="parceiro-veio-finance-btn is-solid"
                        >
                          <FileText className="h-3.5 w-3.5" aria-hidden />
                          {receiptLabel}
                        </Link>
                      ) : null}
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </ParceiroPortalShell>
  );
}
