"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Loader2,
  Percent,
  CheckCircle2,
  Ban,
} from "lucide-react";
import {
  getProjectCommissions,
  issuePartnerCommissionReceipt,
  updatePartnerCommission,
  type PartnerCommissionDTO,
} from "@/app/actions/partnerCommissions";
import PartnerCommissionDialog from "@/components/PartnerCommissionDialog";
import { formatCurrencyBRL } from "@/lib/currencyExtenso";
import { ActionDialogHost, useActionDialog } from "@/components/ActionDialogHost";
import { toISODateBR } from "@/lib/brazilDate";

const STATUS_LABEL: Record<string, string> = {
  PENDENTE: "Pendente",
  AGENDADA: "Agendada",
  PAGA: "Paga",
  CANCELADA: "Cancelada",
};

interface PartnerCommissionPanelProps {
  projectId: string;
  partnerId: string | null | undefined;
  partnerName: string | null | undefined;
  canManage: boolean;
}

export default function PartnerCommissionPanel({
  projectId,
  partnerId,
  partnerName,
  canManage,
}: PartnerCommissionPanelProps) {
  const dialog = useActionDialog();
  const { showSuccess, showError, confirmAction } = dialog;
  const [commissions, setCommissions] = useState<PartnerCommissionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const res = await getProjectCommissions(projectId);
    setLoading(false);
    if (res.success) setCommissions(res.commissions);
  }, [projectId]);

  useEffect(() => {
    if (!partnerId) {
      setCommissions([]);
      setLoading(false);
      return;
    }
    void reload();
  }, [partnerId, reload]);

  if (!partnerId || !partnerName) return null;

  const active = commissions.filter((c) => c.status !== "CANCELADA");

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
      message:
        "O histórico é preservado. Você poderá lançar outra para o mesmo orçamento.",
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
    <div className="sm:col-span-3 rounded-xl border border-amber-200/70 bg-amber-50/40 p-3.5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-amber-900 font-bold uppercase text-[9px] tracking-wider">
          <Percent className="h-3.5 w-3.5" />
          Comissão do parceiro
          <span className="normal-case font-semibold text-amber-800/70 tracking-normal">
            · uso interno
          </span>
        </div>
        {canManage && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-[10px] font-bold cursor-pointer border-amber-300/80 bg-white/80"
            onClick={() => setDialogOpen(true)}
          >
            Definir comissão
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-3">
          <Loader2 className="h-4 w-4 animate-spin text-amber-800/60" />
        </div>
      ) : active.length === 0 ? (
        <p className="text-xs text-amber-900/70 font-medium">
          Nenhuma comissão lançada. Disponível após orçamento aprovado.
        </p>
      ) : (
        <ul className="space-y-2">
          {active.map((c) => (
            <li
              key={c.id}
              className="rounded-lg border border-amber-100/90 bg-white/80 px-3 py-2.5 space-y-2"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-slate-800 tabular-nums">
                    {c.percentual}% · {formatCurrencyBRL(c.valor_comissao)}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Base {formatCurrencyBRL(c.base_valor)}
                    {c.orcamento_codigo ? ` · ${c.orcamento_codigo}` : ` · v${c.orcamento_versao}`}
                    {" · "}
                    {STATUS_LABEL[c.status] ?? c.status}
                    {c.data_pagamento_prevista
                      ? ` · prev. ${new Date(c.data_pagamento_prevista + "T12:00:00").toLocaleDateString("pt-BR")}`
                      : ""}
                  </p>
                </div>
                {canManage && (
                  <div className="flex flex-wrap gap-1.5">
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
                      {c.receipt_id ? "Ver comprovante" : "Emitir comprovante"}
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
                        Cancelar
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <PartnerCommissionDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        projectId={projectId}
        partnerName={partnerName}
        onCreated={(c) => {
          setCommissions((prev) => [c, ...prev]);
          showSuccess(
            "Comissão lançada",
            `${c.percentual}% · ${formatCurrencyBRL(c.valor_comissao)}`
          );
        }}
      />
      <ActionDialogHost dialog={dialog} />
    </div>
  );
}
