"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Ban,
  CheckCircle2,
  FileText,
  Loader2,
  Percent,
  Plus,
  Search,
} from "lucide-react";
import {
  listPartnerCommissions,
  updatePartnerCommission,
  type PartnerCommissionDTO,
} from "@/app/actions/partnerCommissions";
import PartnerCommissionDialog from "@/components/PartnerCommissionDialog";
import PartnerCommissionReceiptIssueDialog from "@/components/PartnerCommissionReceiptIssueDialog";
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
  /** Quando true, o filtro fica fixo neste parceiro (ficha do parceiro). */
  lockPartnerId?: boolean;
  canManage: boolean;
  showSuccess: (title: string, message: string) => void;
  showError: (title: string, message: string) => void;
  confirmAction: ConfirmFn;
}

export default function PartnerCommissionsTab({
  initialPartnerId,
  lockPartnerId = false,
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
  const [createOpen, setCreateOpen] = useState(false);
  const [issueCommission, setIssueCommission] = useState<PartnerCommissionDTO | null>(null);

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
    const matchesPartner =
      !lockPartnerId && c.partner_nome.toLowerCase().includes(q);
    return (
      matchesPartner ||
      c.cliente_nome.toLowerCase().includes(q) ||
      (c.orcamento_codigo || "").toLowerCase().includes(q)
    );
  });

  const handleMarkPaid = (c: PartnerCommissionDTO) => {
    confirmAction({
      title: "Confirmar que a comissão foi paga?",
      message: `Marque como paga só depois de transferir ${formatCurrencyBRL(c.valor_comissao)} para ${c.partner_nome}. A data de hoje será registrada.`,
      confirmLabel: "Sim, já paguei",
      onConfirm: async () => {
        setBusyId(c.id);
        const res = await updatePartnerCommission({
          id: c.id,
          status: "PAGA",
          data_pagamento_efetiva: toISODateBR(),
        });
        setBusyId(null);
        if (!res.success) {
          showError("Não foi possível marcar como paga", res.error);
          return;
        }
        setCommissions((prev) => prev.map((x) => (x.id === c.id ? res.commission : x)));
        showSuccess("Comissão marcada como paga", "A data do pagamento ficou registrada.");
      },
    });
  };

  const handleCancel = (c: PartnerCommissionDTO) => {
    confirmAction({
      title: "Cancelar este lançamento?",
      message:
        "Use se o % foi lançado errado ou o acordo mudou. O registro fica no histórico e você poderá lançar de novo para o mesmo orçamento.",
      confirmLabel: "Sim, cancelar lançamento",
      onConfirm: async () => {
        setBusyId(c.id);
        const res = await updatePartnerCommission({ id: c.id, status: "CANCELADA" });
        setBusyId(null);
        if (!res.success) {
          showError("Não foi possível cancelar", res.error);
          return;
        }
        setCommissions((prev) => prev.map((x) => (x.id === c.id ? res.commission : x)));
        showSuccess("Lançamento cancelado", "Você já pode criar uma nova comissão se precisar.");
      },
    });
  };

  const handleIssueClick = (c: PartnerCommissionDTO) => {
    if (c.receipt_id) {
      window.open(`/comissoes/${c.receipt_id}/print`, "_blank", "noopener,noreferrer");
      return;
    }
    setIssueCommission(c);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200/70 bg-amber-50/50 px-4 py-3.5 text-xs text-amber-950/85 leading-relaxed space-y-2">
        <p className="font-bold text-sm text-amber-950">
          {lockPartnerId ? "Como lançar para este parceiro" : "Como usar esta aba"}
        </p>
        <ol className="list-decimal pl-4 space-y-1">
          <li>
            Clique em <strong>Lançar comissão</strong>
            {lockPartnerId
              ? " e escolha o projeto → orçamento → %."
              : " e escolha parceiro → projeto → orçamento → %."}
          </li>
          <li>
            Quando pagar o parceiro, use <strong>Marcar paga</strong> na linha.
          </li>
          <li>
            Para enviar o documento ao parceiro, use <strong>Emitir comprovante</strong>{" "}
            (informe a NF e, se quiser, envie por e-mail).
            {lockPartnerId ? (
              <>
                {" "}
                Depois ele fica na aba <strong>Comprovantes</strong>.
              </>
            ) : null}
          </li>
        </ol>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              lockPartnerId
                ? "Filtrar por cliente ou orçamento…"
                : "Filtrar por nome do parceiro, cliente ou orçamento…"
            }
            className="w-full h-10 pl-9 rounded-md border border-border bg-card text-sm px-3"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PartnerCommissionStatus | "ALL")}
          className="h-10 px-3 rounded-md border border-border bg-card text-sm cursor-pointer"
          title="Filtrar por status do pagamento"
        >
          <option value="ALL">Todos os status</option>
          <option value="PENDENTE">A pagar (pendente)</option>
          <option value="AGENDADA">Com data prevista</option>
          <option value="PAGA">Já pagas</option>
          <option value="CANCELADA">Canceladas</option>
        </select>
        {partnerFilter && !lockPartnerId && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="cursor-pointer text-xs font-bold"
            onClick={() => setPartnerFilter("")}
          >
            Ver todos os parceiros
          </Button>
        )}
        {canManage && (
          <Button
            type="button"
            className="font-bold gap-2 h-10 px-4 cursor-pointer shrink-0"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Lançar comissão
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center space-y-3 max-w-lg mx-auto">
          <Percent className="h-8 w-8 text-muted-foreground/50 mx-auto" />
          <p className="text-sm font-semibold text-foreground">
            Nenhuma comissão nesta lista
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {lockPartnerId
              ? "Confirme que este parceiro está no projeto do CRM e que o orçamento já foi aprovado. Depois use o botão abaixo."
              : "Se o filtro estiver ativo, limpe a busca ou o status. Para o primeiro lançamento: confirme que o parceiro está no projeto e que o orçamento já foi aprovado; depois use o botão abaixo."}
          </p>
          {canManage && (
            <Button
              type="button"
              className="font-bold gap-2 cursor-pointer"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Lançar comissão
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  {!lockPartnerId && <th className="px-4 py-3">Parceiro</th>}
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
                    {!lockPartnerId && (
                      <td className="px-4 py-3 font-semibold text-foreground">
                        <Link
                          href={`/parceiros/${c.partner_id}`}
                          className="hover:text-primary hover:underline"
                        >
                          {c.partner_nome}
                        </Link>
                      </td>
                    )}
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
                              Marcar paga
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 text-[10px] font-bold cursor-pointer gap-1"
                            disabled={busyId === c.id}
                            onClick={() => handleIssueClick(c)}
                            title={
                              c.receipt_id
                                ? "Abrir o comprovante para imprimir ou enviar"
                                : "Gerar comprovante com NF para enviar ao parceiro"
                            }
                          >
                            <FileText className="h-3 w-3" />
                            {c.receipt_id ? "Abrir comprovante" : "Emitir comprovante"}
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

      <PartnerCommissionDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        initialPartnerId={partnerFilter || null}
        onCreated={(c) => {
          setCommissions((prev) => [c, ...prev]);
          showSuccess(
            "Comissão lançada",
            lockPartnerId
              ? `Próximo passo: quando pagar, use “Marcar paga”. Para o documento do parceiro, use “Emitir comprovante” (com a NF).`
              : `Próximo passo: quando pagar ${c.partner_nome}, use “Marcar paga”. Para enviar o documento, use “Emitir comprovante”.`
          );
        }}
      />

      <PartnerCommissionReceiptIssueDialog
        open={issueCommission !== null}
        commission={issueCommission}
        onClose={() => setIssueCommission(null)}
        showSuccess={showSuccess}
        onIssued={(receiptId) => {
          void reload();
          window.open(`/comissoes/${receiptId}/print`, "_blank", "noopener,noreferrer");
        }}
      />
    </div>
  );
}
