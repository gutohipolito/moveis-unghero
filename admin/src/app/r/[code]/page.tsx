import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReceiptPrintDocument from "@/components/ReceiptPrintDocument";
import ReceiptPublicPrintBar from "@/components/ReceiptPublicPrintBar";
import { buildReceiptPrintPayload } from "@/app/actions/receipts";
import { prisma } from "@/lib/prisma";
import { PUBLIC_PAGE_COPY, publicPageMetadata } from "@/lib/publicPageMetadata";

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
  });
  if (!receipt) notFound();

  const printData = await buildReceiptPrintPayload(receipt);

  return (
    <ReceiptPrintDocument
      receipt={printData}
      topBar={<ReceiptPublicPrintBar />}
    />
  );
}
