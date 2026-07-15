import { prisma } from "@/lib/prisma";
import type { QuotePrintClient, QuotePrintData } from "@/components/QuotePrintDocument";
import { parseQuoteSubitens } from "@/lib/quoteItems";

export async function loadPublicQuoteByShareCode(code: string) {
  const normalized = code.trim().toLowerCase();
  if (!/^[a-z0-9]{6,12}$/.test(normalized)) {
    return null;
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

  if (!dbQuote) return null;

  const quote: QuotePrintData = {
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

  const client: QuotePrintClient = dbQuote.project.client;
  const validadeLabel = new Date(dbQuote.validade).toLocaleDateString("pt-BR");
  const emissaoLabel = (dbQuote.pdf_shared_at ?? new Date()).toLocaleDateString("pt-BR");

  return {
    quote,
    client,
    validadeLabel,
    emissaoLabel,
    clientName: client.nome,
  };
}
