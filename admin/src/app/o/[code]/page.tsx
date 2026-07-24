import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QuotePrintDocument from "@/components/QuotePrintDocument";
import QuotePublicPrintBar from "@/components/QuotePublicPrintBar";
import { loadPublicQuoteByShareCode } from "@/lib/quotePublicShare";
import { PUBLIC_PAGE_COPY, publicPageMetadata } from "@/lib/publicPageMetadata";
import { recordQuotePublicView } from "@/lib/quoteViewTracking";

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
  const copy = PUBLIC_PAGE_COPY.quote;

  return publicPageMetadata({
    title: copy.title(clientName),
    description: copy.description,
  });
}

export default async function PublicQuotePage({ params }: PublicQuotePageProps) {
  const { code } = await params;
  const data = await loadPublicQuoteByShareCode(code);

  if (!data) {
    notFound();
  }

  const hdrs = await headers();
  await recordQuotePublicView(data.quoteId, hdrs.get("user-agent"));

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
