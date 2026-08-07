import { notFound, redirect } from "next/navigation";
import { getCachedSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import PartnerCommissionReceiptPrint from "@/components/PartnerCommissionReceiptPrint";
import PartnerCommissionReceiptToolbar from "@/components/PartnerCommissionReceiptToolbar";
import { getPartnerCommissionReceipt } from "@/app/actions/partnerCommissions";

interface PrintPageProps {
  params: Promise<{ id: string }>;
}

export default async function PartnerCommissionPrintPage({ params }: PrintPageProps) {
  const session = await getCachedSession();
  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.cargo === "VIEWER") {
    redirect("/parceiros");
  }

  const { id } = await params;
  const res = await getPartnerCommissionReceipt(id);
  if (!res.success || !res.receipt) notFound();

  const companyId = session.user.company_id;
  const scoped = await prisma.partnerCommissionReceipt.findFirst({
    where: { id, company_id: companyId || undefined },
    select: { id: true },
  });
  if (!scoped) notFound();

  const numeroLabel = String(res.receipt.numero).padStart(4, "0");
  const receipt = res.receipt;

  return (
    <div className="min-h-screen bg-stone-200/80 print:bg-white print:min-h-0 py-0 sm:py-6 print:py-0">
      <PartnerCommissionReceiptPrint
        receipt={receipt}
        topBar={
          <PartnerCommissionReceiptToolbar
            receiptId={receipt.id}
            numeroLabel={numeroLabel}
            partnerName={receipt.parceiro_nome}
            partnerPhone={receipt.parceiro_telefone}
            partnerEmail={receipt.parceiro_email}
            valor={receipt.valor_comissao}
            nfNumero={receipt.nota_fiscal_numero}
            backHref={
              res.partnerId
                ? `/parceiros/${res.partnerId}?tab=comprovantes`
                : "/parceiros"
            }
          />
        }
      />
    </div>
  );
}
