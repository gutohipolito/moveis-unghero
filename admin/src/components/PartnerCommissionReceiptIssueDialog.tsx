"use client";

import React, { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Loader2 } from "lucide-react";
import {
  issuePartnerCommissionReceipt,
  type PartnerCommissionDTO,
} from "@/app/actions/partnerCommissions";
import { sendPartnerCommissionReceiptByEmail } from "@/app/actions/emailInbox";
import { formatCurrencyBRL } from "@/lib/currencyExtenso";
import { toISODateBR } from "@/lib/brazilDate";

type Step = "nf" | "email-ask" | "email-to";

interface PartnerCommissionReceiptIssueDialogProps {
  open: boolean;
  commission: PartnerCommissionDTO | null;
  onClose: () => void;
  onIssued: (receiptId: string) => void;
  showSuccess: (title: string, message: string) => void;
}

export default function PartnerCommissionReceiptIssueDialog({
  open,
  commission,
  onClose,
  onIssued,
  showSuccess,
}: PartnerCommissionReceiptIssueDialogProps) {
  const [step, setStep] = useState<Step>("nf");
  const [nfNumero, setNfNumero] = useState("");
  const [nfData, setNfData] = useState(toISODateBR());
  const [emailTo, setEmailTo] = useState("");
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [partnerNome, setPartnerNome] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep("nf");
    setNfNumero("");
    setNfData(toISODateBR());
    setEmailTo("");
    setReceiptId(null);
    setPartnerNome(commission?.partner_nome || "");
    setError(null);
    setBusy(false);
  }, [open, commission?.id, commission?.partner_nome]);

  if (!open || !commission) return null;

  async function handleIssue() {
    if (!commission) return;
    setError(null);
    if (!nfNumero.trim()) {
      setError("Informe o número da nota fiscal.");
      return;
    }
    if (!nfData) {
      setError("Informe a data de emissão da nota fiscal.");
      return;
    }

    setBusy(true);
    const res = await issuePartnerCommissionReceipt({
      commissionId: commission.id,
      nota_fiscal_numero: nfNumero,
      nota_fiscal_emitida_em: nfData,
    });
    setBusy(false);

    if (!res.success) {
      setError(res.error);
      return;
    }

    setReceiptId(res.receiptId);
    setPartnerNome(res.partnerNome);
    setEmailTo((res.partnerEmail || "").trim().toLowerCase());
    onIssued(res.receiptId);

    if (res.reused) {
      onClose();
      return;
    }

    setStep("email-ask");
  }

  async function handleSendEmail() {
    if (!receiptId) return;
    const to = emailTo.trim().toLowerCase();
    if (!to || !to.includes("@")) {
      setError("Informe um e-mail válido do parceiro.");
      setStep("email-to");
      return;
    }

    setBusy(true);
    setError(null);
    const res = await sendPartnerCommissionReceiptByEmail({
      receiptId,
      to,
    });
    setBusy(false);

    if (!res.success) {
      setError(res.error);
      setStep("email-to");
      return;
    }

    showSuccess("E-mail enviado", `Comprovante enviado para ${res.to}.`);
    onClose();
  }

  return (
    <Dialog isOpen={open} onClose={() => !busy && onClose()} className="max-w-md">
      <div className="space-y-4 pr-2">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-800">
            <FileText className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-foreground">
              {step === "nf" ? "Emitir comprovante" : "Enviar por e-mail?"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {commission.partner_nome} · {formatCurrencyBRL(commission.valor_comissao)} ·{" "}
              {commission.percentual}%
            </p>
          </div>
        </div>

        {step === "nf" && (
          <>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Informe a nota fiscal da Móveis Unghero referente a este pagamento de comissão. Os dados
              entram no documento enviado ao parceiro.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Número da NF *
                </label>
                <Input
                  value={nfNumero}
                  onChange={(e) => setNfNumero(e.target.value)}
                  placeholder="Ex.: 12345"
                  className="mt-1 h-10"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Data de emissão da NF *
                </label>
                <Input
                  type="date"
                  value={nfData}
                  onChange={(e) => setNfData(e.target.value)}
                  className="mt-1 h-10"
                />
              </div>
            </div>
            {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                className="cursor-pointer"
                disabled={busy}
                onClick={onClose}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="font-bold cursor-pointer gap-2"
                disabled={busy}
                onClick={() => void handleIssue()}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Gerar comprovante
              </Button>
            </div>
          </>
        )}

        {step === "email-ask" && (
          <>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Comprovante gerado e aberto para impressão. Deseja enviar por e-mail para{" "}
              <strong>{partnerNome}</strong> agora?
            </p>
            {emailTo ? (
              <p className="text-xs font-semibold text-foreground bg-muted/50 rounded-lg px-3 py-2">
                Destino: {emailTo}
              </p>
            ) : (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Este parceiro não tem e-mail no cadastro. Você poderá informar um endereço na
                próxima etapa.
              </p>
            )}
            {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}
            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                className="cursor-pointer"
                disabled={busy}
                onClick={onClose}
              >
                Agora não
              </Button>
              <Button
                type="button"
                className="font-bold cursor-pointer gap-2"
                disabled={busy}
                onClick={() => {
                  if (emailTo.includes("@")) {
                    void handleSendEmail();
                  } else {
                    setStep("email-to");
                  }
                }}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Sim, enviar e-mail
              </Button>
            </div>
          </>
        )}

        {step === "email-to" && (
          <>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Informe o e-mail do parceiro para envio do comprovante.
            </p>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                E-mail *
              </label>
              <Input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="parceiro@email.com"
                className="mt-1 h-10"
                autoFocus
              />
            </div>
            {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                className="cursor-pointer"
                disabled={busy}
                onClick={onClose}
              >
                Agora não
              </Button>
              <Button
                type="button"
                className="font-bold cursor-pointer gap-2"
                disabled={busy}
                onClick={() => void handleSendEmail()}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Enviar
              </Button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
