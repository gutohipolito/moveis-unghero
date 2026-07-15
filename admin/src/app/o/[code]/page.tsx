import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import QuotePrintDocument from "@/components/QuotePrintDocument";
import QuotePublicPrintBar from "@/components/QuotePublicPrintBar";
import { parseQuoteSubitens } from "@/lib/quoteItems";

export const dynamic = "force-dynamic";

type PublicQuotePageProps = {
  params: Promise<{ code: string }>;
};

export async function generateMetadata({
  params,
}: PublicQuotePageProps): Promise<Metadata> {
  const { code } = await params;
  const normalized = code.trim().toLowerCase();

  const quote = await prisma.quote.findFirst({
    where: { pdf_share_code: normalized },
    select: {
      project: { select: { client: { select: { nome: true } } } },
    },
  });

  const clientName = quote?.project.client.nome ?? "Cliente";

  return {
    title: `Orçamento | ${clientName} | Móveis Unghero`,
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function PublicQuotePage({ params }: PublicQuotePageProps) {
  const { code } = await params;
  const normalized = code.trim().toLowerCase();

  if (!/^[a-z0-9]{6,12}$/.test(normalized)) {
    notFound();
  }

  const dbQuote = await prisma.quote.findFirst({
    where: { pdf_share_code: normalized },
    include: {
      items: true,
      partner: {
        select: {
          nome: true,
          tipo: true,
          escritorio: true,
          registro_profissional: true,
          fotoUrl: true,
        },
      },
      project: {
        include: {
          client: {
            select: {
              nome: true,
              cidade: true,
              bairro: true,
            },
          },
        },
      },
    },
  });

  if (!dbQuote) {
    notFound();
  }

  const quote = {
    desconto: Number(dbQuote.desconto),
    valor_final: Number(dbQuote.valor_final),
    observacoes: dbQuote.observacoes,
    partner: dbQuote.partner,
    items: dbQuote.items.map((item) => ({
      descricao: item.descricao,
      quantidade: item.quantidade,
      valor_unitario: Number(item.valor_unitario),
      valor_total: Number(item.valor_total),
      subitens: parseQuoteSubitens(item.subitens),
    })),
  };

  const client = dbQuote.project.client;
  const validadeLabel = new Date(dbQuote.validade).toLocaleDateString("pt-BR");
  const emissaoLabel = (dbQuote.pdf_shared_at ?? new Date()).toLocaleDateString("pt-BR");

  return (
    <QuotePrintDocument
      quote={quote}
      client={client}
      emissaoLabel={emissaoLabel}
      validadeLabel={validadeLabel}
      topBar={<QuotePublicPrintBar />}
    />
  );
}
