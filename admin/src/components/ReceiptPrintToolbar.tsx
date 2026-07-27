"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, MessageCircle, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPhoneForWhatsApp } from "@/lib/google-review";
import {
  buildReceiptWhatsAppMessage,
  openReceiptWhatsApp,
} from "@/lib/receiptShare";
import { formatCurrencyBRL } from "@/lib/currencyExtenso";

interface ReceiptPrintToolbarProps {
  receiptId: string;
  valor: number;
  clientName: string;
  clientPhone: string;
  backHref?: string;
  initialShareUrl?: string | null;
}

export default function ReceiptPrintToolbar({
  receiptId,
  valor,
  clientName,
  clientPhone,
  backHref = "/clientes",
  initialShareUrl,
}: ReceiptPrintToolbarProps) {
  const [shareUrl, setShareUrl] = useState(initialShareUrl ?? null);
  const [busy, setBusy] = useState(false);
  const phoneReady = Boolean(formatPhoneForWhatsApp(clientPhone));

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

  return (
    <div className="print:hidden flex flex-col gap-1.5 max-w-[210mm] mx-auto px-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-600 hover:text-neutral-900"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={handleWhatsApp}
            disabled={busy || !phoneReady}
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
            onClick={() => window.print()}
            disabled={busy}
            className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold"
          >
            <Printer className="h-4 w-4" /> Imprimir / Salvar PDF
          </Button>
        </div>
      </div>
      <p className="text-right text-[10px] text-neutral-500 leading-snug">
        Impressão: A4 · margens Nenhuma · escala 100% · desmarque Cabeçalhos e rodapés
      </p>
    </div>
  );
}
