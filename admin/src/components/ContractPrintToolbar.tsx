"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Loader2, MessageCircle, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import ActionDialog from "@/components/ActionDialog";
import { formatPhoneForWhatsApp } from "@/lib/google-review";
import {
  buildContractWhatsAppMessage,
  openContractWhatsApp,
} from "@/lib/contractWhatsApp";
import {
  downloadPdfBlob,
  generatePrintPagePdfBlob,
} from "@/lib/quotePdfClient";
import { slugifyFileName } from "@/lib/quoteWhatsApp";
import { getPhoneLastFourDigits } from "@/lib/phone";

interface ContractPrintToolbarProps {
  contractId: string;
  clientName: string;
  clientPhone: string;
  initialShareUrl?: string | null;
}

type FeedbackDialog = {
  variant: "success" | "error";
  title: string;
  message: string;
} | null;

export default function ContractPrintToolbar({
  contractId,
  clientName,
  clientPhone,
  initialShareUrl,
}: ContractPrintToolbarProps) {
  const [shareUrl, setShareUrl] = useState(initialShareUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackDialog>(null);
  const phoneReady = Boolean(formatPhoneForWhatsApp(clientPhone));
  const anyBusy = busy || pdfBusy;

  const ensureShareLink = useCallback(async () => {
    if (shareUrl) return shareUrl;

    const response = await fetch(`/api/contracts/${contractId}/share`, {
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
      throw new Error(data.error || "Não foi possível gerar o link do contrato.");
    }

    setShareUrl(data.url);
    return data.url;
  }, [shareUrl, contractId]);

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
      downloadPdfBlob(blob, `contrato-${slugifyFileName(clientName)}.pdf`);
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
        "Cadastre o telefone/WhatsApp do cliente (ou vincule um cliente com telefone) para enviar o contrato."
      );
      return;
    }

    setBusy(true);
    try {
      const url = await ensureShareLink();
      const message = buildContractWhatsAppMessage({
        clientName,
        contractUrl: url,
      });
      const opened = openContractWhatsApp(clientPhone, message);
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

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 max-w-[210mm] mx-auto px-1">
      <Link
        href="/contratos"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-600 hover:text-neutral-900"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar aos contratos
      </Link>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          onClick={handleWhatsApp}
          disabled={anyBusy || !phoneReady}
          title={
            phoneReady
              ? "Enviar contrato pelo WhatsApp para assinatura"
              : "Cliente sem telefone cadastrado"
          }
          className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MessageCircle className="h-4 w-4" />
          )}
          {busy ? "Preparando..." : "WhatsApp (assinatura)"}
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
