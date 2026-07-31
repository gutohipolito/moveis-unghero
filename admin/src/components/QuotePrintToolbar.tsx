"use client";

import { useCallback, useState } from "react";
import { Loader2, Mail, MessageCircle, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPhoneForWhatsApp } from "@/lib/google-review";
import { getPhoneLastFourDigits } from "@/lib/phone";
import { buildQuoteWhatsAppMessage, openQuoteWhatsApp } from "@/lib/quoteWhatsApp";
import { sendQuoteByEmail } from "@/app/actions/emailInbox";

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
  const phoneReady = Boolean(formatPhoneForWhatsApp(clientPhone));
  const emailReady = Boolean(clientEmail?.includes("@"));

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
          disabled={busy || emailBusy || !phoneReady}
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
          disabled={busy || emailBusy || !emailReady}
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
          onClick={handlePrint}
          disabled={busy || emailBusy}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer active:scale-100"
        >
          <Printer className="h-4 w-4" />
          Imprimir / Salvar PDF
        </Button>
      </div>
      <p className="max-w-[340px] text-right text-[10px] text-neutral-400 leading-snug">
        Impressão: A4 · margens Nenhuma · escala 100% · desmarque Cabeçalhos e rodapés
      </p>
    </div>
  );
}
