import { getCachedSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import QuotePrintToolbar from "@/components/QuotePrintToolbar";
import QuotePrintDocument from "@/components/QuotePrintDocument";
import { parseQuoteSubitens } from "@/lib/quoteItems";
import { ensureQuotePdfShareCode, resolveQuotePdfPublicUrl } from "@/lib/quotePdfShare";
import { formatDateBR } from "@/lib/brazilDate";
import { summarizeQuoteItems } from "@/lib/quoteApproval";

interface PrintPageProps {
  params: Promise<{ id: string }>;
}

type LoadedPrintQuote = {
  id: string;
  project_id: string;
  template_tipo: string;
  codigo: string | null;
  desconto: number;
  valor_final: number;
  observacoes: string | null;
  validade: Date;
  pdfPublicUrl: string | null;
  approvedTotal?: number;
  pendingTotal?: number;
  rejectedTotal?: number;
  lastUpdatedAt?: string | null;
  partner: {
    nome: string;
    tipo: string;
    escritorio: string | null;
    registro_profissional: string | null;
    fotoUrl: string | null;
  } | null;
  project: {
    client: {
      nome: string;
      telefone: string;
      cidade: string;
      bairro: string | null;
    };
  };
  items: Array<{
    descricao: string;
    quantidade: number;
    valor_unitario: number;
    valor_total: number;
    subitens: string[];
    produto_nome: string | null;
    produto_imagem_url: string | null;
    status?: string | null;
    aprovado_em?: string | null;
  }>;
};

export default async function PrintQuotePage({ params }: PrintPageProps) {
  const session = await getCachedSession();
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;
  const companyId = session.user.company_id || "mock-company-id";

  let quote: LoadedPrintQuote | null = null;

  try {
    const dbQuote = await prisma.quote.findFirst({
      where: {
        id,
        project: { client: { company_id: companyId } },
      },
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
            client: true,
          },
        },
      },
    });

    if (dbQuote) {
      const pdfShareCode = await ensureQuotePdfShareCode(dbQuote.id);
      const pdfPublicUrl = resolveQuotePdfPublicUrl({
        pdf_share_code: pdfShareCode,
        pdf_share_url: dbQuote.pdf_share_url,
      });

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

      quote = {
        id: dbQuote.id,
        project_id: dbQuote.project_id,
        template_tipo: dbQuote.template_tipo,
        codigo: dbQuote.codigo,
        desconto: Number(dbQuote.desconto),
        valor_final: Number(dbQuote.valor_final),
        observacoes: dbQuote.observacoes,
        validade: dbQuote.validade,
        pdfPublicUrl,
        partner: dbQuote.partner,
        project: dbQuote.project,
        approvedTotal: summary.approvedTotal,
        pendingTotal: summary.pendingTotal,
        rejectedTotal: summary.rejectedTotal,
        lastUpdatedAt: lastApproved
          ? formatDateBR(lastApproved)
          : formatDateBR(dbQuote.createdAt),
        items,
      };
    }
  } catch (error) {
    console.warn("Falha ao carregar orçamento para impressão:", error);
  }

  if (!quote) {
    notFound();
  }

  const client = quote.project.client;
  const formattedValidade = formatDateBR(quote.validade);
  const formattedDataEmissao = formatDateBR();

  return (
    <QuotePrintDocument
      quote={quote}
      client={client}
      emissaoLabel={formattedDataEmissao}
      validadeLabel={formattedValidade}
      topBar={
        <div className="print:hidden sticky top-0 bg-neutral-900 text-white p-4 flex items-center justify-between shadow-md z-50">
          <Link
            href={`/projects/${quote.project_id || "proj-1"}`}
            className="inline-flex items-center text-sm text-neutral-300 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para o Projeto
          </Link>
          <QuotePrintToolbar
            quoteId={quote.id}
            clientName={client.nome}
            clientPhone={client.telefone}
            validade={formattedValidade}
            initialPdfShareUrl={quote.pdfPublicUrl}
          />
        </div>
      }
    />
  );
}
