import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { parsePartnerSessionToken } from "@/lib/partnerSession";
import { loadPartnerCommissionReceiptForPartner } from "@/lib/partnerPortal";
import PartnerCommissionReceiptPrint from "@/components/PartnerCommissionReceiptPrint";
import ParceiroCommissionPrintToolbar from "./ParceiroCommissionPrintToolbar";

interface PrintPageProps {
  params: Promise<{ receiptId: string }>;
}

export default async function ParceiroCommissionPrintPage({
  params,
}: PrintPageProps) {
  const cookieStore = await cookies();
  const partnerId = parsePartnerSessionToken(
    cookieStore.get("parceiro-session")?.value
  );
  if (!partnerId) {
    redirect("/parceiro/login");
  }

  const { receiptId } = await params;
  const receipt = await loadPartnerCommissionReceiptForPartner(
    partnerId,
    receiptId
  );
  if (!receipt) notFound();

  const numeroLabel = String(receipt.numero).padStart(4, "0");

  return (
    <div className="min-h-screen bg-stone-200/80 print:bg-white print:min-h-0 py-0 sm:py-6 print:py-0">
      <PartnerCommissionReceiptPrint
        receipt={receipt}
        topBar={<ParceiroCommissionPrintToolbar numeroLabel={numeroLabel} />}
      />
    </div>
  );
}
