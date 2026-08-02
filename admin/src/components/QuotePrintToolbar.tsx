"use client";

import { useCallback, useState } from "react";
import { Download, Loader2, Mail, MessageCircle, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import ActionDialog from "@/components/ActionDialog";
import EmailSendPreviewDialog from "@/components/emails/EmailSendPreviewDialog";
import { formatPhoneForWhatsApp } from "@/lib/google-review";
import { getPhoneLastFourDigits } from "@/lib/phone";
import { buildQuoteWhatsAppMessage, openQuoteWhatsApp, slugifyFileName } from "@/lib/quoteWhatsApp";
import {
  previewQuoteByEmail,
  sendQuoteByEmail,
} from "@/app/actions/emailInbox";
import {
  downloadPdfBlob,
  generatePrintPagePdfBlob,
} from "@/lib/quotePdfClient";

interface QuotePrintToolbarProps {
  quoteId: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string | null;
  validade: string;
  initialPdfShareUrl?: string | null;
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

export default function QuotePrintToolbar({
  quoteId,
  clientName,
  clientPhone,
  clientEmail,
  validade,
  initialPdfShareUrl,
}: QuotePrintToolbarProps) {
  const [pdfShareUrl, setPdfShareUrl] = useState(initialPdfShareUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackDialog>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState>(null);
  const [sending, setSending] = useState(false);
  const phoneReady = Boolean(formatPhoneForWhatsApp(clientPhone));
  const emailReady = Boolean(clientEmail?.includes("@"));
  const anyBusy = busy || emailBusy || pdfBusy || sending;

  const ensureShareLink = useCallback(async () => {
    if (pdfShareUrl) return pdfShareUrl;

    const response = await fetch(`/api/quotes/${quoteId}/pdf-share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });

    const data = (await response.json()) as {
      success?: boolean;
      url?: string;
      error?: string;
    };

    if (!response.ok || !data.success || !data.url) {
      throw new Error(data.error || "Não foi possível gerar o link do orçamento.");
    }

    setPdfShareUrl(data.url);
    return data.url;
  }, [pdfShareUrl, quoteId]);

  async function handleDownloadPdf() {
    const pin = getPhoneLastFourDigits(clientPhone);
    if (!pin) {
      setFeedback({
        variant: "error",
        title: "Telefone necessário",
        message:
          "Cadastre o telefone do cliente (com pelo menos 4 dígitos) para gerar o PDF com senha.",
      });
      return;
    }
    setPdfBusy(true);
    try {
      const blob = await generatePrintPagePdfBlob({ userPassword: pin });
      downloadPdfBlob(blob, `orcamento-${slugifyFileName(clientName)}.pdf`);
      setFeedback({
        variant: "success",
        title: "PDF baixado",
        message: `Arquivo protegido com senha ${pin} (4 últimos dígitos do celular do cliente).\n\nSe for enviar o arquivo, informe essa mesma senha — é a mesma do link público.`,
      });
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Não foi possível gerar o PDF.";
      setFeedback({ variant: "error", title: "Falha ao gerar PDF", message: msg });
    } finally {
      setPdfBusy(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  async function handleWhatsApp() {
    if (!phoneReady) {
      setFeedback({
        variant: "error",
        title: "Telefone necessário",
        message: "Cadastre o telefone/WhatsApp do cliente para enviar a proposta.",
      });
      return;
    }

    setBusy(true);
    try {
      const url = await ensureShareLink();
      const message = buildQuoteWhatsAppMessage({
        clientName,
        validade,
        pdfUrl: url,
        includeAccessPin: Boolean(getPhoneLastFourDigits(clientPhone)),
      });

      const opened = openQuoteWhatsApp(clientPhone, message);
      if (!opened) {
        throw new Error("Telefone do cliente inválido para WhatsApp.");
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Não foi possível preparar o envio.";
      setFeedback({ variant: "error", title: "Falha no WhatsApp", message: msg });
    } finally {
      setBusy(false);
    }
  }

  async function openEmailPreview() {
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreview(null);
    setEmailBusy(true);
    try {
      const res = await previewQuoteByEmail(quoteId);
      if (!res.success) {
        setPreviewError(res.error || "Não foi possível montar a prévia.");
        return;
      }
      setPreview({
        to: res.to || clientEmail?.trim().toLowerCase() || "",
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
      const res = await sendQuoteByEmail({ quoteId, to });
      if (!res.success) {
        throw new Error(res.error || "Falha ao enviar e-mail.");
      }
      setPreviewOpen(false);
      setFeedback({
        variant: "success",
        title: "E-mail enviado",
        message: `Orçamento enviado para ${res.to}.`,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Não foi possível enviar o e-mail.";
      setFeedback({ variant: "error", title: "Falha no e-mail", message: msg });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          onClick={handleWhatsApp}
          disabled={anyBusy || !phoneReady}
          title={
            phoneReady
              ? "Enviar proposta pelo WhatsApp com link do orçamento"
              : "Cliente sem telefone cadastrado"
          }
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer active:scale-100"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
          {busy ? "Preparando..." : "Enviar no WhatsApp"}
        </Button>

        <Button
          type="button"
          onClick={() => void openEmailPreview()}
          disabled={anyBusy}
          title="Pré-visualizar e enviar proposta por e-mail"
          className="flex items-center gap-2 bg-sky-700 hover:bg-sky-800 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer active:scale-100"
        >
          {emailBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          {emailBusy ? "Preparando..." : "Enviar por e-mail"}
        </Button>

        <Button
          type="button"
          onClick={() => void handleDownloadPdf()}
          disabled={anyBusy}
          title={
            getPhoneLastFourDigits(clientPhone)
              ? "Baixar PDF protegido com a senha dos 4 últimos dígitos do celular"
              : "Cadastre o telefone do cliente para baixar o PDF com senha"
          }
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer active:scale-100"
        >
          {pdfBusy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {pdfBusy ? "Gerando PDF..." : "Baixar PDF"}
        </Button>

        <Button
          type="button"
          onClick={handlePrint}
          disabled={anyBusy}
          title="Abrir diálogo de impressão"
          variant="outline"
          className="flex items-center gap-2 border-neutral-500 text-neutral-200 hover:bg-neutral-800 disabled:opacity-60 text-sm font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer"
        >
          <Printer className="h-4 w-4" />
          Imprimir
        </Button>
      </div>
      <p className="max-w-[380px] text-right text-[10px] text-neutral-400 leading-snug">
        {emailReady
          ? "E-mail: prévia antes de enviar. Baixar PDF: senha = 4 últimos dígitos do celular."
          : "Cliente sem e-mail — você pode informar o destinatário na prévia. PDF: senha = 4 últimos dígitos."}
      </p>

      <EmailSendPreviewDialog
        open={previewOpen}
        onClose={() => !sending && setPreviewOpen(false)}
        title="Enviar orçamento por e-mail"
        loading={previewLoading}
        error={previewError}
        preview={preview}
        sending={sending}
        onConfirm={confirmEmailSend}
      />

      <ActionDialog
        open={feedback !== null}
        variant={feedback?.variant ?? "success"}
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
        onClose={() => setFeedback(null)}
      />
    </div>
  );
}
