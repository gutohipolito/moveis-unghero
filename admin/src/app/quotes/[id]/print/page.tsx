import { getCachedSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarClock, ShieldCheck, Wrench } from "lucide-react";
import QuotePrintToolbar from "@/components/QuotePrintToolbar";
import { PAYMENT_BRANDS } from "@/lib/paymentBrands";

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
  whatsappHref: "https://wa.me/5554999971050",
  email: "moveisunghero@gmail.com",
  emailHref: "mailto:moveisunghero@gmail.com",
  site: "moveisunghero.com.br",
  siteHref: "https://moveisunghero.com.br",
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
    <footer className="print-quote-footer bg-neutral-900 text-neutral-300 px-[20mm] py-4 mt-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 text-[9px] leading-relaxed">
        <div className="space-y-0.5">
          <p className="text-white font-bold text-[10px]">{FACTORY.name}</p>
          <p>
            <span className="text-neutral-500">CNPJ:</span> {FACTORY.cnpj}
          </p>
          <p>
            <span className="text-neutral-500">Rua:</span> {FACTORY.street}
          </p>
          <p>
            <span className="text-neutral-500">Bairro:</span> {FACTORY.neighborhood}
            <span className="text-neutral-600 mx-1.5">|</span>
            {FACTORY.city}
          </p>
        </div>
        <div className="sm:text-right space-y-0.5 font-semibold">
          <p>
            <a
              href={FACTORY.whatsappHref}
              className="print-footer-link text-white hover:text-neutral-200"
              target="_blank"
              rel="noopener noreferrer"
            >
              {FACTORY.whatsapp}
            </a>
          </p>
          <p>
            <a
              href={FACTORY.emailHref}
              className="print-footer-link text-white hover:text-neutral-200"
            >
              {FACTORY.email}
            </a>
          </p>
          <p>
            <a
              href={FACTORY.siteHref}
              className="print-footer-link text-white hover:text-neutral-200"
              target="_blank"
              rel="noopener noreferrer"
            >
              {FACTORY.site}
            </a>
          </p>
        </div>
      </div>
      <div
        className="my-4 h-px w-full"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.22) 50%, transparent 100%)",
        }}
        aria-hidden
      />
      <p className="text-center text-[8px] text-neutral-500 leading-relaxed max-w-[90%] mx-auto">
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
        .print-footer-link {
          color: #ffffff;
          text-decoration: none;
        }
        @media print {
          .print-footer-link {
            text-decoration: underline;
            text-underline-offset: 2px;
          }
          a[href^="http"]::after,
          a[href^="mailto"]::after {
            content: none !important;
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
        <QuotePrintToolbar
          quoteId={quote.id}
          clientName={client.nome}
          clientPhone={client.telefone}
          valorFinal={formatCurrency(quote.valor_final)}
          validade={formattedValidade}
          initialPdfShareUrl={quote.pdf_share_url}
        />
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

              <div className="flex gap-3 shrink-0 self-start">
                <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/60 px-3.5 py-2.5 text-center min-w-[96px]">
                  <span className="text-[8px] font-extrabold uppercase tracking-widest text-emerald-600 block mb-1">
                    Emissão
                  </span>
                  <p className="text-[11px] font-bold text-emerald-800 leading-none">{formattedDataEmissao}</p>
                </div>
                <div className="rounded-lg border border-rose-200/80 bg-rose-50/60 px-3.5 py-2.5 text-center min-w-[96px]">
                  <span className="text-[8px] font-extrabold uppercase tracking-widest text-rose-600 block mb-1">
                    Validade
                  </span>
                  <p className="text-[11px] font-bold text-rose-800 leading-none">{formattedValidade}</p>
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
              <div className="border border-neutral-200 rounded-lg px-3.5 py-2 bg-neutral-50/80 min-w-[200px] space-y-0.5">
                {quote.desconto > 0 ? (
                  <p className="text-[9px] text-emerald-700 font-semibold text-right">
                    Desconto: -{formatCurrency(quote.desconto)}
                  </p>
                ) : null}
                <div className="flex items-baseline justify-end gap-1.5">
                  <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-wide">
                    Investimento total:
                  </span>
                  <span className="text-base font-black text-neutral-950">
                    {formatCurrency(quote.valor_final)}
                  </span>
                </div>
              </div>
            </div>

            {quote.observacoes?.trim() ? (
              <section className="rounded-lg border border-amber-200/80 bg-amber-50/40 px-4 py-3 space-y-1.5">
                <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-amber-800">
                  Observações
                </h4>
                <p className="text-[10px] text-neutral-700 leading-relaxed whitespace-pre-line">
                  {quote.observacoes.trim()}
                </p>
              </section>
            ) : null}

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
            <section className="rounded-lg border border-neutral-200 px-3 py-2.5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                <h4 className="text-[9px] font-extrabold uppercase tracking-widest text-neutral-500 shrink-0">
                  Condições de pagamento
                </h4>
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  {PAYMENT_BRANDS.map((brand) => (
                    <img
                      key={brand.id}
                      src={brand.src}
                      alt={brand.alt}
                      width={brand.width}
                      height={brand.height}
                      className="h-5 w-auto object-contain rounded-[3px] border border-neutral-100 bg-white px-0.5"
                    />
                  ))}
                </div>
              </div>
              <div className="text-[8.5px] text-neutral-600 leading-snug space-y-0.5">
                <p>
                  <span className="font-bold text-neutral-800">À vista:</span> 5% de desconto no PIX ou
                  transferência.
                </p>
                <p>
                  <span className="font-bold text-neutral-800">Parcelado:</span> Entrada de 40% (confirmação
                  do pedido) + 60% em até 6x no cartão ou boleto (mediante análise).
                </p>
              </div>
            </section>
          </main>

          <PrintBottomFooter />
        </div>
      </div>
    </div>
  );
}
