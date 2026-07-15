import { renderToStaticMarkup } from "react-dom/server";
import { prisma } from "@/lib/prisma";
import QuotePrintDocument, {
  quotePrintStylesCss,
  type QuotePrintClient,
  type QuotePrintData,
} from "@/components/QuotePrintDocument";
import { parseQuoteSubitens } from "@/lib/quoteItems";

export const PUBLIC_QUOTE_ASSET_BASE = "https://admin.moveisunghero.com.br";

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

function StaticPrintBar() {
  return (
    <div className="print:hidden sticky top-0 bg-neutral-900 text-white p-3 flex items-center justify-between shadow-md z-50">
      <p className="text-sm text-neutral-300 font-medium">Orçamento Móveis Unghero</p>
      <a
        href="javascript:window.print()"
        className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-lg no-underline"
      >
        Salvar PDF
      </a>
    </div>
  );
}

/** HTML autocontido para proxy em moveisunghero.com.br (sem JS do Next.js). */
export function buildPublicQuoteHtmlDocument(data: {
  quote: QuotePrintData;
  client: QuotePrintClient;
  emissaoLabel: string;
  validadeLabel: string;
  clientName: string;
}) {
  const body = renderToStaticMarkup(
    <QuotePrintDocument
      quote={data.quote}
      client={data.client}
      emissaoLabel={data.emissaoLabel}
      validadeLabel={data.validadeLabel}
      assetBase={PUBLIC_QUOTE_ASSET_BASE}
      topBar={<StaticPrintBar />}
    />
  );

  const title = `Orçamento | ${data.clientName} | Móveis Unghero`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>${escapeHtml(title)}</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <style>${quotePrintStylesCss()}</style>
</head>
<body class="min-h-full bg-slate-100 text-black antialiased">
${body}
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
