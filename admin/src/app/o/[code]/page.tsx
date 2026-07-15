import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QuotePrintDocument from "@/components/QuotePrintDocument";
import QuotePublicPrintBar from "@/components/QuotePublicPrintBar";
import { loadPublicQuoteByShareCode } from "@/lib/quotePublicHtml";

export const dynamic = "force-dynamic";

type PublicQuotePageProps = {
  params: Promise<{ code: string }>;
};

export async function generateMetadata({
  params,
}: PublicQuotePageProps): Promise<Metadata> {
  const { code } = await params;
  const data = await loadPublicQuoteByShareCode(code);
  const clientName = data?.clientName ?? "Cliente";

  return {
    title: `Orçamento | ${clientName} | Móveis Unghero`,
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function PublicQuotePage({ params }: PublicQuotePageProps) {
  const { code } = await params;
  const data = await loadPublicQuoteByShareCode(code);

  if (!data) {
    notFound();
  }

  return (
    <QuotePrintDocument
      quote={data.quote}
      client={data.client}
      emissaoLabel={data.emissaoLabel}
      validadeLabel={data.validadeLabel}
      topBar={<QuotePublicPrintBar />}
    />
  );
}
