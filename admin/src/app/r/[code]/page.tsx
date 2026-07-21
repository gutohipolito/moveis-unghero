import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReceiptPrintDocument from "@/components/ReceiptPrintDocument";
import ReceiptPublicPrintBar from "@/components/ReceiptPublicPrintBar";
import { getPaymentReceiptByShareCode } from "@/app/actions/receipts";
import { labelPaymentMethod } from "@/lib/paymentMethods";

export const metadata: Metadata = {
  title: "Recibo de pagamento — Móveis Unghero",
  robots: { index: false, follow: false, nocache: true },
};

interface PublicReceiptPageProps {
  params: Promise<{ code: string }>;
}

export default async function PublicReceiptPage({ params }: PublicReceiptPageProps) {
  const { code } = await params;
  const receipt = await getPaymentReceiptByShareCode(code);
  if (!receipt) notFound();

  return (
    <ReceiptPrintDocument
      receipt={{
        id: receipt.id,
        valor: receipt.valor,
        parcela_numero: receipt.parcela_numero,
        parcela_total: receipt.parcela_total,
        referente: receipt.referente,
        metodoLabel: labelPaymentMethod(receipt.metodo_pagamento),
        data_recebimento: receipt.data_recebimento,
        cidade_emissao: receipt.cidade_emissao,
        quitacao: receipt.quitacao,
        cliente_nome: receipt.cliente_nome,
        cliente_documento: receipt.cliente_documento,
        cliente_endereco: receipt.cliente_endereco,
        emitido_por_nome: receipt.emitido_por_nome,
        observacoes: receipt.observacoes,
      }}
      topBar={<ReceiptPublicPrintBar />}
    />
  );
}
