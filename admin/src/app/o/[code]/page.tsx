import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QuotePrintDocument from "@/components/QuotePrintDocument";
import QuotePublicAccessGate from "@/components/QuotePublicAccessGate";
import QuotePublicPrintBar from "@/components/QuotePublicPrintBar";
import { getFirstName } from "@/lib/google-review";
import { loadPublicQuoteByShareCode } from "@/lib/quotePublicShare";
import { isQuoteShareUnlocked } from "@/lib/quoteShareAccess";
import { PUBLIC_PAGE_COPY, publicPageMetadata } from "@/lib/publicPageMetadata";
import { recordQuotePublicView, resolveQuoteViewUserAgent } from "@/lib/quoteViewTracking";

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
  const normalized = code.trim().toLowerCase();
  const data = await loadPublicQuoteByShareCode(normalized);

  if (!data) {
    notFound();
  }

  if (data.requiresPin) {
    const unlocked = await isQuoteShareUnlocked(normalized);
    if (!unlocked) {
      return (
        <QuotePublicAccessGate
          code={normalized}
          clientFirstName={getFirstName(data.clientName)}
        />
      );
    }
  }

  const hdrs = await headers();
  // Proxy HostGator marca X-Quote-View-Client e registra via POST /api/o/.../view
  // (beacon no browser). Sem o header (acesso direto no admin), registra aqui.
  if (!hdrs.get("x-quote-view-client")) {
    const { userAgent, hints } = resolveQuoteViewUserAgent(hdrs);
    // Sem UA real (ex.: proxy antigo), não grava Desktop falso — o beacon corrige.
    await recordQuotePublicView(data.quoteId, userAgent, hints);
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
