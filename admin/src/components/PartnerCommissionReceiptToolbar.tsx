"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Mail,
  MessageCircle,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ActionDialog from "@/components/ActionDialog";
import EmailSendPreviewDialog from "@/components/emails/EmailSendPreviewDialog";
import {
  buildWhatsAppUrl,
  formatPhoneForWhatsApp,
  getFirstName,
} from "@/lib/google-review";
import { formatCurrencyBRL } from "@/lib/currencyExtenso";
import {
  previewPartnerCommissionReceiptByEmail,
  sendPartnerCommissionReceiptByEmail,
} from "@/app/actions/emailInbox";

interface PartnerCommissionReceiptToolbarProps {
  receiptId: string;
  numeroLabel: string;
  backHref: string;
  partnerName: string;
  partnerPhone?: string | null;
  partnerEmail?: string | null;
  valor: number;
  nfNumero?: string | null;
}

type FeedbackDialog = {
  variant: "success" | "error";
  title: string;
  message: string;
} | null;

type PreviewState = {
  to: string;
  subject: string;
  html: string;
  from?: string | null;
} | null;

export default function PartnerCommissionReceiptToolbar({
  receiptId,
  numeroLabel,
  backHref,
  partnerName,
  partnerPhone,
  partnerEmail,
  valor,
  nfNumero,
}: PartnerCommissionReceiptToolbarProps) {
  const [emailBusy, setEmailBusy] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackDialog>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState>(null);
  const [sending, setSending] = useState(false);

  const phoneReady = Boolean(formatPhoneForWhatsApp(partnerPhone || ""));
  const anyBusy = emailBusy || sending;

  const handleWhatsApp = useCallback(() => {
    if (!phoneReady || !partnerPhone) {
      setFeedback({
        variant: "error",
        title: "Telefone necessário",
        message: "Cadastre o WhatsApp do parceiro para enviar o comprovante.",
      });
      return;
    }

    const firstName = getFirstName(partnerName);
    const valorLabel = formatCurrencyBRL(valor);
    const lines = [
      `Olá ${firstName}, tudo bem?`,
      "",
      `Segue o comprovante de pagamento da sua comissão Nº ${numeroLabel} no valor de ${valorLabel}, emitido pela Móveis Unghero.`,
    ];
    if (nfNumero) {
      lines.push(`Nota fiscal: ${nfNumero}.`);
    }
    lines.push(
      "",
      "Em seguida enviamos o PDF / documento formal. Qualquer dúvida, estamos à disposição."
    );

    const url = buildWhatsAppUrl(partnerPhone, lines.join("\n"));
    if (!url) {
      setFeedback({
        variant: "error",
        title: "Telefone inválido",
        message: "Não foi possível abrir o WhatsApp com este número.",
      });
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }, [phoneReady, partnerPhone, partnerName, valor, numeroLabel, nfNumero]);

  async function openEmailPreview() {
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreview(null);
    setEmailBusy(true);
    try {
      const res = await previewPartnerCommissionReceiptByEmail(receiptId);
      if (!res.success) {
        setPreviewError(res.error || "Não foi possível montar a prévia.");
        return;
      }
      setPreview({
        to: res.to || partnerEmail?.trim().toLowerCase() || "",
        subject: res.subject,
        html: res.html,
        from: res.from,
      });
    } catch (error) {
      setPreviewError(
        error instanceof Error ? error.message : "Não foi possível montar a prévia."
      );
    } finally {
      setPreviewLoading(false);
      setEmailBusy(false);
    }
  }

  async function confirmEmailSend(to: string) {
    setSending(true);
    try {
      const res = await sendPartnerCommissionReceiptByEmail({ receiptId, to });
      if (!res.success) {
        throw new Error(res.error || "Falha ao enviar e-mail.");
      }
      setPreviewOpen(false);
      setFeedback({
        variant: "success",
        title: "E-mail enviado",
        message: `Comprovante enviado para ${res.to}.`,
      });
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Não foi possível enviar o e-mail.";
      setFeedback({ variant: "error", title: "Falha no e-mail", message: msg });
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="no-print sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold text-muted-foreground hover:bg-muted/60 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">Comprovante Nº {numeroLabel}</p>
            <p className="text-[10px] font-semibold text-muted-foreground">
              Documento para o parceiro — imprima, envie por WhatsApp ou e-mail.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handleWhatsApp}
            disabled={anyBusy || !phoneReady}
            title={
              phoneReady
                ? "Abrir WhatsApp com mensagem pronta"
                : "Parceiro sem telefone cadastrado"
            }
            className="cursor-pointer gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void openEmailPreview()}
            disabled={anyBusy}
            title="Pré-visualizar e enviar por e-mail"
            className="cursor-pointer gap-1.5 bg-sky-700 hover:bg-sky-800 disabled:opacity-60 text-white font-bold"
          >
            {emailBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            E-mail
          </Button>
          <Button
            type="button"
            size="sm"
            className="cursor-pointer gap-1.5"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" />
            Imprimir / PDF
          </Button>
        </div>
      </div>

      <EmailSendPreviewDialog
        open={previewOpen}
        onClose={() => !sending && setPreviewOpen(false)}
        loading={previewLoading}
        error={previewError}
        preview={preview}
        sending={sending}
        onConfirm={(to) => void confirmEmailSend(to)}
        title="Enviar comprovante por e-mail"
      />

      {feedback && (
        <ActionDialog
          open
          variant={feedback.variant}
          title={feedback.title}
          message={feedback.message}
          onClose={() => setFeedback(null)}
        />
      )}
    </>
  );
}
