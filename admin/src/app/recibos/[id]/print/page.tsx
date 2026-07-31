import { notFound, redirect } from "next/navigation";
import { getCachedSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import ReceiptPrintDocument from "@/components/ReceiptPrintDocument";
import ReceiptPrintToolbar from "@/components/ReceiptPrintToolbar";
import { buildReceiptPrintPayload } from "@/app/actions/receipts";
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

  if (session.user.cargo === "VIEWER") {
    redirect("/financeiro");
  }

  const { id } = await params;
  const companyId = session.user.company_id || "mock-company-id";

  const receipt = await prisma.paymentReceipt.findFirst({
    where: { id, company_id: companyId },
    include: {
      client: { select: { telefone: true, email: true, nome: true, id: true } },
    },
  });

  if (!receipt) notFound();

  const shareCode = await ensureReceiptShareCode(receipt.id);
  const shareUrl = resolveReceiptPublicUrl(shareCode);
  const printData = await buildReceiptPrintPayload(receipt, {
    validateUrl: shareUrl,
  });

  return (
    <ReceiptPrintDocument
      receipt={printData}
      topBar={
        <ReceiptPrintToolbar
          receiptId={receipt.id}
          valor={Number(receipt.valor)}
          clientName={receipt.cliente_nome}
          clientPhone={receipt.client?.telefone || ""}
          clientEmail={receipt.client?.email || null}
          backHref={`/clientes/${receipt.client.id}`}
          initialShareUrl={shareUrl}
          numeroLabel={printData.numeroLabel}
        />
      }
    />
  );
}
