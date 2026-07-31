"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Loader2, Mail, MessageCircle, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import ActionDialog from "@/components/ActionDialog";
import { formatPhoneForWhatsApp } from "@/lib/google-review";
import {
  buildReceiptWhatsAppMessage,
  openReceiptWhatsApp,
} from "@/lib/receiptShare";
import { formatCurrencyBRL } from "@/lib/currencyExtenso";
import { sendReceiptByEmail } from "@/app/actions/emailInbox";
import {
  downloadPdfBlob,
  generatePrintPagePdfBlob,
} from "@/lib/quotePdfClient";
import { slugifyFileName } from "@/lib/quoteWhatsApp";
import { getPhoneLastFourDigits } from "@/lib/phone";

interface ReceiptPrintToolbarProps {
  receiptId: string;
  valor: number;
  clientName: string;
  clientPhone: string;
  clientEmail?: string | null;
  backHref?: string;
  initialShareUrl?: string | null;
  numeroLabel?: string | null;
}

type FeedbackDialog = {
  variant: "success" | "error";
  title: string;
  message: string;
} | null;

export default function ReceiptPrintToolbar({
  receiptId,
  valor,
  clientName,
  clientPhone,
  clientEmail,
  backHref = "/clientes",
  initialShareUrl,
  numeroLabel,
}: ReceiptPrintToolbarProps) {
  const [shareUrl, setShareUrl] = useState(initialShareUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackDialog>(null);
  const phoneReady = Boolean(formatPhoneForWhatsApp(clientPhone));
  const emailReady = Boolean(clientEmail?.includes("@"));
  const anyBusy = busy || emailBusy || pdfBusy;

  const ensureShareLink = useCallback(async () => {
    if (shareUrl) return shareUrl;

    const response = await fetch(`/api/receipts/${receiptId}/share`, {
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
      throw new Error(data.error || "Não foi possível gerar o link do recibo.");
    }

    setShareUrl(data.url);
    return data.url;
  }, [shareUrl, receiptId]);

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
      const suffix = numeroLabel
        ? slugifyFileName(numeroLabel)
        : slugifyFileName(clientName);
      downloadPdfBlob(blob, `recibo-${suffix}.pdf`);
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

  async function handleWhatsApp() {
    if (!phoneReady) {
      window.alert(
        "Cadastre o telefone/WhatsApp do cliente para enviar o recibo."
      );
      return;
    }

    setBusy(true);
    try {
      const url = await ensureShareLink();
      const message = buildReceiptWhatsAppMessage({
        clientName,
        valorLabel: formatCurrencyBRL(valor),
        receiptUrl: url,
        numeroLabel,
      });
      const opened = openReceiptWhatsApp(clientPhone, message);
      if (!opened) {
        throw new Error("Telefone inválido para WhatsApp.");
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Não foi possível preparar o envio.";
      window.alert(msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleEmail() {
    if (!clientEmail?.includes("@")) {
      window.alert("Cadastre o e-mail do cliente para enviar o recibo.");
      return;
    }
    setEmailBusy(true);
    try {
      const res = await sendReceiptByEmail({
        receiptId,
        to: clientEmail.trim(),
      });
      if (!res.success) {
        throw new Error(res.error || "Falha ao enviar e-mail.");
      }
      window.alert(`Recibo enviado para ${"to" in res ? res.to : clientEmail}.`);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Não foi possível enviar o e-mail.";
      window.alert(msg);
    } finally {
      setEmailBusy(false);
    }
  }

  return (
    <div className="print:hidden flex flex-col gap-1.5 max-w-[210mm] mx-auto px-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-600 hover:text-neutral-900"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={handleWhatsApp}
            disabled={anyBusy || !phoneReady}
            title={
              phoneReady
                ? "Enviar recibo pelo WhatsApp"
                : "Cliente sem telefone cadastrado"
            }
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageCircle className="h-4 w-4" />
            )}
            {busy ? "Preparando..." : "WhatsApp"}
          </Button>
          <Button
            type="button"
            onClick={() => void handleEmail()}
            disabled={anyBusy || !emailReady}
            title={
              emailReady
                ? "Enviar recibo por e-mail (caixa Financeiro)"
                : "Cliente sem e-mail cadastrado"
            }
            className="gap-1.5 bg-sky-700 hover:bg-sky-800 disabled:opacity-60 text-white font-bold"
          >
            {emailBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            {emailBusy ? "Enviando..." : "E-mail"}
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
            className="gap-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-bold"
          >
            {pdfBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {pdfBusy ? "Gerando..." : "Baixar PDF"}
          </Button>
          <Button
            type="button"
            onClick={() => window.print()}
            disabled={anyBusy}
            title="Abrir diálogo de impressão"
            variant="outline"
            className="gap-1.5 border-neutral-400 text-neutral-700 hover:bg-neutral-100 font-bold"
          >
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
        </div>
      </div>
      <p className="text-right text-[10px] text-neutral-500 leading-snug">
        Baixar PDF: arquivo com senha (4 últimos dígitos do celular). Imprimir: A4 · margens Nenhuma.
      </p>

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
