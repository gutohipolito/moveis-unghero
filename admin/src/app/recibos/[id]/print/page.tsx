import { notFound, redirect } from "next/navigation";
import { getCachedSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import ReceiptPrintDocument from "@/components/ReceiptPrintDocument";
import ReceiptPrintToolbar from "@/components/ReceiptPrintToolbar";
import { labelPaymentMethod } from "@/lib/paymentMethods";
import {
  ensureReceiptShareCode,
  resolveReceiptPublicUrl,
} from "@/lib/receiptShare";

interface PrintPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReceiptPrintPage({ params }: PrintPageProps) {
  const session = await getCachedSession();
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;
  const companyId = session.user.company_id || "mock-company-id";

  const receipt = await prisma.paymentReceipt.findFirst({
    where: { id, company_id: companyId },
    include: {
      client: { select: { telefone: true, nome: true, id: true } },
    },
  });

  if (!receipt) notFound();

  const shareCode = await ensureReceiptShareCode(receipt.id);
  const shareUrl = resolveReceiptPublicUrl(shareCode);

  return (
    <ReceiptPrintDocument
      receipt={{
        numero: receipt.numero,
        valor: Number(receipt.valor),
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
      topBar={
        <ReceiptPrintToolbar
          receiptId={receipt.id}
          receiptNumero={receipt.numero}
          valor={Number(receipt.valor)}
          clientName={receipt.cliente_nome}
          clientPhone={receipt.client?.telefone || ""}
          backHref={`/clientes/${receipt.client.id}`}
          initialShareUrl={shareUrl}
        />
      }
    />
  );
}
