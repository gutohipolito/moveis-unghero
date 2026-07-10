import { getCachedSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import PrintButton from "@/components/PrintButton";

interface PrintPageProps {
  params: Promise<{ id: string }>;
}

const FACTORY = {
  name: "Móveis Unghero LTDA",
  cnpj: "13.415.510/0001-71",
  address: "Rua Cenira Cambruzzi, 155 — Planalto",
  city: "Farroupilha — RS",
  phone: "(54) 9 9997-1050",
  whatsapp: "(54) 9 9997-1050",
  email: "moveisunghero@gmail.com",
  site: "moveisunghero.com.br",
};

function PrintTopHeader() {
  return (
    <header className="print-quote-header bg-neutral-900 text-white px-[20mm] py-5 flex items-center justify-between gap-6">
      <img
        src="/logo.png"
        alt="Móveis Unghero"
        className="h-11 w-auto object-contain brightness-0 invert"
      />
      <div className="text-right">
        <p className="text-sm sm:text-base font-bold tracking-wide uppercase">
          Orçamento Comercial detalhado
        </p>
        <p className="text-[9px] text-neutral-400 mt-0.5 tracking-widest uppercase">
          Marcenaria fina & design sob medida
        </p>
      </div>
    </header>
  );
}

function PrintBottomFooter({ version }: { version: number }) {
  return (
    <footer className="print-quote-footer bg-neutral-900 text-neutral-300 px-[20mm] py-4 mt-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 text-[9px] leading-relaxed">
        <div className="space-y-0.5">
          <p className="text-white font-bold text-[10px]">{FACTORY.name}</p>
          <p>CNPJ {FACTORY.cnpj}</p>
          <p>{FACTORY.address}</p>
          <p>{FACTORY.city}</p>
        </div>
        <div className="sm:text-right space-y-0.5">
          <p>
            <span className="text-neutral-500">WhatsApp:</span>{" "}
            <span className="text-white font-semibold">{FACTORY.whatsapp}</span>
          </p>
          <p>
            <span className="text-neutral-500">Telefone:</span>{" "}
            <span className="text-white font-semibold">{FACTORY.phone}</span>
          </p>
          <p>
            <span className="text-neutral-500">E-mail:</span>{" "}
            <span className="text-white font-semibold">{FACTORY.email}</span>
          </p>
          <p>
            <span className="text-neutral-500">Site:</span>{" "}
            <span className="text-white font-semibold">{FACTORY.site}</span>
          </p>
          <p className="text-neutral-500 pt-1">Proposta v{version}</p>
        </div>
      </div>
    </footer>
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

  return (
    <div className="bg-slate-100 text-black min-h-screen font-sans print:bg-white">
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
            padding: 0 !important;
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
            min-height: 297mm;
            margin: 20px auto;
            box-sizing: border-box;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            background-color: #ffffff;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            overflow: hidden;
          }
        }
        .print-quote-header {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .print-quote-footer {
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
      `}} />

      <div className="print:hidden sticky top-0 bg-neutral-900 text-white p-4 flex items-center justify-between shadow-md z-50">
        <Link
          href={`/projects/${quote.project_id || "proj-1"}`}
          className="inline-flex items-center text-sm text-neutral-300 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para o Projeto
        </Link>
        <PrintButton />
      </div>

      <div className="max-w-[840px] mx-auto p-4 md:p-8 print:p-0">
        <div className="print-page flex flex-col">
          <PrintTopHeader />

          <main className="flex-1 px-[20mm] py-6 space-y-5">
            {/* Informações do cliente */}
            <section className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-5 pb-5 border-b border-neutral-100">
              <div className="space-y-2 min-w-0">
                <span className="text-[9px] text-neutral-400 font-extrabold uppercase tracking-widest">
                  Cliente
                </span>
                <p className="text-base font-bold text-neutral-950 truncate">{client.nome}</p>
                <div className="text-xs text-neutral-600 space-y-0.5">
                  <p>
                    <span className="font-semibold text-neutral-700">Cidade:</span>{" "}
                    {client.cidade}
                  </p>
                  {client.bairro ? (
                    <p className="text-neutral-500 pl-0 sm:pl-1">{client.bairro}</p>
                  ) : null}
                </div>
              </div>

              <div className="flex sm:flex-col gap-4 sm:gap-3 sm:text-right shrink-0">
                <div>
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-700 block">
                    Emissão
                  </span>
                  <p className="text-sm font-bold text-emerald-800">{formattedDataEmissao}</p>
                </div>
                <div>
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-rose-700 block">
                    Validade
                  </span>
                  <p className="text-sm font-bold text-rose-800">{formattedValidade}</p>
                </div>
              </div>
            </section>

            {/* Subtítulo (sem título "Tabela comercial") */}
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Relação completa de marcenaria sob medida, ferragens e serviços.
            </p>

            {/* Tabela — mantida */}
            <div className="overflow-hidden border border-neutral-200 rounded-xl">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 text-neutral-500 uppercase font-bold bg-neutral-50/50 text-[10px]">
                    <th className="py-3.5 px-4 w-7/12">Descrição Detalhada do Item</th>
                    <th className="py-3.5 px-4 text-center w-1/12">Qtd</th>
                    <th className="py-3.5 px-4 text-right w-2/12">Unitário</th>
                    <th className="py-3.5 px-4 text-right w-2/12">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-150 text-neutral-800">
                  {quote.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-3.5 px-4 font-semibold text-neutral-950 leading-relaxed">
                        {item.descricao}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-neutral-700">
                        {item.quantidade}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-neutral-600">
                        {formatCurrency(item.valor_unitario)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-neutral-950">
                        {formatCurrency(item.valor_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Investimento total — card à direita, colado na tabela */}
            <div className="flex justify-end -mt-1">
              <div className="border border-neutral-200 rounded-xl px-5 py-3.5 bg-neutral-50/80 min-w-[240px] space-y-1">
                {quote.desconto > 0 ? (
                  <p className="text-[10px] text-emerald-700 font-semibold text-right">
                    Desconto: -{formatCurrency(quote.desconto)}
                  </p>
                ) : null}
                <div className="flex items-baseline justify-end gap-2">
                  <span className="text-xs font-bold text-neutral-600 uppercase tracking-wide">
                    Investimento total:
                  </span>
                  <span className="text-lg font-black text-neutral-950">
                    {formatCurrency(quote.valor_final)}
                  </span>
                </div>
              </div>
            </div>

            {/* Notas comerciais */}
            <section className="rounded-xl border border-neutral-200 bg-neutral-50/40 p-4 space-y-2.5">
              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-500">
                Notas comerciais
              </h4>
              <ul className="text-[10px] text-neutral-600 leading-relaxed space-y-1.5 list-none">
                <li className="flex gap-2">
                  <span className="text-amber-600 font-bold shrink-0">•</span>
                  <span>O prazo de entrega estimado é acordado individualmente por projeto técnico.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-600 font-bold shrink-0">•</span>
                  <span>Garantia estrutural de 5 anos nos painéis de MDF contra defeitos de fabricação.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-600 font-bold shrink-0">•</span>
                  <span>A montagem é executada por técnicos especializados da própria fábrica.</span>
                </li>
              </ul>
            </section>

            {/* Condições de pagamento */}
            <section className="rounded-xl border border-neutral-200 p-4 space-y-2">
              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-500">
                Condições de pagamento
              </h4>
              <div className="text-[10px] text-neutral-700 leading-relaxed space-y-2">
                <p>
                  <span className="font-bold text-neutral-900">À vista:</span> 5% de desconto no PIX ou
                  transferência.
                </p>
                <p>
                  <span className="font-bold text-neutral-900">Parcelado:</span> Entrada de 40% (confirmação
                  do pedido) + 60% parcelado em até 6x no cartão de crédito ou boleto (mediante análise).
                </p>
              </div>
            </section>
          </main>

          <PrintBottomFooter version={quote.versao} />
        </div>
      </div>
    </div>
  );
}
