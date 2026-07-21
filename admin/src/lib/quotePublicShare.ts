import { prisma } from "@/lib/prisma";
import type { QuotePrintClient, QuotePrintData } from "@/components/QuotePrintDocument";
import { parseQuoteSubitens } from "@/lib/quoteItems";
import { formatDateBR } from "@/lib/brazilDate";
import { summarizeQuoteItems } from "@/lib/quoteApproval";

export async function loadPublicQuoteByShareCode(code: string) {
  const normalized = code.trim().toLowerCase();
  if (!/^[a-z0-9]{6,12}$/.test(normalized)) {
    return null;
  }

  const dbQuote = await prisma.quote.findFirst({
    where: { pdf_share_code: normalized },
    include: {
      items: {
        include: {
          showcaseProduct: {
            select: { nome: true, imagem_url: true },
          },
        },
      },
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

  const items = dbQuote.items.map((item) => ({
    id: item.id,
    descricao: item.descricao,
    quantidade: item.quantidade,
    valor_unitario: Number(item.valor_unitario),
    valor_total: Number(item.valor_total),
    subitens: parseQuoteSubitens(item.subitens),
    produto_nome: item.showcaseProduct?.nome ?? null,
    produto_imagem_url: item.showcaseProduct?.imagem_url ?? null,
    status: item.status,
    aprovado_em: item.aprovado_em ? item.aprovado_em.toISOString() : null,
  }));
  const summary = summarizeQuoteItems(items);
  const lastApproved = items
    .map((i) => i.aprovado_em)
    .filter(Boolean)
    .sort()
    .at(-1);

  const quote: QuotePrintData = {
    desconto: Number(dbQuote.desconto),
    valor_final: Number(dbQuote.valor_final),
    observacoes: dbQuote.observacoes,
    partner: dbQuote.partner,
    approvedTotal: summary.approvedTotal,
    pendingTotal: summary.pendingTotal,
    rejectedTotal: summary.rejectedTotal,
    lastUpdatedAt: lastApproved
      ? formatDateBR(lastApproved)
      : formatDateBR(dbQuote.pdf_shared_at ?? dbQuote.createdAt),
    items,
  };

  const client: QuotePrintClient = dbQuote.project.client;
  const validadeLabel = formatDateBR(dbQuote.validade);
  const emissaoLabel = formatDateBR(dbQuote.pdf_shared_at ?? new Date());

  return {
    quote,
    client,
    validadeLabel,
    emissaoLabel,
    clientName: client.nome,
  };
}
