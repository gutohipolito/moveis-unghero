import { getCachedSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { resolveClientDocument } from "@/lib/clientDocument";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import PrintButton from "@/components/PrintButton";

interface PrintPageProps {
  params: Promise<{ id: string }>;
}

function PrintHeader({ pageNum, title }: { pageNum: string; title: string }) {
  return (
    <div className="w-full border-b-2 border-amber-500/20 pb-4 mb-6">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Móveis Unghero"
            className="h-10 w-auto object-contain"
            style={{ filter: "sepia(1) saturate(1.5) hue-rotate(340deg) brightness(0.6)" }}
          />
          <div>
            <h1 className="text-sm font-extrabold tracking-wider text-neutral-900 leading-tight">
              MÓVEIS UNGHERO
            </h1>
            <span className="text-[8px] uppercase tracking-widest text-neutral-400 font-semibold block">
              Marcenaria Fina & Design Sob Medida
            </span>
          </div>
        </div>

        <div className="text-[8px] text-neutral-500 text-right leading-relaxed font-medium">
          <p><strong>Móveis Unghero LTDA</strong> // CNPJ 13.415.510/0001-71</p>
          <p>Rua Cenira Cambruzzi, 155 - Planalto - Farroupilha - RS</p>
          <p>Fone: (54) 9 9997-1050 // moveisunghero@gmail.com</p>
        </div>
      </div>

      <div className="flex justify-between items-center mt-3 pt-2 border-t border-neutral-100">
        <h4 className="text-xs font-black text-neutral-800 uppercase tracking-widest">
          {title}
        </h4>
        <span className="text-[9px] font-black text-amber-700 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10 tracking-widest">
          FOLHA {pageNum}
        </span>
      </div>
    </div>
  );
}

function PrintFooter({ version }: { version: number }) {
  return (
    <div className="w-full border-t border-neutral-100 pt-3 mt-6 flex justify-between items-center text-[9px] text-neutral-400 font-medium">
      <div>
        Este documento é uma proposta comercial sujeita a alteração sem aviso prévio.
      </div>
      <div>
        Proposta Comercial v{version} — moveisunghero.com.br
      </div>
    </div>
  );
}

export default async function PrintQuotePage({ params }: PrintPageProps) {
  const session = await getCachedSession();
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;
  const companyId = session.user.company_id || "mock-company-id";

  let quote = null;

  try {
    const dbQuote = await prisma.quote.findFirst({
      where: {
        id,
        project: { client: { company_id: companyId } },
      },
      include: {
        items: true,
        project: {
          include: {
            client: true,
          },
        },
      },
    });

    if (dbQuote) {
      quote = {
        ...dbQuote,
        subtotal: Number(dbQuote.subtotal),
        desconto: Number(dbQuote.desconto),
        valor_final: Number(dbQuote.valor_final),
        items: dbQuote.items.map((item) => ({
          ...item,
          valor_unitario: Number(item.valor_unitario),
          valor_total: Number(item.valor_total),
        })),
      };
    }
  } catch (error) {
    console.warn("Falha ao carregar orçamento para impressão:", error);
  }

  if (!quote) {
    notFound();
  }

  const client = quote.project.client;
  const formattedValidade = new Date(quote.validade).toLocaleDateString("pt-BR");
  const formattedDataEmissao = new Date().toLocaleDateString("pt-BR");
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

  const doc = resolveClientDocument(client);

  return (
    <div className="bg-slate-50 text-black min-h-screen font-sans print:bg-white">
      <style dangerouslySetInnerHTML={{ __html: `
        @page {
          size: A4 portrait;
          margin: 0;
        }
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          .print-page {
            height: 297mm !important;
            width: 210mm !important;
            max-height: 297mm !important;
            page-break-after: always !important;
            break-after: page !important;
            padding: 20mm !important;
            margin: 0 !important;
            box-sizing: border-box !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
        @media screen {
          .print-page {
            width: 210mm;
            height: 297mm;
            margin: 20px auto;
            padding: 20mm;
            box-sizing: border-box;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            background-color: #ffffff;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          }
        }
      `}} />

      <div className="print:hidden sticky top-0 bg-neutral-900 text-white p-4 flex items-center justify-between shadow-md z-50">
        <Link
          href={`/projects/${quote.project_id || "proj-1"}`}
          className="inline-flex items-center text-sm text-neutral-300 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para o Projeto
        </Link>
        <div className="flex items-center gap-3">
          <PrintButton />
        </div>
      </div>

      <div className="max-w-[800px] mx-auto p-4 md:p-8 space-y-8 print:p-0 print:space-y-0">
        <div className="print-page flex flex-col justify-between">
          <div className="space-y-6">
            <PrintHeader pageNum="01" title="Detalhamento Comercial" />

            <div className="grid grid-cols-2 gap-4 text-sm text-neutral-700 border border-neutral-100 rounded-lg p-4 bg-neutral-50/50">
              <div>
                <span className="text-[10px] text-neutral-400 font-bold block uppercase tracking-wider">Cliente</span>
                <strong className="text-neutral-900">{client.nome}</strong>
                {doc.documento && (
                  <span className="text-xs text-neutral-500 block font-semibold mt-0.5">
                    {doc.tipo_pessoa}: {doc.documento}
                  </span>
                )}
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 font-bold block uppercase tracking-wider">Cidade</span>
                <strong className="text-neutral-900">{client.cidade}</strong>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 font-bold block uppercase tracking-wider">Emissão</span>
                <strong className="text-neutral-900">{formattedDataEmissao}</strong>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 font-bold block uppercase tracking-wider">Validade</span>
                <strong className="text-neutral-900">{formattedValidade}</strong>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-neutral-900 tracking-tight">Valores e Itens do Projeto</h3>
              <div className="h-0.5 w-10 bg-amber-500" />
            </div>

            <table className="w-full text-sm text-left border-collapse mt-4">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500 text-xs uppercase font-bold bg-neutral-50">
                  <th className="p-3">Descrição do Item</th>
                  <th className="p-3 text-center">Qtd</th>
                  <th className="p-3 text-right">Unitário</th>
                  <th className="p-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-700">
                {quote.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-3 font-medium text-neutral-950">{item.descricao}</td>
                    <td className="p-3 text-center">{item.quantidade}</td>
                    <td className="p-3 text-right">{formatCurrency(item.valor_unitario)}</td>
                    <td className="p-3 text-right font-semibold">{formatCurrency(item.valor_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-8 border-t border-neutral-200 pt-6 space-y-2 max-w-sm ml-auto">
              <div className="flex justify-between text-sm text-neutral-600">
                <span>Subtotal dos Itens:</span>
                <span>{formatCurrency(quote.subtotal)}</span>
              </div>
              {quote.desconto > 0 && (
                <div className="flex justify-between text-sm text-amber-600 font-medium">
                  <span>Desconto Aplicado:</span>
                  <span>-{formatCurrency(quote.desconto)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-neutral-200 pt-2 text-lg font-black text-neutral-950">
                <span>VALOR TOTAL VENDIDO:</span>
                <span>{formatCurrency(quote.valor_final)}</span>
              </div>
            </div>
          </div>

          <PrintFooter version={quote.versao} />
        </div>
      </div>
    </div>
  );
}
