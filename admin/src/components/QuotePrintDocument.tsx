import type { ReactNode } from "react";
import { BadgeCheck, CalendarClock, ShieldCheck, Wrench } from "lucide-react";
import { PAYMENT_BRANDS } from "@/lib/paymentBrands";
import { formatQuoteSubitensLine } from "@/lib/quoteItems";
import { formatPartnerRegistro, getPartnerRoleLabel } from "@/lib/partnerTypes";

export const QUOTE_PRINT_FACTORY = {
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

/** A partir deste peso: cards comerciais sem ícones. */
const COMPACT_WEIGHT = 6;
/** A partir deste peso: notes + pagamento na 2ª página. */
const PAGED_WEIGHT = 10;

export type QuotePrintDensity = "normal" | "compact" | "paged";

export type QuotePrintItem = {
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  subitens?: string[] | null;
  produto_nome?: string | null;
  produto_imagem_url?: string | null;
  status?: string | null;
  aprovado_em?: string | null;
};

export type QuotePrintPartner = {
  nome: string;
  tipo: string;
  escritorio?: string | null;
  registro_profissional?: string | null;
  fotoUrl?: string | null;
} | null;

export type QuotePrintClient = {
  nome: string;
  cidade: string;
  bairro?: string | null;
};

export type QuotePrintData = {
  desconto: number;
  valor_final: number;
  observacoes?: string | null;
  items: QuotePrintItem[];
  partner: QuotePrintPartner;
  approvedTotal?: number;
  pendingTotal?: number;
  rejectedTotal?: number;
  lastUpdatedAt?: string | null;
};

function formatCurrency(val: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
}

/** Peso visual: item base + subitens/imagem ocupam mais espaço. */
export function computeQuoteItemWeight(items: QuotePrintItem[]): number {
  return items.reduce((weight, item) => {
    let w = 1;
    if (item.subitens && item.subitens.length > 0) w += 0.5;
    if (item.produto_imagem_url) w += 0.5;
    return weight + w;
  }, 0);
}

export function resolveQuotePrintDensity(
  items: QuotePrintItem[],
  weight = computeQuoteItemWeight(items)
): QuotePrintDensity {
  const count = items.length;
  if (count >= 8 || weight >= PAGED_WEIGHT) return "paged";
  if (count >= 5 || weight >= COMPACT_WEIGHT) return "compact";
  return "normal";
}

export function quotePrintStylesCss() {
  return `
    @page {
      size: A4 portrait;
      margin: 0;
    }
    @media print {
      html, body {
        background-color: #ffffff !important;
        color: #000000 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .print-page {
        width: 210mm !important;
        height: auto !important;
        max-height: none !important;
        min-height: 0 !important;
        page-break-after: auto !important;
        break-after: auto !important;
        page-break-inside: auto !important;
        padding: 0 !important;
        margin: 0 auto !important;
        box-sizing: border-box !important;
        border: none !important;
        box-shadow: none !important;
        background: #ffffff !important;
        overflow: visible !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .print-page-break {
        page-break-before: always !important;
        break-before: page !important;
      }
      .print-shell {
        min-height: 0 !important;
        height: auto !important;
        background: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      .print-shell-inner {
        max-width: none !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      .print-quote-header {
        background-color: #171717 !important;
        color: #ffffff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .print-quote-footer {
        background-color: #171717 !important;
        color: #d4d4d4 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .print-quote-header img {
        filter: brightness(0) invert(1) !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .print\\:hidden {
        display: none !important;
      }
      .print-page > main {
        flex: 0 0 auto !important;
        justify-content: flex-start !important;
        gap: 1.25rem !important;
      }
      .print-footer-link {
        text-decoration: underline;
        text-underline-offset: 2px;
      }
      a[href^="http"]::after,
      a[href^="mailto"]::after {
        content: none !important;
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
        overflow: visible;
      }
      .print-page-break {
        margin-top: 28px;
      }
    }
    .print-quote-header {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .print-quote-footer {
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
    .print-partner-card {
      border: 1px solid rgba(217, 119, 6, 0.5);
      background: #ffffff;
      box-shadow: 0 4px 14px -3px rgba(0, 0, 0, 0.22);
    }
    .print-footer-link {
      color: #ffffff;
      text-decoration: none;
    }
  `;
}

function resolveAsset(assetBase: string | undefined, path: string) {
  if (!assetBase) return path;
  const base = assetBase.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function PrintTopHeader({
  assetBase,
  title = "Orçamento Comercial detalhado",
}: {
  assetBase?: string;
  title?: string;
}) {
  return (
    <header
      className="print-quote-header bg-neutral-900 text-white px-[20mm] py-5 flex items-center justify-between gap-6"
      style={{ backgroundColor: "#171717" }}
    >
      <img
        src={resolveAsset(assetBase, "/logo.png")}
        alt="Móveis Unghero"
        className="h-11 w-auto object-contain brightness-0 invert"
      />
      <p className="text-base font-bold tracking-wide uppercase text-right">{title}</p>
    </header>
  );
}

function PrintBottomFooter() {
  const f = QUOTE_PRINT_FACTORY;
  return (
    <footer
      className="print-quote-footer bg-neutral-900 text-neutral-300 px-[20mm] py-4 mt-auto"
      style={{ backgroundColor: "#171717" }}
    >
      <div className="flex flex-row items-start justify-between gap-4 text-[9px] leading-relaxed">
        <div className="space-y-0.5 text-left">
          <p className="text-white font-bold text-[10px]">{f.name}</p>
          <p>
            <span className="text-neutral-500">CNPJ:</span> {f.cnpj}
          </p>
          <p>
            <span className="text-neutral-500">Rua:</span> {f.street}
          </p>
          <p>
            <span className="text-neutral-500">Bairro:</span> {f.neighborhood}
            <span className="text-neutral-600 mx-1.5">|</span>
            {f.city}
          </p>
        </div>
        <div className="space-y-0.5 font-semibold text-right">
          <p>
            <a
              href={f.whatsappHref}
              className="print-footer-link text-white hover:text-neutral-200"
              target="_blank"
              rel="noopener noreferrer"
            >
              {f.whatsapp}
            </a>
          </p>
          <p>
            <a href={f.emailHref} className="print-footer-link text-white hover:text-neutral-200">
              {f.email}
            </a>
          </p>
          <p>
            <a
              href={f.siteHref}
              className="print-footer-link text-white hover:text-neutral-200"
              target="_blank"
              rel="noopener noreferrer"
            >
              {f.site}
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
        Documento comercial de uso exclusivo entre as partes. Os dados pessoais aqui constantes são
        tratados conforme a LGPD (Lei nº 13.709/2018), exclusivamente para elaboração e
        acompanhamento desta proposta.
      </p>
    </footer>
  );
}

function CommercialNotesSection({ compact }: { compact: boolean }) {
  return (
    <section className="space-y-3">
      <div className={`grid grid-cols-3 ${compact ? "gap-2" : "gap-3"}`}>
        {COMMERCIAL_NOTES.map(({ icon: Icon, text }) =>
          compact ? (
            <div
              key={text.slice(0, 24)}
              className="rounded-lg border border-neutral-200 bg-neutral-50/50 px-2.5 py-2"
            >
              <p className="text-[9px] text-neutral-600 leading-snug text-left">{text}</p>
            </div>
          ) : (
            <div
              key={text.slice(0, 24)}
              className="flex flex-col items-center text-center rounded-xl border border-neutral-200 bg-neutral-50/50 px-3 py-3.5"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 border border-amber-200/80 mb-2">
                <Icon className="h-4 w-4 text-amber-700" strokeWidth={2.25} />
              </div>
              <p className="text-[9px] text-neutral-600 leading-relaxed">{text}</p>
            </div>
          )
        )}
      </div>
    </section>
  );
}

function PaymentConditionsSection({ assetBase }: { assetBase?: string }) {
  return (
    <section className="rounded-lg border border-neutral-200 px-3.5 py-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <h4 className="text-[9px] font-extrabold uppercase tracking-widest text-neutral-500 shrink-0">
          Condições de pagamento
        </h4>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {PAYMENT_BRANDS.map((brand) => (
            <img
              key={brand.id}
              src={resolveAsset(assetBase, brand.src)}
              alt={brand.alt}
              width={brand.width}
              height={brand.height}
              className="h-5 w-auto object-contain rounded-[3px] border border-neutral-100 bg-white px-0.5"
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/40 px-3 py-2.5">
          <span className="inline-block text-[9px] font-extrabold uppercase tracking-widest text-emerald-700 mb-1.5">
            À vista
          </span>
          <ul className="space-y-1.5 text-[9px] text-neutral-700 leading-snug">
            <li className="flex gap-1.5">
              <span className="text-emerald-500 font-bold leading-none mt-px">•</span>
              <span>
                <strong className="text-neutral-900">50% de entrada*</strong> e os outros{" "}
                <strong className="text-neutral-900">50% na entrega</strong>
              </span>
            </li>
          </ul>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-neutral-50/60 px-3 py-2.5">
          <span className="inline-block text-[9px] font-extrabold uppercase tracking-widest text-neutral-600 mb-1.5">
            Parcelado
          </span>
          <ul className="space-y-1.5 text-[9px] text-neutral-700 leading-snug">
            <li className="flex gap-1.5">
              <span className="text-neutral-400 font-bold leading-none mt-px">•</span>
              <span>
                <strong className="text-neutral-900">35% de entrada*</strong> e o restante em{" "}
                <strong className="text-neutral-900">5x sem juros</strong>
              </span>
            </li>
            <li className="flex gap-1.5">
              <span className="text-neutral-400 font-bold leading-none mt-px">•</span>
              <span>
                ou em <strong className="text-neutral-900">10x no boleto</strong> (com acréscimo)
              </span>
            </li>
          </ul>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-neutral-50/60 px-3 py-2.5">
          <span className="inline-block text-[9px] font-extrabold uppercase tracking-widest text-neutral-600 mb-1.5">
            Cartão
          </span>
          <ul className="space-y-1.5 text-[9px] text-neutral-700 leading-snug">
            <li className="flex gap-1.5">
              <span className="text-neutral-400 font-bold leading-none mt-px">•</span>
              <span>
                Em até <strong className="text-neutral-900">18x</strong> nos cartões aceitos (+ a taxa
                de parcelamento do cartão)
              </span>
            </li>
          </ul>
        </div>
      </div>

      <p className="text-[8px] text-neutral-400 leading-snug">
        *Na assinatura do contrato. Se preferir, solicite a simulação da opção desejada.
      </p>
    </section>
  );
}

function CommercialFooterBlock({
  compact,
  assetBase,
}: {
  compact: boolean;
  assetBase?: string;
}) {
  return (
    <div className="space-y-3.5">
      <CommercialNotesSection compact={compact} />
      <PaymentConditionsSection assetBase={assetBase} />
    </div>
  );
}

type QuotePrintDocumentProps = {
  quote: QuotePrintData;
  client: QuotePrintClient;
  emissaoLabel: string;
  validadeLabel: string;
  /** Prefixo absoluto para /logo.png e /payments (proxy no domínio principal). */
  assetBase?: string;
  /** Toolbar / ações acima do documento (ocultas na impressão). */
  topBar?: ReactNode;
};

export default function QuotePrintDocument({
  quote,
  client,
  emissaoLabel,
  validadeLabel,
  assetBase,
  topBar,
}: QuotePrintDocumentProps) {
  const partnerRoleLabel = quote.partner
    ? getPartnerRoleLabel(quote.partner.tipo, quote.partner.nome)
    : null;
  const partnerRegistro = quote.partner
    ? formatPartnerRegistro(quote.partner.tipo, quote.partner.registro_profissional)
    : null;

  const density = resolveQuotePrintDensity(quote.items);
  const isCompact = density === "compact" || density === "paged";
  const isPaged = density === "paged";
  const cellPad = isCompact ? "py-2.5 px-3" : "py-3.5 px-4";
  const sectionGap = isCompact ? "space-y-2.5" : "space-y-3.5";

  return (
    <div className="print-shell bg-slate-100 text-black min-h-screen font-sans print:bg-white print:min-h-0">
      <style dangerouslySetInnerHTML={{ __html: quotePrintStylesCss() }} />

      {topBar}

      <div className="print-shell-inner max-w-[840px] mx-auto p-4 md:p-8 print:p-0">
        <div className="print-page flex flex-col">
          <PrintTopHeader assetBase={assetBase} />

          <main className="flex-1 px-[20mm] py-6 flex flex-col justify-start gap-5">
            <div className={sectionGap}>
              <section className="grid grid-cols-[1fr_auto] gap-5 pb-5 border-b border-neutral-100">
                <div className="space-y-2 min-w-0">
                  <span className="text-[9px] text-neutral-400 font-extrabold uppercase tracking-widest">
                    Cliente
                  </span>
                  <p className="text-base font-bold text-neutral-950 truncate">{client.nome}</p>
                  <div className="text-xs text-neutral-600 space-y-0.5">
                    <p>
                      <span className="font-semibold text-neutral-700">Cidade:</span> {client.cidade}
                    </p>
                    {client.bairro ? (
                      <p>
                        <span className="font-semibold text-neutral-700">Bairro:</span>{" "}
                        {client.bairro}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col items-stretch gap-3 shrink-0 self-start">
                  <div className="flex gap-3">
                    <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/60 px-3.5 py-2.5 text-center min-w-[96px] flex-1">
                      <span className="text-[8px] font-extrabold uppercase tracking-widest text-emerald-600 block mb-1">
                        Emissão
                      </span>
                      <p className="text-[11px] font-bold text-emerald-800 leading-none">
                        {emissaoLabel}
                      </p>
                    </div>
                    <div className="rounded-lg border border-rose-200/80 bg-rose-50/60 px-3.5 py-2.5 text-center min-w-[96px] flex-1">
                      <span className="text-[8px] font-extrabold uppercase tracking-widest text-rose-600 block mb-1">
                        Validade
                      </span>
                      <p className="text-[11px] font-bold text-rose-800 leading-none">
                        {validadeLabel}
                      </p>
                    </div>
                  </div>

                  {quote.partner ? (
                    <div className="print-partner-card w-full p-3 rounded-xl border border-amber-500/50 bg-white text-[10px] text-neutral-600 space-y-1 shadow-[0_4px_14px_-3px_rgba(0,0,0,0.22)] leading-tight flex items-center gap-3">
                      <div className="h-14 w-14 shrink-0 rounded-full overflow-hidden border border-amber-500/45 bg-neutral-50 flex items-center justify-center">
                        {quote.partner.fotoUrl ? (
                          <img
                            src={quote.partner.fotoUrl}
                            alt={quote.partner.nome}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-black text-neutral-500">
                            {quote.partner.nome.substring(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5 text-left">
                        <div className="flex items-center gap-1 min-w-0">
                          <p className="font-bold text-neutral-900 text-xs leading-snug truncate">
                            {quote.partner.nome}
                          </p>
                          <BadgeCheck
                            className="h-3.5 w-3.5 shrink-0 text-amber-600 fill-amber-400/25"
                            aria-label="Parceiro verificado"
                          />
                        </div>
                        <span className="text-[8px] font-extrabold uppercase tracking-widest text-neutral-500 block">
                          {partnerRoleLabel}
                        </span>
                        {quote.partner.escritorio ? (
                          <p className="text-neutral-500 font-medium">{quote.partner.escritorio}</p>
                        ) : null}
                        {partnerRegistro ? (
                          <p className="text-neutral-400 font-semibold">{partnerRegistro}</p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>

              <p className="text-[11px] text-neutral-500 leading-relaxed">
                Relação completa de marcenaria sob medida, ferragens e serviços.
              </p>

              <div className="overflow-hidden border border-neutral-200 rounded-xl">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-200 text-neutral-500 uppercase font-bold bg-neutral-50/50 text-[10px]">
                      <th className={`${cellPad} w-7/12`}>Descrição Detalhada do Item</th>
                      <th className={`${cellPad} text-center w-1/12`}>Qtd</th>
                      <th className={`${cellPad} text-right w-2/12`}>Unitário</th>
                      <th className={`${cellPad} text-right w-2/12`}>Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-150 text-neutral-800">
                    {quote.items.map((item, idx) => {
                      const subitensLine =
                        item.subitens && item.subitens.length > 0
                          ? formatQuoteSubitensLine(item.subitens)
                          : "";
                      const isApproved = item.status === "APROVADO";
                      const isRejected = item.status === "RECUSADO";

                      return (
                        <tr
                          key={idx}
                          className={
                            isApproved
                              ? "bg-emerald-50/90 text-emerald-950"
                              : isRejected
                                ? "bg-neutral-100 text-neutral-500"
                                : undefined
                          }
                          style={
                            isApproved || isRejected
                              ? { WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }
                              : undefined
                          }
                        >
                          <td className={`${cellPad} leading-relaxed`}>
                            <div className="flex gap-2.5 items-start">
                              {item.produto_imagem_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={item.produto_imagem_url}
                                  alt={item.produto_nome || item.descricao}
                                  className="w-11 h-11 rounded-md object-cover border border-neutral-200 shrink-0"
                                />
                              ) : null}
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                  {item.produto_nome ? (
                                    <p className="text-[9px] font-bold uppercase tracking-wide text-neutral-500">
                                      {item.produto_nome}
                                    </p>
                                  ) : null}
                                  {isApproved ? (
                                    <span className="text-[8px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-600 text-white">
                                      Aprovado
                                    </span>
                                  ) : null}
                                  {isRejected ? (
                                    <span className="text-[8px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded bg-neutral-400 text-white">
                                      Não incluso
                                    </span>
                                  ) : null}
                                </div>
                                <p className={`font-semibold ${isApproved ? "text-emerald-950" : "text-neutral-950"}`}>
                                  {item.descricao}
                                </p>
                                {subitensLine ? (
                                  <p className="text-[9px] text-neutral-500 font-normal mt-0.5">
                                    {subitensLine}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td className={`${cellPad} text-center font-bold text-neutral-700`}>
                            {item.quantidade}
                          </td>
                          <td className={`${cellPad} text-right font-medium text-neutral-600`}>
                            {formatCurrency(item.valor_unitario)}
                          </td>
                          <td className={`${cellPad} text-right font-extrabold ${isApproved ? "text-emerald-900" : "text-neutral-950"}`}>
                            {formatCurrency(item.valor_total)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end -mt-1">
                <div className="border border-neutral-200 rounded-lg px-3.5 py-2 bg-neutral-50/80 min-w-[220px] space-y-0.5">
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
                  {typeof quote.approvedTotal === "number" && quote.approvedTotal > 0 ? (
                    <p className="text-[9px] text-emerald-800 font-bold text-right">
                      Já aprovado: {formatCurrency(quote.approvedTotal)}
                    </p>
                  ) : null}
                  {typeof quote.pendingTotal === "number" && quote.pendingTotal > 0 ? (
                    <p className="text-[9px] text-amber-800 font-semibold text-right">
                      Ainda pendente: {formatCurrency(quote.pendingTotal)}
                    </p>
                  ) : null}
                  {quote.lastUpdatedAt ? (
                    <p className="text-[8px] text-neutral-500 text-right pt-0.5">
                      Atualizado em {quote.lastUpdatedAt}
                    </p>
                  ) : null}
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
            </div>

            {!isPaged ? (
              <CommercialFooterBlock compact={isCompact} assetBase={assetBase} />
            ) : null}
          </main>

          <PrintBottomFooter />
        </div>

        {isPaged ? (
          <div className="print-page print-page-break flex flex-col">
            <PrintTopHeader assetBase={assetBase} title="Condições comerciais" />
            <main className="flex-1 px-[20mm] py-6 flex flex-col justify-start gap-5">
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                Informações de prazo, garantia, montagem e formas de pagamento desta proposta.
              </p>
              <CommercialFooterBlock compact={false} assetBase={assetBase} />
            </main>
            <PrintBottomFooter />
          </div>
        ) : null}
      </div>
    </div>
  );
}
