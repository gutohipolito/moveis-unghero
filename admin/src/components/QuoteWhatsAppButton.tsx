"use client";

import { useState } from "react";
import { Loader2, MessageCircle } from "lucide-react";
import html2canvas from "html2canvas-pro";
import { Button } from "@/components/ui/button";
import {
  buildQuoteWhatsAppMessage,
  openQuoteWhatsApp,
  slugifyFileName,
} from "@/lib/quoteWhatsApp";
import { formatPhoneForWhatsApp } from "@/lib/google-review";

interface QuoteWhatsAppButtonProps {
  quoteId: string;
  clientName: string;
  clientPhone: string;
  valorFinal: string;
  validade: string;
}

async function generateQuotePdfBlob() {
  const element = document.querySelector<HTMLElement>(".print-page");
  if (!element) {
    throw new Error("Não foi possível localizar o conteúdo do orçamento.");
  }

  const { jsPDF } = await import("jspdf");

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    width: element.scrollWidth,
    height: element.scrollHeight,
    windowWidth: element.scrollWidth,
  });

  const pdf = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "portrait",
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const imgData = canvas.toDataURL("image/jpeg", 0.92);

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  return pdf.output("blob");
}

async function uploadQuotePdf(quoteId: string, blob: Blob, fileName: string) {
  const formData = new FormData();
  formData.append("file", blob, fileName);

  const response = await fetch(`/api/quotes/${quoteId}/pdf-share`, {
    method: "POST",
    body: formData,
  });

  const data = (await response.json()) as { success?: boolean; url?: string; error?: string };
  if (!response.ok || !data.success || !data.url) {
    throw new Error(data.error || "Falha ao publicar o PDF");
  }

  return data.url;
}

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

function downloadPdf(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function QuoteWhatsAppButton({
  quoteId,
  clientName,
  clientPhone,
  valorFinal,
  validade,
}: QuoteWhatsAppButtonProps) {
  const [loading, setLoading] = useState(false);
  const phoneReady = Boolean(formatPhoneForWhatsApp(clientPhone));

  async function handleClick() {
    if (!phoneReady) {
      window.alert("Cadastre o telefone/WhatsApp do cliente para enviar a proposta.");
      return;
    }

    setLoading(true);

    try {
      const fileName = `orcamento-${slugifyFileName(clientName)}.pdf`;
      const pdfBlob = await generateQuotePdfBlob();
      const pdfFile = new File([pdfBlob], fileName, { type: "application/pdf" });

      let pdfUrl: string | undefined;
      try {
        pdfUrl = await uploadQuotePdf(quoteId, pdfBlob, fileName);
      } catch {
        pdfUrl = undefined;
      }

      const message = buildQuoteWhatsAppMessage({
        clientName,
        valorFinal,
        validade,
        pdfUrl,
      });

      const sharedNatively = await tryNativeShare(pdfFile, message);
      if (sharedNatively) {
        return;
      }

      if (!pdfUrl) {
        downloadPdf(pdfBlob, fileName);
      }

      const opened = openQuoteWhatsApp(clientPhone, message);
      if (!opened) {
        throw new Error("Telefone do cliente inválido para WhatsApp.");
      }

      if (!pdfUrl) {
        window.alert(
          "O PDF foi baixado no seu computador. Anexe o arquivo na conversa do WhatsApp que acabou de abrir."
        );
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Não foi possível preparar o envio.";
      window.alert(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={loading || !phoneReady}
      title={
        phoneReady
          ? "Gerar PDF e enviar proposta pelo WhatsApp"
          : "Cliente sem telefone cadastrado"
      }
      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-all cursor-pointer"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <MessageCircle className="h-4 w-4" />
      )}
      {loading ? "Preparando..." : "Enviar no WhatsApp"}
    </Button>
  );
}
