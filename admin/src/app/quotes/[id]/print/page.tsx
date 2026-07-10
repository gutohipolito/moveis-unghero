import { getCachedSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarClock, ShieldCheck, Wrench } from "lucide-react";
import PrintButton from "@/components/PrintButton";

interface PrintPageProps {
  params: Promise<{ id: string }>;
}

const FACTORY = {
  name: "Móveis Unghero LTDA",
  cnpj: "13.415.510/0001-71",
  street: "Rua Cenira Cambruzzi, 155",
  neighborhood: "Planalto",
  city: "Farroupilha — RS",
  whatsapp: "(54) 9 9997-1050",
  email: "moveisunghero@gmail.com",
  site: "moveisunghero.com.br",
};

const COMMERCIAL_NOTES = [
  {
    icon: CalendarClock,
    text: "O prazo de entrega estimado é acordado individualmente por projeto técnico.",
  },
  {
    icon: ShieldCheck,
    text: "Garantia estrutural de 5 anos nos painéis de MDF contra defeitos de fabricação.",
  },
  {
    icon: Wrench,
    text: "A montagem é executada por técnicos especializados da própria fábrica.",
  },
] as const;

function PaymentBrandPix() {
  return (
    <svg viewBox="0 0 48 32" className="h-7 w-auto" aria-label="Pix">
      <rect width="48" height="32" rx="4" fill="#32BCAD" />
      <path
        d="M24 8c-2.2 0-4.2.9-5.7 2.3L14.6 14l-3.7-3.7C9.4 8.9 7.4 8 5.2 8 2.3 8 0 10.3 0 13.2s2.3 5.2 5.2 5.2c2.2 0 4.2-.9 5.7-2.3l3.7-3.7 3.7 3.7c1.5 1.4 3.5 2.3 5.7 2.3 2.9 0 5.2-2.3 5.2-5.2S26.9 8 24 8zm-18.8 7.2c-1.2 0-2.2-1-2.2-2.2s1-2.2 2.2-2.2 2.2 1 2.2 2.2-1 2.2-2.2 2.2zm18.8 0c-1.2 0-2.2-1-2.2-2.2s1-2.2 2.2-2.2 2.2 1 2.2 2.2-1 2.2-2.2 2.2zm12.8-7.2c-2.2 0-4.2.9-5.7 2.3l-3.7 3.7 3.7 3.7c1.5 1.4 3.5 2.3 5.7 2.3 2.9 0 5.2-2.3 5.2-5.2S42.7 8 36.8 8zm0 7.2c-1.2 0-2.2-1-2.2-2.2s1-2.2 2.2-2.2 2.2 1 2.2 2.2-1 2.2-2.2 2.2z"
        fill="#fff"
        transform="translate(4, 4) scale(0.85)"
      />
    </svg>
  );
}

function PaymentBrandVisa() {
  return (
    <svg viewBox="0 0 48 32" className="h-7 w-auto" aria-label="Visa">
      <rect width="48" height="32" rx="4" fill="#1A1F71" />
      <path
        d="M19.2 21h-2.8l1.7-10.5h2.8L19.2 21zm12.1-10.2c-.6-.2-1.5-.5-2.6-.5-2.9 0-4.9 1.5-4.9 3.7 0 1.6 1.5 2.5 2.6 3 1.1.5 1.5.9 1.5 1.3 0 .7-.9 1.1-1.7 1.1-1.1 0-1.7-.2-2.6-.5l-.4-.2-.4 2.6c.7.3 1.9.6 3.2.6 3.1 0 5.1-1.5 5.1-3.9 0-1.3-.8-2.3-2.5-3.1-1-.5-1.7-.9-1.7-1.4 0-.5.5-.9 1.5-.9.9 0 1.5.2 2 .4l.3.1.4-2.4zm7.2-.3h-2.2c-.7 0-1.2.2-1.5.9l-4.2 9.6h2.9l.6-1.6h3.5l.3 1.6H39l-2.5-10.5zm-3 6.5l1.4-3.9.8 3.9h-2.2zM17 10.5l-2.7 10.5h-2.9L9 10.5h2.7l1.6 8.2L15 10.5H17z"
        fill="#fff"
      />
    </svg>
  );
}

function PaymentBrandMastercard() {
  return (
    <svg viewBox="0 0 48 32" className="h-7 w-auto" aria-label="Mastercard">
      <rect width="48" height="32" rx="4" fill="#252525" />
      <circle cx="19" cy="16" r="8" fill="#EB001B" />
      <circle cx="29" cy="16" r="8" fill="#F79E1B" />
      <path
        d="M24 10.2a8 8 0 0 1 0 11.6 8 8 0 0 1 0-11.6z"
        fill="#FF5F00"
      />
    </svg>
  );
}

function PaymentBrandElo() {
  return (
    <svg viewBox="0 0 48 32" className="h-7 w-auto" aria-label="Elo">
      <rect width="48" height="32" rx="4" fill="#000" />
      <circle cx="16" cy="16" r="6" fill="#FFCB05" />
      <circle cx="24" cy="16" r="6" fill="#00A4E0" />
      <circle cx="32" cy="16" r="6" fill="#EF4123" />
    </svg>
  );
}

function PaymentBrandBoleto() {
  return (
    <svg viewBox="0 0 48 32" className="h-7 w-auto" aria-label="Boleto">
      <rect width="48" height="32" rx="4" fill="#F5F5F5" stroke="#D4D4D4" />
      <rect x="6" y="8" width="2" height="16" fill="#404040" />
      <rect x="10" y="8" width="1" height="16" fill="#404040" />
      <rect x="13" y="8" width="3" height="16" fill="#404040" />
      <rect x="18" y="8" width="1" height="16" fill="#404040" />
      <rect x="21" y="8" width="2" height="16" fill="#404040" />
      <rect x="25" y="8" width="1" height="16" fill="#404040" />
      <rect x="28" y="8" width="3" height="16" fill="#404040" />
      <rect x="33" y="8" width="2" height="16" fill="#404040" />
      <rect x="37" y="8" width="1" height="16" fill="#404040" />
      <rect x="40" y="8" width="2" height="16" fill="#404040" />
    </svg>
  );
}

function PrintTopHeader() {
  return (
    <header className="print-quote-header bg-neutral-900 text-white px-[20mm] py-5 flex items-center justify-between gap-6">
      <img
        src="/logo.png"
        alt="Móveis Unghero"
        className="h-11 w-auto object-contain brightness-0 invert"
      />
      <p className="text-sm sm:text-base font-bold tracking-wide uppercase text-right">
        Orçamento Comercial detalhado
      </p>
    </header>
  );
}

function PrintBottomFooter() {
  return (
    <footer className="print-quote-footer bg-neutral-700 text-neutral-200 px-[20mm] py-4 mt-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 text-[9px] leading-relaxed">
        <div className="space-y-0.5">
          <p className="text-white font-bold text-[10px]">{FACTORY.name}</p>
          <p>
            <span className="text-neutral-400">CNPJ:</span> {FACTORY.cnpj}
          </p>
          <p>
            <span className="text-neutral-400">Rua:</span> {FACTORY.street}
          </p>
          <p>
            <span className="text-neutral-400">Bairro:</span> {FACTORY.neighborhood}
          </p>
          <p>
            <span className="text-neutral-400">Cidade:</span> {FACTORY.city}
          </p>
        </div>
        <div className="sm:text-right space-y-0.5 text-white font-semibold">
          <p>{FACTORY.whatsapp}</p>
          <p>{FACTORY.email}</p>
          <p>{FACTORY.site}</p>
        </div>
      </div>
      <p className="text-center text-[8px] text-neutral-400 leading-relaxed mt-4 pt-3 border-t border-white/10">
        Documento comercial de uso exclusivo entre as partes. Os dados pessoais aqui
        constantes são tratados conforme a LGPD (Lei nº 13.709/2018), exclusivamente
        para elaboração e acompanhamento desta proposta.
      </p>
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
                    <p>
                      <span className="font-semibold text-neutral-700">Bairro:</span>{" "}
                      {client.bairro}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex gap-2 shrink-0">
                <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/60 px-3 py-2 text-center min-w-[92px]">
                  <span className="text-[8px] font-extrabold uppercase tracking-widest text-emerald-600 block">
                    Emissão
                  </span>
                  <p className="text-xs font-bold text-emerald-800 mt-0.5">{formattedDataEmissao}</p>
                </div>
                <div className="rounded-lg border border-rose-200/80 bg-rose-50/60 px-3 py-2 text-center min-w-[92px]">
                  <span className="text-[8px] font-extrabold uppercase tracking-widest text-rose-600 block">
                    Validade
                  </span>
                  <p className="text-xs font-bold text-rose-800 mt-0.5">{formattedValidade}</p>
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
            <section className="space-y-3">
              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-500 text-center">
                Notas comerciais
              </h4>
              <div className="grid grid-cols-3 gap-3">
                {COMMERCIAL_NOTES.map(({ icon: Icon, text }) => (
                  <div
                    key={text.slice(0, 24)}
                    className="flex flex-col items-center text-center rounded-xl border border-neutral-200 bg-neutral-50/50 px-3 py-3.5"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 border border-amber-200/80 mb-2">
                      <Icon className="h-4 w-4 text-amber-700" strokeWidth={2.25} />
                    </div>
                    <p className="text-[9px] text-neutral-600 leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Condições de pagamento */}
            <section className="rounded-xl border border-neutral-200 p-4 space-y-3">
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
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <PaymentBrandPix />
                <PaymentBrandVisa />
                <PaymentBrandMastercard />
                <PaymentBrandElo />
                <PaymentBrandBoleto />
              </div>
            </section>
          </main>

          <PrintBottomFooter />
        </div>
      </div>
    </div>
  );
}
