"use client";

import { useCallback, useState } from "react";
import { Download, Loader2, Mail, MessageCircle, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPhoneForWhatsApp } from "@/lib/google-review";
import { getPhoneLastFourDigits } from "@/lib/phone";
import { buildQuoteWhatsAppMessage, openQuoteWhatsApp, slugifyFileName } from "@/lib/quoteWhatsApp";
import { sendQuoteByEmail } from "@/app/actions/emailInbox";
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
  const phoneReady = Boolean(formatPhoneForWhatsApp(clientPhone));
  const emailReady = Boolean(clientEmail?.includes("@"));
  const anyBusy = busy || emailBusy || pdfBusy;

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
      window.alert(
        "Cadastre o telefone do cliente (com pelo menos 4 dígitos) para gerar o PDF com senha."
      );
      return;
    }
    setPdfBusy(true);
    try {
      const blob = await generatePrintPagePdfBlob({ userPassword: pin });
      downloadPdfBlob(blob, `orcamento-${slugifyFileName(clientName)}.pdf`);
      window.alert(
        `PDF baixado com senha.\n\nSenha: ${pin}\n(os 4 últimos dígitos do celular do cliente)`
      );
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Não foi possível gerar o PDF.";
      window.alert(msg);
    } finally {
      setPdfBusy(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  async function handleWhatsApp() {
    if (!phoneReady) {
      window.alert("Cadastre o telefone/WhatsApp do cliente para enviar a proposta.");
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
      window.alert(msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleEmail() {
    const to = clientEmail?.trim();
    if (!to?.includes("@")) {
      window.alert("Cadastre o e-mail do cliente para enviar a proposta.");
      return;
    }
    setEmailBusy(true);
    try {
      const res = await sendQuoteByEmail({ quoteId, to });
      if (!res.success) {
        throw new Error(res.error || "Falha ao enviar e-mail.");
      }
      window.alert(`Orçamento enviado para ${res.to}.`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Não foi possível enviar o e-mail.";
      window.alert(msg);
    } finally {
      setEmailBusy(false);
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
          onClick={() => void handleEmail()}
          disabled={anyBusy || !emailReady}
          title={
            emailReady
              ? "Enviar proposta por e-mail (caixa Comercial)"
              : "Cliente sem e-mail cadastrado"
          }
          className="flex items-center gap-2 bg-sky-700 hover:bg-sky-800 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer active:scale-100"
        >
          {emailBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          {emailBusy ? "Enviando..." : "Enviar por e-mail"}
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
        Baixar PDF: arquivo com senha (4 últimos dígitos do celular). Imprimir: A4 · margens Nenhuma.
      </p>
    </div>
  );
}
