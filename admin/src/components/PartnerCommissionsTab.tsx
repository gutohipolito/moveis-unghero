"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Ban,
  CheckCircle2,
  FileText,
  Loader2,
  Search,
} from "lucide-react";
import {
  issuePartnerCommissionReceipt,
  listPartnerCommissions,
  updatePartnerCommission,
  type PartnerCommissionDTO,
} from "@/app/actions/partnerCommissions";
import { formatCurrencyBRL } from "@/lib/currencyExtenso";
import { toISODateBR } from "@/lib/brazilDate";
import type { PartnerCommissionStatus } from "@prisma/client";

const STATUS_LABEL: Record<string, string> = {
  PENDENTE: "Pendente",
  AGENDADA: "Agendada",
  PAGA: "Paga",
  CANCELADA: "Cancelada",
};

type ConfirmFn = (options: {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
}) => void;

interface PartnerCommissionsTabProps {
  initialPartnerId?: string | null;
  canManage: boolean;
  showSuccess: (title: string, message: string) => void;
  showError: (title: string, message: string) => void;
  confirmAction: ConfirmFn;
}

export default function PartnerCommissionsTab({
  initialPartnerId,
  canManage,
  showSuccess,
  showError,
  confirmAction,
}: PartnerCommissionsTabProps) {
  const [commissions, setCommissions] = useState<PartnerCommissionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<PartnerCommissionStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [partnerFilter, setPartnerFilter] = useState(initialPartnerId || "");
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const res = await listPartnerCommissions({
      partnerId: partnerFilter || undefined,
      status: statusFilter,
    });
    setLoading(false);
    if (res.success) setCommissions(res.commissions);
  }, [partnerFilter, statusFilter]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (initialPartnerId) setPartnerFilter(initialPartnerId);
  }, [initialPartnerId]);

  const filtered = commissions.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.partner_nome.toLowerCase().includes(q) ||
      c.cliente_nome.toLowerCase().includes(q) ||
      (c.orcamento_codigo || "").toLowerCase().includes(q)
    );
  });

  const handleMarkPaid = (c: PartnerCommissionDTO) => {
    confirmAction({
      title: "Marcar comissão como paga?",
      message: `${formatCurrencyBRL(c.valor_comissao)} · ${c.partner_nome}`,
      confirmLabel: "Confirmar pagamento",
      onConfirm: async () => {
        setBusyId(c.id);
        const res = await updatePartnerCommission({
          id: c.id,
          status: "PAGA",
          data_pagamento_efetiva: toISODateBR(),
        });
        setBusyId(null);
        if (!res.success) {
          showError("Erro", res.error);
          return;
        }
        setCommissions((prev) => prev.map((x) => (x.id === c.id ? res.commission : x)));
        showSuccess("Comissão paga", "Status atualizado.");
      },
    });
  };

  const handleCancel = (c: PartnerCommissionDTO) => {
    confirmAction({
      title: "Cancelar esta comissão?",
      message: "O histórico é preservado.",
      confirmLabel: "Cancelar comissão",
      onConfirm: async () => {
        setBusyId(c.id);
        const res = await updatePartnerCommission({ id: c.id, status: "CANCELADA" });
        setBusyId(null);
        if (!res.success) {
          showError("Erro", res.error);
          return;
        }
        setCommissions((prev) => prev.map((x) => (x.id === c.id ? res.commission : x)));
        showSuccess("Comissão cancelada", "Registro mantido no histórico.");
      },
    });
  };

  const handleIssue = async (c: PartnerCommissionDTO) => {
    setBusyId(c.id);
    const res = await issuePartnerCommissionReceipt(c.id);
    setBusyId(null);
    if (!res.success) {
      showError("Erro ao emitir", res.error);
      return;
    }
    await reload();
    window.open(`/comissoes/${res.receiptId}/print`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar parceiro, cliente ou orçamento..."
            className="w-full h-10 pl-9 rounded-md border border-border bg-card text-sm px-3"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PartnerCommissionStatus | "ALL")}
          className="h-10 px-3 rounded-md border border-border bg-card text-sm cursor-pointer"
        >
          <option value="ALL">Todos os status</option>
          <option value="PENDENTE">Pendente</option>
          <option value="AGENDADA">Agendada</option>
          <option value="PAGA">Paga</option>
          <option value="CANCELADA">Cancelada</option>
        </select>
        {partnerFilter && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="cursor-pointer text-xs font-bold"
            onClick={() => setPartnerFilter("")}
          >
            Limpar filtro de parceiro
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma comissão encontrada. Lance pelo projeto após aprovar o orçamento.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Parceiro</th>
                  <th className="px-4 py-3">Projeto</th>
                  <th className="px-4 py-3">%</th>
                  <th className="px-4 py-3">Base</th>
                  <th className="px-4 py-3">Comissão</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Datas</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3 font-semibold text-foreground">{c.partner_nome}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/crm?project=${c.project_id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {c.cliente_nome}
                      </Link>
                      <p className="text-[10px] text-muted-foreground">
                        {c.orcamento_codigo || `v${c.orcamento_versao}`}
                      </p>
                    </td>
                    <td className="px-4 py-3 tabular-nums font-bold">{c.percentual}%</td>
                    <td className="px-4 py-3 tabular-nums">{formatCurrencyBRL(c.base_valor)}</td>
                    <td className="px-4 py-3 tabular-nums font-bold">
                      {formatCurrencyBRL(c.valor_comissao)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                        {STATUS_LABEL[c.status] ?? c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-muted-foreground">
                      {c.data_pagamento_prevista
                        ? `Prev. ${new Date(c.data_pagamento_prevista + "T12:00:00").toLocaleDateString("pt-BR")}`
                        : "—"}
                      {c.data_pagamento_efetiva
                        ? ` · Pago ${new Date(c.data_pagamento_efetiva + "T12:00:00").toLocaleDateString("pt-BR")}`
                        : ""}
                    </td>
                    <td className="px-4 py-3">
                      {canManage && c.status !== "CANCELADA" && (
                        <div className="flex justify-end flex-wrap gap-1">
                          {c.status !== "PAGA" && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 text-[10px] font-bold cursor-pointer gap-1"
                              disabled={busyId === c.id}
                              onClick={() => handleMarkPaid(c)}
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Paga
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 text-[10px] font-bold cursor-pointer gap-1"
                            disabled={busyId === c.id}
                            onClick={() => void handleIssue(c)}
                          >
                            {busyId === c.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <FileText className="h-3 w-3" />
                            )}
                            {c.receipt_id ? "PDF" : "Emitir"}
                          </Button>
                          {c.status !== "PAGA" && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 text-[10px] font-bold cursor-pointer gap-1 text-rose-600"
                              disabled={busyId === c.id}
                              onClick={() => handleCancel(c)}
                            >
                              <Ban className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
