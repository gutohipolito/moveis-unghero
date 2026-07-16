"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, MessageCircle, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPhoneForWhatsApp } from "@/lib/google-review";
import {
  buildContractWhatsAppMessage,
  openContractWhatsApp,
} from "@/lib/contractWhatsApp";

interface ContractPrintToolbarProps {
  contractId: string;
  clientName: string;
  clientPhone: string;
  initialShareUrl?: string | null;
}

export default function ContractPrintToolbar({
  contractId,
  clientName,
  clientPhone,
  initialShareUrl,
}: ContractPrintToolbarProps) {
  const [shareUrl, setShareUrl] = useState(initialShareUrl ?? null);
  const [busy, setBusy] = useState(false);
  const phoneReady = Boolean(formatPhoneForWhatsApp(clientPhone));

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
          disabled={busy || !phoneReady}
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
          onClick={() => window.print()}
          disabled={busy}
          className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold"
        >
          <Printer className="h-4 w-4" /> Imprimir / Salvar PDF
        </Button>
      </div>
    </div>
  );
}
