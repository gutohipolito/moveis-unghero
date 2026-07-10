"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPhoneForWhatsApp } from "@/lib/google-review";
import {
  downloadQuotePdf,
  generateQuotePdfBlob,
  publishQuotePdfShare,
  QuotePdfBlobNotConfiguredError,
} from "@/lib/quotePdfClient";
import {
  buildQuoteWhatsAppMessage,
  openQuoteWhatsApp,
  slugifyFileName,
} from "@/lib/quoteWhatsApp";

interface QuotePrintToolbarProps {
  quoteId: string;
  clientName: string;
  clientPhone: string;
  valorFinal: string;
  validade: string;
  initialPdfShareUrl?: string | null;
}

type PdfLinkStatus = "idle" | "preparing" | "ready" | "unavailable";

async function tryNativeShare(file: File, message: string) {
  if (typeof navigator === "undefined" || !navigator.share || !navigator.canShare) {
    return false;
  }

  const payload = { files: [file], text: message, title: "Orçamento Móveis Unghero" };
  if (!navigator.canShare(payload)) {
    return false;
  }

  await navigator.share(payload);
  return true;
}

export default function QuotePrintToolbar({
  quoteId,
  clientName,
  clientPhone,
  valorFinal,
  validade,
  initialPdfShareUrl,
}: QuotePrintToolbarProps) {
  const [pdfShareUrl, setPdfShareUrl] = useState(initialPdfShareUrl ?? null);
  const [pdfStatus, setPdfStatus] = useState<PdfLinkStatus>(
    initialPdfShareUrl ? "ready" : "idle"
  );
  const [busyAction, setBusyAction] = useState<"print" | "whatsapp" | null>(null);
  const prefetchStarted = useRef(false);
  const phoneReady = Boolean(formatPhoneForWhatsApp(clientPhone));

  const ensurePdfShareLink = useCallback(
    async (force = false) => {
      if (!force && pdfShareUrl) {
        setPdfStatus("ready");
        return { url: pdfShareUrl, blob: null as Blob | null };
      }

      setPdfStatus("preparing");
      try {
        const { url, blob } = await publishQuotePdfShare(quoteId, clientName);
        setPdfShareUrl(url);
        setPdfStatus("ready");
        return { url, blob };
      } catch (error) {
        if (error instanceof QuotePdfBlobNotConfiguredError) {
          setPdfStatus("unavailable");
          return { url: null, blob: await generateQuotePdfBlob() };
        }
        setPdfStatus(pdfShareUrl ? "ready" : "idle");
        throw error;
      }
    },
    [clientName, pdfShareUrl, quoteId]
  );

  useEffect(() => {
    if (prefetchStarted.current || initialPdfShareUrl) return;
    prefetchStarted.current = true;

    const timer = window.setTimeout(() => {
      void ensurePdfShareLink().catch(() => {
        // Falha silenciosa no prefetch — o usuário pode tentar de novo ao imprimir/enviar.
      });
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [ensurePdfShareLink, initialPdfShareUrl]);

  async function handlePrint() {
    setBusyAction("print");
    try {
      await ensurePdfShareLink();
      window.print();
    } catch (error) {
      window.print();
      const msg = error instanceof Error ? error.message : "Não foi possível gerar o link do PDF.";
      window.alert(msg);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleWhatsApp() {
    if (!phoneReady) {
      window.alert("Cadastre o telefone/WhatsApp do cliente para enviar a proposta.");
      return;
    }

    setBusyAction("whatsapp");
    try {
      const { url, blob } = await ensurePdfShareLink();
      const pdfBlob = blob ?? (await generateQuotePdfBlob());
      const fileName = `orcamento-${slugifyFileName(clientName)}.pdf`;
      const pdfFile = new File([pdfBlob], fileName, { type: "application/pdf" });

      const message = buildQuoteWhatsAppMessage({
        clientName,
        valorFinal,
        validade,
        pdfUrl: url ?? undefined,
      });

      const sharedNatively = await tryNativeShare(pdfFile, message);
      if (sharedNatively) {
        return;
      }

      if (!url) {
        downloadQuotePdf(pdfBlob, clientName);
      }

      const opened = openQuoteWhatsApp(clientPhone, message);
      if (!opened) {
        throw new Error("Telefone do cliente inválido para WhatsApp.");
      }

      if (!url) {
        window.alert(
          "O link público do PDF não está disponível (configure o Blob na Vercel). O arquivo foi baixado — anexe-o na conversa do WhatsApp."
        );
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Não foi possível preparar o envio.";
      window.alert(msg);
    } finally {
      setBusyAction(null);
    }
  }

  const isBusy = busyAction !== null || pdfStatus === "preparing";

  return (
    <div className="flex items-center gap-2">
      {pdfStatus === "ready" ? (
        <span className="hidden sm:inline text-[10px] text-emerald-400 font-medium">
          Link do PDF pronto
        </span>
      ) : null}
      {pdfStatus === "preparing" ? (
        <span className="hidden sm:inline text-[10px] text-neutral-400">Gerando link...</span>
      ) : null}

      <Button
        type="button"
        onClick={handleWhatsApp}
        disabled={isBusy || !phoneReady}
        title={
          phoneReady
            ? "Enviar proposta pelo WhatsApp com link do PDF"
            : "Cliente sem telefone cadastrado"
        }
        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-all cursor-pointer"
      >
        {busyAction === "whatsapp" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MessageCircle className="h-4 w-4" />
        )}
        {busyAction === "whatsapp" ? "Preparando..." : "Enviar no WhatsApp"}
      </Button>

      <Button
        type="button"
        onClick={handlePrint}
        disabled={isBusy}
        className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-all cursor-pointer"
      >
        {busyAction === "print" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Printer className="h-4 w-4" />
        )}
        {busyAction === "print" ? "Preparando..." : "Imprimir / Salvar PDF"}
      </Button>
    </div>
  );
}
