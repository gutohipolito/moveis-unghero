import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReceiptPrintDocument from "@/components/ReceiptPrintDocument";
import ReceiptPublicAccessGate from "@/components/ReceiptPublicAccessGate";
import ReceiptPublicPrintBar from "@/components/ReceiptPublicPrintBar";
import { buildReceiptPrintPayload } from "@/app/actions/receipts";
import { prisma } from "@/lib/prisma";
import { getFirstName } from "@/lib/google-review";
import { getPhoneLastFourDigits } from "@/lib/phone";
import { buildReceiptShortUrl } from "@/lib/receiptShare";
import { isReceiptShareUnlocked } from "@/lib/receiptShareAccess";
import { PUBLIC_PAGE_COPY, publicPageMetadata } from "@/lib/publicPageMetadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = publicPageMetadata({
  title: PUBLIC_PAGE_COPY.receipt.title,
  description: PUBLIC_PAGE_COPY.receipt.description,
});

interface PublicReceiptPageProps {
  params: Promise<{ code: string }>;
}

export default async function PublicReceiptPage({ params }: PublicReceiptPageProps) {
  const { code } = await params;
  const normalized = code.trim().toLowerCase();
  if (!/^[a-z0-9]{6,12}$/.test(normalized)) notFound();

  const receipt = await prisma.paymentReceipt.findFirst({
    where: { share_code: normalized },
    include: {
      client: { select: { telefone: true, nome: true } },
    },
  });
  if (!receipt) notFound();

  const requiresPin = Boolean(getPhoneLastFourDigits(receipt.client?.telefone || ""));
  if (requiresPin) {
    const unlocked = await isReceiptShareUnlocked(normalized);
    if (!unlocked) {
      const name = receipt.client?.nome || receipt.cliente_nome;
      return (
        <ReceiptPublicAccessGate
          code={normalized}
          clientFirstName={getFirstName(name)}
        />
      );
    }
  }

  const printData = await buildReceiptPrintPayload(receipt, {
    validateUrl: buildReceiptShortUrl(normalized),
  });

  return (
    <ReceiptPrintDocument
      receipt={printData}
      topBar={<ReceiptPublicPrintBar />}
    />
  );
}
