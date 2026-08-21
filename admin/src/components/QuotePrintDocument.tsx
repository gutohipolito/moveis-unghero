import type { ReactNode } from "react";
import {
  BadgeCheck,
  CalendarClock,
  Check,
  Ruler,
  ShieldCheck,
  Wrench,
  X,
} from "lucide-react";
import { PAYMENT_BRANDS } from "@/lib/paymentBrands";
import { formatQuotePhrase, formatQuoteSubitensLine } from "@/lib/quoteItems";
import { formatPartnerRegistro, getPartnerRoleLabel } from "@/lib/partnerTypes";
import { formatQuoteCodigo } from "@/lib/quoteCodigo";
import { isAddendumTemplate, isImageCatalogTemplate, forcesCommercialSecondPage } from "@/lib/quoteTemplates";
import { formatQuoteMoney, extractAddendumReason, buildAddendumReferenceCopy, formatAddendumDeltaLabel } from "@/lib/quoteAddendum";
import { QUOTE_VALIDITY_DAYS } from "@/lib/brazilDate";

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
  /** Imagem do item salvo (descrição) — legado; preferir catalog_images. */
  preset_imagem_url?: string | null;
  status?: string | null;
  aprovado_em?: string | null;
};

export type QuoteCatalogPrintEntry = {
  label: string;
  imagem_url: string;
};

export type QuotePrintPartner = {
  nome: string;
  tipo: string;
  escritorio?: string | null;
  registro_profissional?: string | null;
  fotoUrl?: string | null;
  /** VERIFIED = selo + ouro; UNVERIFIED = borda cinza sem selo. */
  quote_card_mode?: "UNVERIFIED" | "VERIFIED" | null;
} | null;

export type QuotePrintClient = {
  nome: string;
  cidade: string;
  bairro?: string | null;
};

export type QuotePrintData = {
  template_tipo?: string | null;
  codigo?: string | null;
  id?: string;
  desconto: number;
  valor_final: number;
  observacoes?: string | null;
  items: QuotePrintItem[];
  /** Cards da página visual (descrições e detalhes com foto nos itens salvos). */
  catalog_images?: QuoteCatalogPrintEntry[];
  partner: QuotePrintPartner;
  solicitante_nome?: string | null;
  solicitante_area?: string | null;
  approvedTotal?: number;
  pendingTotal?: number;
  rejectedTotal?: number;
  /** Data em que os valores comerciais foram definidos (criação). */
  valuesCalculatedAt?: string | null;
  /** Data da última edição comercial; omitir se nunca editado. */
  lastUpdatedAt?: string | null;
  /** Proposta original quando este PDF é um adendo. */
  addendumRef?: {
    label: string;
    versao: number;
    approvedAtLabel: string | null;
    approvedTotal: number;
  } | null;
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
        width: 210mm !important;
        min-width: 210mm !important;
        max-width: 210mm !important;
        height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
      }
      .print-page {
        width: 210mm !important;
        min-width: 210mm !important;
        max-width: 210mm !important;
        min-height: 297mm !important;
        height: auto !important;
        max-height: none !important;
        page-break-after: auto !important;
        break-after: auto !important;
        page-break-inside: auto !important;
        padding: 0 !important;
        margin: 0 !important;
        box-sizing: border-box !important;
        border: none !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        background: #ffffff !important;
        overflow: visible !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        transform: none !important;
        display: flex !important;
        flex-direction: column !important;
      }
      .print-page-break {
        page-break-before: always !important;
        break-before: page !important;
      }
      .print-shell {
        min-height: 0 !important;
        height: auto !important;
        width: 210mm !important;
        background: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
        overflow: visible !important;
      }
      .print-shell-inner {
        max-width: none !important;
        width: 210mm !important;
        min-width: 210mm !important;
        padding: 0 !important;
        margin: 0 !important;
        overflow: visible !important;
      }
      .print-quote-header {
        background-color: #171717 !important;
        color: #ffffff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        flex-shrink: 0 !important;
      }
      .print-quote-footer {
        background-color: #171717 !important;
        color: #d4d4d4 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        flex-shrink: 0 !important;
        margin-top: auto !important;
      }
      .print-quote-header img {
        filter: brightness(0) invert(1) !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .print\\:hidden,
      .print-hidden {
        display: none !important;
      }
      .print-page > main {
        flex: 1 1 auto !important;
        display: flex !important;
        flex-direction: column !important;
        min-height: 0 !important;
      }
      .print-quote-items {
        flex: 1 1 auto !important;
        display: flex !important;
        flex-direction: column !important;
      }
      .print-catalog-card {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
        border: 1px solid #d4d4d8 !important;
        border-radius: 10px !important;
        background: #ffffff !important;
        overflow: hidden !important;
      }
      .print-catalog-card__media {
        aspect-ratio: 1 / 1 !important;
        background: #fafafa !important;
        border-bottom: 1px solid #e4e4e7 !important;
      }
      .print-catalog-card__name {
        padding: 10px 12px !important;
        text-align: center !important;
        font-size: 11px !important;
        font-weight: 600 !important;
        line-height: 1.35 !important;
        color: #171717 !important;
      }
      .print-catalog-grid {
        display: grid !important;
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        gap: 12px !important;
      }
      .print-quote-bottom {
        flex-shrink: 0 !important;
        margin-top: auto !important;
      }
      .print-footer-link {
        text-decoration: underline;
        text-underline-offset: 2px;
      }
      a[href]::after,
      a[href^="http"]::after,
      a[href^="mailto"]::after {
        content: none !important;
      }
    }
    @media screen {
      .print-shell {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        /* Garante pinch-zoom sobre a folha A4 no mobile */
        touch-action: pan-x pan-y pinch-zoom;
      }
      .print-shell-inner {
        width: max-content;
        max-width: none;
        margin: 0 auto;
        padding: 24px;
        box-sizing: border-box;
      }
      @media (max-width: 640px) {
        .print-shell-inner {
          padding: 12px;
        }
      }
      .print-page {
        width: 210mm !important;
        min-width: 210mm !important;
        max-width: 210mm !important;
        min-height: 297mm;
        margin: 0 auto;
        box-sizing: border-box;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        background-color: #ffffff;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        overflow: visible;
        display: flex;
        flex-direction: column;
      }
      .print-page-break {
        margin-top: 28px;
      }
      .print-quote-items {
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        min-height: 0;
      }
      .print-quote-bottom {
        flex-shrink: 0;
        margin-top: auto;
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
      background: #ffffff;
      box-shadow: none;
    }
    .print-partner-card--verified {
      border: 1px solid rgba(212, 212, 212, 0.95);
    }
    .print-partner-card--unverified {
      border: 1px solid #e4e4e7;
      box-shadow: none;
    }
    .print-footer-link {
      color: #ffffff;
      text-decoration: none;
    }
    .print-catalog-card {
      break-inside: avoid;
      page-break-inside: avoid;
      border: 1px solid #d4d4d8;
      border-radius: 10px;
      background: #ffffff;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .print-catalog-card__media {
      aspect-ratio: 1 / 1;
      background: #fafafa;
      border-bottom: 1px solid #e4e4e7;
      overflow: hidden;
    }
    .print-catalog-card__media img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .print-catalog-card__name {
      padding: 10px 12px;
      text-align: center;
      font-size: 11px;
      font-weight: 600;
      line-height: 1.35;
      color: #171717;
    }
    .print-catalog-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
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
  quoteCodigo,
}: {
  assetBase?: string;
  title?: string;
  quoteCodigo?: string | null;
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
      <div className="text-right space-y-1 min-w-0">
        <p className="text-base font-bold tracking-wide uppercase">{title}</p>
        {quoteCodigo ? (
          <p className="text-[11px] font-mono font-semibold tracking-wide text-neutral-300">
            {quoteCodigo}
          </p>
        ) : null}
      </div>
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
                <strong className="text-neutral-900">50% na entrega</strong>.
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
                <strong className="text-neutral-900">35% de entrada*</strong> e o restante em até{" "}
                <strong className="text-neutral-900">5x sem juros</strong>.
              </span>
            </li>
            <li className="flex gap-1.5">
              <span className="text-neutral-400 font-bold leading-none mt-px">•</span>
              <span>
                Ou em até <strong className="text-neutral-900">10x no boleto</strong> (com acréscimo).
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
                de parcelamento do cartão).
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
    <div className="print-quote-bottom space-y-3.5">
      <CommercialNotesSection compact={compact} />
      <PaymentConditionsSection assetBase={assetBase} />
    </div>
  );
}

function CompleteSectionTitle({ index, title }: { index: string; title: string }) {
  return (
    <h3 className="text-[9px] font-bold uppercase tracking-[0.14em] text-indigo-900/80">
      {index} — {title}
    </h3>
  );
}

const COMPLETE_PROJECT_CONDITIONS = [
  {
    icon: CalendarClock,
    title: "Prazo",
    text: "O prazo de fabricação e instalação é definido individualmente para cada projeto e passa a ser contado após a aprovação final do projeto, confirmação das medidas e pagamento da entrada.",
  },
  {
    icon: Ruler,
    title: "Medidas",
    text: "As medidas estão sujeitas à conferência técnica antes do início da fabricação. A produção será iniciada somente após a validação das medidas e especificações do projeto.",
  },
  {
    icon: Wrench,
    title: "Montagem",
    text: "A montagem e instalação são realizadas por técnicos especializados da própria fábrica, conforme as condições previstas para cada projeto.",
  },
  {
    icon: ShieldCheck,
    title: "Garantia",
    text: "Garantia de 5 anos para defeitos de fabricação relacionados à estrutura dos móveis, conforme as condições de garantia da Móveis Unghero.",
  },
] as const;

const COMPLETE_INCLUDED = [
  "Fabricação dos móveis descritos na proposta.",
  "Ferragens e acessórios especificados no projeto.",
  "Transporte.",
  "Montagem e instalação.",
] as const;

const COMPLETE_EXCLUDED = [
  "Serviços de alvenaria.",
  "Pintura.",
  "Serviços elétricos.",
  "Serviços hidráulicos.",
  "Gesso.",
  "Retirada ou descarte de móveis existentes.",
  "Adequações estruturais do ambiente.",
  "Serviços executados por terceiros.",
] as const;

/** Segunda página do template Completo — peça editorial comercial (sem aceite). */
function CompleteCommercialConditionsPage({
  assetBase,
  validadeLabel,
}: {
  assetBase?: string;
  validadeLabel: string;
}) {
  return (
    <div className="flex flex-col gap-5 min-h-0">
      {/* 01 — Condições do projeto */}
      <section className="space-y-2.5 print:break-inside-avoid">
        <CompleteSectionTitle index="01" title="Condições do projeto" />
        <div className="grid grid-cols-2 gap-x-5 gap-y-3.5">
          {COMPLETE_PROJECT_CONDITIONS.map(({ icon: Icon, title, text }) => (
            <article key={title} className="flex gap-2.5 min-w-0">
              <Icon
                className="h-3.5 w-3.5 shrink-0 text-amber-700/90 mt-0.5"
                strokeWidth={1.75}
                aria-hidden
              />
              <div className="min-w-0 space-y-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-900">
                  {title}
                </p>
                <p className="text-[9.5px] text-neutral-600 leading-relaxed">{text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="h-px w-full bg-neutral-200/90" aria-hidden />

      {/* 02 — Alterações após aprovação */}
      <section className="space-y-2 print:break-inside-avoid">
        <CompleteSectionTitle index="02" title="Alterações após aprovação" />
        <div className="rounded-md border border-indigo-200/70 bg-indigo-50/35 px-3.5 py-2.5">
          <p className="text-[9.5px] text-neutral-700 leading-relaxed">
            Após a aprovação do orçamento e projeto, qualquer alteração solicitada pelo cliente,
            incluindo medidas, materiais, acabamentos, ferragens, acessórios, inclusão ou exclusão de
            itens, poderá implicar alteração de valores e prazos. As alterações serão formalizadas por{" "}
            <strong className="font-semibold text-indigo-950">aditivo comercial</strong> e somente
            serão executadas após{" "}
            <strong className="font-semibold text-indigo-950">nova aprovação</strong>. As condições
            originalmente aprovadas permanecem válidas, salvo quando expressamente modificadas pelo
            aditivo.
          </p>
        </div>
      </section>

      <div className="h-px w-full bg-neutral-200/90" aria-hidden />

      {/* 03 — Inclusões e exclusões */}
      <section className="space-y-2.5 print:break-inside-avoid">
        <CompleteSectionTitle index="03" title="Inclusões e exclusões" />
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <div className="space-y-1.5 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-900">
              Incluso no orçamento
            </p>
            <ul className="space-y-1">
              {COMPLETE_INCLUDED.map((item) => (
                <li key={item} className="flex gap-1.5 text-[9.5px] text-neutral-600 leading-snug">
                  <Check
                    className="h-3 w-3 shrink-0 text-emerald-600/80 mt-0.5"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-1.5 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-900">
              Não incluso, salvo indicação expressa
            </p>
            <ul className="space-y-1">
              {COMPLETE_EXCLUDED.map((item) => (
                <li key={item} className="flex gap-1.5 text-[9.5px] text-neutral-600 leading-snug">
                  <X
                    className="h-3 w-3 shrink-0 text-rose-500/85 mt-0.5"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className="h-px w-full bg-neutral-200/90" aria-hidden />

      {/* 04 — Condições de pagamento */}
      <section className="space-y-2.5 print:break-inside-avoid">
        <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
          <CompleteSectionTitle index="04" title="Condições de pagamento" />
          <div className="flex flex-wrap items-center gap-1 opacity-70">
            {PAYMENT_BRANDS.map((brand) => (
              <img
                key={brand.id}
                src={resolveAsset(assetBase, brand.src)}
                alt={brand.alt}
                width={brand.width}
                height={brand.height}
                className="h-3.5 w-auto object-contain grayscale"
              />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5 border-t border-emerald-600/40 pt-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
              À vista
            </p>
            <p className="text-[10px] text-neutral-800 leading-snug">
              <span className="font-semibold text-neutral-950">50% na aprovação</span>
              <br />
              <span className="font-semibold text-neutral-950">50% na entrega</span>
            </p>
          </div>
          <div className="space-y-1.5 border-t border-neutral-300 pt-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-800">
              Parcelado
            </p>
            <p className="text-[10px] text-neutral-700 leading-snug">
              <span className="font-semibold text-neutral-950">35% de entrada</span>
              <br />
              Saldo em até{" "}
              <span className="font-semibold text-emerald-800">5× sem juros</span>
              <br />
              ou <span className="font-semibold text-neutral-950">10× no boleto</span>, com acréscimo
            </p>
          </div>
          <div className="space-y-1.5 border-t border-neutral-300 pt-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-800">
              Cartão
            </p>
            <p className="text-[10px] text-neutral-700 leading-snug">
              <span className="font-semibold text-neutral-950">Até 18×</span>
              <br />
              Sujeito à taxa de parcelamento da operadora.
            </p>
          </div>
        </div>
        <p className="text-[8px] text-neutral-400 leading-snug">
          As condições de pagamento poderão variar conforme o valor total e as condições específicas
          do projeto.
        </p>
      </section>

      <div className="h-px w-full bg-neutral-200/90" aria-hidden />

      {/* 05 — Informações importantes */}
      <section className="space-y-2 print:break-inside-avoid">
        <CompleteSectionTitle index="05" title="Informações importantes" />
        <div className="grid grid-cols-3 gap-x-4 gap-y-2">
          <div className="space-y-0.5 min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-neutral-800">
              Validade da proposta
            </p>
            <p className="text-[8.5px] text-neutral-500 leading-snug">
              Esta proposta possui validade de{" "}
              <span className="font-medium text-neutral-700">{QUOTE_VALIDITY_DAYS} dias</span>{" "}
              corridos a partir da data de emissão
              {validadeLabel ? (
                <>
                  {" "}
                  (válida até <span className="font-medium text-neutral-700">{validadeLabel}</span>)
                </>
              ) : null}
              . Após esse período, valores, condições comerciais e prazos poderão ser revisados.
            </p>
          </div>
          <div className="space-y-0.5 min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-neutral-800">
              Condições para instalação
            </p>
            <p className="text-[8.5px] text-neutral-500 leading-snug">
              Para a realização da montagem, o ambiente deverá estar liberado e em condições
              adequadas para instalação, incluindo pisos, paredes, pintura, pontos elétricos e
              hidráulicos concluídos quando aplicáveis.
            </p>
          </div>
          <div className="space-y-0.5 min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-neutral-800">
              Atrasos decorrentes do ambiente
            </p>
            <p className="text-[8.5px] text-neutral-500 leading-snug">
              Eventuais atrasos decorrentes da indisponibilidade ou inadequação do ambiente, acesso
              ao imóvel ou execução de serviços de terceiros poderão impactar o cronograma de
              instalação.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function AddendumContextBlock({
  observacoes,
  addendumRef,
  addendumTotal,
}: {
  observacoes?: string | null;
  addendumRef?: QuotePrintData["addendumRef"];
  addendumTotal: number;
}) {
  const reason = extractAddendumReason(observacoes);
  const generated = addendumRef
    ? buildAddendumReferenceCopy({
        label: addendumRef.label,
        approvedAtLabel: addendumRef.approvedAtLabel,
        approvedTotal: addendumRef.approvedTotal,
        addendumTotal,
      })
    : null;

  return (
    <section className="rounded-xl border border-amber-200/80 bg-amber-50/40 px-4 py-3.5 space-y-2.5 print:break-inside-avoid">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-900">
          Referência à proposta aprovada
        </p>
        {addendumRef ? (
          <p className="text-[10px] text-neutral-600 font-medium">
            {addendumRef.label}
            {addendumRef.approvedAtLabel ? ` · aprovada em ${addendumRef.approvedAtLabel}` : ""}
            {" · "}
            original {formatQuoteMoney(addendumRef.approvedTotal)}
          </p>
        ) : null}
      </div>
      {generated ? (
        <div className="text-[11px] text-neutral-700 leading-relaxed space-y-1">
          {generated.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      ) : null}
      {generated ? (
        <p className="text-[10px] text-neutral-600 font-semibold">
          Alteração neste adendo: {formatAddendumDeltaLabel(generated.delta)}
          {" · "}
          Investimento total com alterações: {formatQuoteMoney(generated.delta.combinedTotal)}
        </p>
      ) : null}
      {reason ? (
        <div className="border-t border-amber-200/70 pt-2.5 space-y-1">
          <p className="text-[9px] font-extrabold uppercase tracking-widest text-amber-900">
            Motivo das alterações
          </p>
          <div className="text-[11px] text-neutral-700 leading-relaxed whitespace-pre-wrap">
            {reason}
          </div>
        </div>
      ) : null}
    </section>
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
  const isComplete = forcesCommercialSecondPage(quote.template_tipo);
  const isCompact = density === "compact" || density === "paged" || isComplete;
  const isPaged = density === "paged" || isComplete;
  /** Poucos itens: bloco de itens centralizado no espaço livre do A4. */
  const centerItems = density === "normal" && !isComplete;
  const cellPad = isCompact ? "py-2.5 px-3" : "py-3.5 px-4";
  const sectionGap = isCompact ? "space-y-2.5" : "space-y-3.5";
  const isComparative = quote.template_tipo === "COMPARATIVO";
  const isAddendum = isAddendumTemplate(quote.template_tipo);
  const isImageCatalog = !isAddendum && isImageCatalogTemplate(quote.template_tipo);
  const catalogItems: QuoteCatalogPrintEntry[] = isImageCatalog
    ? quote.catalog_images && quote.catalog_images.length > 0
      ? quote.catalog_images
      : quote.items
          .filter(
            (item) =>
              item.status !== "RECUSADO" && Boolean(item.preset_imagem_url?.trim())
          )
          .map((item) => ({
            label: item.descricao,
            imagem_url: item.preset_imagem_url!.trim(),
          }))
    : [];
  const catalogPages: QuoteCatalogPrintEntry[][] = [];
  const CATALOG_PER_PAGE = 9;
  for (let i = 0; i < catalogItems.length; i += CATALOG_PER_PAGE) {
    catalogPages.push(catalogItems.slice(i, i + CATALOG_PER_PAGE));
  }
  // Sempre gera a 2ª página no template com imagens (mesmo sem match de foto).
  if (isImageCatalog && catalogPages.length === 0) {
    catalogPages.push([]);
  }
  const quoteCodigo =
    quote.id || quote.codigo
      ? formatQuoteCodigo({ id: quote.id || "", codigo: quote.codigo })
      : null;

  return (
    <div className="print-shell bg-slate-100 text-black min-h-screen font-sans print:bg-white print:min-h-0">
      <style dangerouslySetInnerHTML={{ __html: quotePrintStylesCss() }} />

      {topBar}

      <div className="print-shell-inner">
        <div className="print-page flex flex-col">
          <PrintTopHeader
            assetBase={assetBase}
            quoteCodigo={quoteCodigo}
            title={isAddendum ? "Adendo comercial" : "Orçamento Comercial detalhado"}
          />

          <main className="flex-1 px-[20mm] py-5 flex flex-col gap-4 min-h-0">
            <section
              className={`grid gap-4 pb-3.5 border-b border-neutral-200/80 shrink-0 ${
                quote.partner ? "grid-cols-[1fr_auto]" : "grid-cols-1"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 min-w-0">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <span className="text-[8px] text-neutral-400 font-bold uppercase tracking-[0.14em]">
                    Cliente
                  </span>
                  <p className="text-[17px] font-semibold tracking-tight text-neutral-950 leading-snug">
                    {client.nome}
                  </p>
                  {quote.solicitante_nome ? (
                    <p className="text-[10px] text-neutral-500">
                      Solicitante:{" "}
                      <span className="font-medium text-neutral-700">
                        {quote.solicitante_nome}
                        {quote.solicitante_area ? ` (${quote.solicitante_area})` : ""}
                      </span>
                    </p>
                  ) : null}
                  <div className="text-[10px] text-neutral-500 space-y-0.5 pt-0.5">
                    <p>
                      <span className="text-neutral-400">Cidade</span>{" "}
                      <span className="text-neutral-700 font-medium">{client.cidade}</span>
                    </p>
                    {client.bairro ? (
                      <p>
                        <span className="text-neutral-400">Bairro</span>{" "}
                        <span className="text-neutral-700 font-medium">{client.bairro}</span>
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  <div className="rounded-md border border-neutral-200/90 bg-white px-3 py-2 text-center min-w-[5.5rem]">
                    <span className="text-[7px] font-bold uppercase tracking-[0.12em] text-neutral-400 block mb-1">
                      Emissão
                    </span>
                    <p className="text-[11px] font-semibold text-neutral-900 leading-none tabular-nums">
                      {emissaoLabel}
                    </p>
                  </div>
                  <div className="rounded-md border border-rose-200/70 bg-rose-50/40 px-3 py-2 text-center min-w-[5.5rem]">
                    <span className="text-[7px] font-bold uppercase tracking-[0.12em] text-rose-600/80 block mb-1">
                      Validade
                    </span>
                    <p className="text-[11px] font-semibold text-rose-900 leading-none tabular-nums">
                      {validadeLabel}
                    </p>
                  </div>
                </div>
              </div>

              {quote.partner ? (
                (() => {
                  const verified =
                    (quote.partner.quote_card_mode ?? "VERIFIED") !== "UNVERIFIED";
                  return (
                    <div
                      className={`print-partner-card w-[13.5rem] p-2.5 rounded-lg bg-white text-[10px] text-neutral-600 leading-tight flex items-center gap-2.5 shrink-0 self-start ${
                        verified
                          ? "print-partner-card--verified border border-neutral-200/90"
                          : "print-partner-card--unverified border border-zinc-200"
                      }`}
                    >
                      <div
                        className={`h-11 w-11 shrink-0 rounded-full overflow-hidden bg-neutral-50 flex items-center justify-center ${
                          verified ? "border border-amber-500/35" : "border border-zinc-200"
                        }`}
                      >
                        {quote.partner.fotoUrl ? (
                          <img
                            src={quote.partner.fotoUrl}
                            alt={quote.partner.nome}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] font-bold text-neutral-500">
                            {quote.partner.nome.substring(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5 text-left">
                        <div className="flex items-center gap-1 min-w-0">
                          <p className="font-semibold text-neutral-900 text-[11px] leading-snug truncate">
                            {quote.partner.nome}
                          </p>
                          {verified ? (
                            <BadgeCheck
                              className="h-3 w-3 shrink-0 text-amber-600/90 fill-amber-400/20"
                              aria-label="Parceiro verificado"
                            />
                          ) : null}
                        </div>
                        <span className="text-[7px] font-bold uppercase tracking-[0.12em] text-neutral-400 block">
                          {partnerRoleLabel}
                        </span>
                        {quote.partner.escritorio ? (
                          <p className="text-neutral-500 text-[9px] truncate">
                            {quote.partner.escritorio}
                          </p>
                        ) : null}
                        {partnerRegistro ? (
                          <p className="text-neutral-400 text-[9px] font-medium tabular-nums">
                            {partnerRegistro}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })()
              ) : null}
            </section>

            <div
              className={`print-quote-items ${sectionGap} ${
                centerItems ? "justify-center" : "justify-start"
              }`}
            >
              <p className="text-[10px] text-neutral-500 leading-relaxed tracking-wide">
                {isAddendum
                  ? "Itens e valores referentes às alterações solicitadas após a aprovação da proposta original."
                  : isComparative
                    ? "Opções de proposta para o seu projeto. Cada alternativa traz seu próprio valor."
                    : "Relação completa de marcenaria sob medida, ferragens e serviços."}
              </p>

              <div className="overflow-hidden border border-neutral-200/90 rounded-lg">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-200/90 text-neutral-400 uppercase tracking-[0.08em] font-bold bg-neutral-50/40 text-[9px]">
                      <th className={`${cellPad} w-7/12 font-bold`}>
                        {isComparative ? "Opção / Descrição detalhada" : "Descrição detalhada do item"}
                      </th>
                      <th className={`${cellPad} text-center w-1/12`}>Qtd</th>
                      <th className={`${cellPad} text-right w-2/12`}>Unitário</th>
                      <th className={`${cellPad} text-right w-2/12`}>Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-neutral-800">
                    {quote.items.map((item, idx) => {
                      const subitensLine =
                        item.subitens && item.subitens.length > 0
                          ? formatQuoteSubitensLine(item.subitens)
                          : "";
                      const isApproved = item.status === "APROVADO";
                      const isRejected = item.status === "RECUSADO";
                      const isPending = !isApproved && !isRejected;

                      return (
                        <tr
                          key={idx}
                          className={
                            isApproved
                              ? "bg-emerald-50/40 text-neutral-900"
                              : isRejected
                                ? "bg-neutral-50/80 text-neutral-500"
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
                              {!isImageCatalog && item.produto_imagem_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={item.produto_imagem_url}
                                  alt={item.produto_nome || item.descricao}
                                  className="w-10 h-10 rounded object-cover border border-neutral-200/80 shrink-0"
                                />
                              ) : null}
                              <div className="min-w-0 space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {isApproved ? (
                                    <span className="text-[7px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-600/90 text-white">
                                      Aprovado
                                    </span>
                                  ) : null}
                                  {isRejected ? (
                                    <span className="text-[7px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-rose-500/80 text-white">
                                      Não incluso
                                    </span>
                                  ) : null}
                                  {isPending ? (
                                    <span className="text-[7px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border border-amber-300/80 bg-amber-50 text-amber-800/90">
                                      Pendente
                                    </span>
                                  ) : null}
                                  {item.produto_nome ? (
                                    <span className="text-[8px] font-medium uppercase tracking-wide text-neutral-400">
                                      {item.produto_nome}
                                    </span>
                                  ) : null}
                                </div>
                                <p
                                  className={`text-[12px] font-semibold leading-snug ${
                                    isRejected ? "text-neutral-500" : "text-neutral-950"
                                  }`}
                                >
                                  {formatQuotePhrase(item.descricao)}
                                </p>
                                {subitensLine ? (
                                  <p className="text-[9px] text-neutral-500 font-normal leading-relaxed">
                                    {subitensLine}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td className={`${cellPad} text-center text-[11px] font-medium text-neutral-600 tabular-nums`}>
                            {item.quantidade}
                          </td>
                          <td className={`${cellPad} text-right text-[10px] font-normal text-neutral-500 tabular-nums`}>
                            {formatCurrency(item.valor_unitario)}
                          </td>
                          <td
                            className={`${cellPad} text-right text-[11px] font-medium tabular-nums ${
                              isApproved ? "text-neutral-900" : isRejected ? "text-neutral-400" : "text-neutral-800"
                            }`}
                          >
                            {formatCurrency(item.valor_total)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {!isComparative ? (
                <div className="flex justify-end pt-1">
                  <div className="min-w-[15rem] max-w-[18rem] space-y-2 border-t border-neutral-200 pt-3">
                    {quote.desconto > 0 ? (
                      <div className="space-y-1 text-right">
                        <div className="flex items-baseline justify-between gap-4 text-[10px] text-neutral-500">
                          <span>Valor original</span>
                          <span className="tabular-nums text-neutral-700">
                            {formatCurrency(quote.valor_final + quote.desconto)}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between gap-4 text-[10px] text-emerald-700/90">
                          <span>Desconto</span>
                          <span className="tabular-nums font-medium">
                            − {formatCurrency(quote.desconto)}
                          </span>
                        </div>
                      </div>
                    ) : null}
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-neutral-500">
                        {isAddendum ? "Valor deste adendo" : "Investimento total"}
                      </span>
                      <span className="text-[18px] font-semibold tracking-tight text-neutral-950 tabular-nums leading-none">
                        {formatCurrency(quote.valor_final)}
                      </span>
                    </div>
                    {isAddendum && quote.addendumRef ? (
                      <div className="space-y-0.5 text-right pt-0.5">
                        <p className="text-[8.5px] text-neutral-500">
                          Proposta original aprovada:{" "}
                          <span className="tabular-nums text-neutral-600">
                            {formatCurrency(quote.addendumRef.approvedTotal)}
                          </span>
                        </p>
                        <p className="text-[8.5px] text-neutral-500">
                          Original + alterações:{" "}
                          <span className="tabular-nums text-neutral-700 font-medium">
                            {formatCurrency(quote.addendumRef.approvedTotal + quote.valor_final)}
                          </span>
                        </p>
                      </div>
                    ) : null}
                    {!isAddendum &&
                    typeof quote.approvedTotal === "number" &&
                    quote.approvedTotal > 0 ? (
                      <p className="text-[8.5px] text-neutral-500 text-right">
                        Já aprovado:{" "}
                        <span className="tabular-nums">{formatCurrency(quote.approvedTotal)}</span>
                      </p>
                    ) : null}
                    {!isAddendum &&
                    typeof quote.approvedTotal === "number" &&
                    quote.approvedTotal > 0 &&
                    typeof quote.pendingTotal === "number" &&
                    quote.pendingTotal > 0 ? (
                      <p className="text-[8.5px] text-amber-800/80 text-right">
                        Ainda pendente:{" "}
                        <span className="tabular-nums">{formatCurrency(quote.pendingTotal)}</span>
                      </p>
                    ) : null}
                    {isAddendum &&
                    typeof quote.pendingTotal === "number" &&
                    quote.pendingTotal > 0 ? (
                      <p className="text-[8.5px] text-amber-800/80 text-right">
                        Ainda pendente neste adendo:{" "}
                        <span className="tabular-nums">{formatCurrency(quote.pendingTotal)}</span>
                      </p>
                    ) : null}
                    {quote.valuesCalculatedAt || quote.lastUpdatedAt ? (
                      <div className="space-y-0.5 pt-1 border-t border-neutral-100">
                        {quote.valuesCalculatedAt ? (
                          <p className="text-[7.5px] text-neutral-400 text-right">
                            Valores calculados em {quote.valuesCalculatedAt}
                          </p>
                        ) : null}
                        {quote.lastUpdatedAt ? (
                          <p className="text-[7.5px] text-neutral-400 text-right">
                            Atualizado em {quote.lastUpdatedAt}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : quote.valuesCalculatedAt || quote.lastUpdatedAt ? (
                <div className="text-right space-y-0.5">
                  {quote.valuesCalculatedAt ? (
                    <p className="text-[8px] text-neutral-500">
                      Valores calculados em {quote.valuesCalculatedAt}
                    </p>
                  ) : null}
                  {quote.lastUpdatedAt ? (
                    <p className="text-[8px] text-neutral-500">
                      Atualizado em {quote.lastUpdatedAt}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            {isAddendum ? (
              <AddendumContextBlock
                observacoes={quote.observacoes}
                addendumRef={quote.addendumRef}
                addendumTotal={quote.valor_final}
              />
            ) : null}

            {!isPaged && !isAddendum ? (
              <CommercialFooterBlock compact={isCompact} assetBase={assetBase} />
            ) : null}
          </main>

          <PrintBottomFooter />
        </div>

        {isPaged && !isAddendum ? (
          <div className="print-page print-page-break flex flex-col">
            <PrintTopHeader
              assetBase={assetBase}
              title="Condições comerciais"
              quoteCodigo={isComplete ? quoteCodigo : undefined}
            />
            <main
              className={`flex-1 px-[20mm] flex flex-col min-h-0 ${
                isComplete ? "py-5 gap-0" : "py-6 gap-5"
              }`}
            >
              {isComplete ? (
                <CompleteCommercialConditionsPage
                  assetBase={assetBase}
                  validadeLabel={validadeLabel}
                />
              ) : (
                <>
                  <p className="text-[11px] text-neutral-500 leading-relaxed shrink-0">
                    Informações de prazo, garantia, montagem e formas de pagamento desta proposta.
                  </p>
                  <div className="print-quote-items flex-1 flex flex-col justify-end">
                    <CommercialFooterBlock compact={false} assetBase={assetBase} />
                  </div>
                </>
              )}
            </main>
            <PrintBottomFooter />
          </div>
        ) : null}

        {catalogPages.map((pageItems, pageIndex) => (
          <div
            key={`catalog-${pageIndex}`}
            className="print-page print-page-break flex flex-col"
          >
            <PrintTopHeader
              assetBase={assetBase}
              title="Detalhamento visual"
              quoteCodigo={quoteCodigo}
            />
            <main className="flex-1 px-[20mm] py-6 flex flex-col gap-4 min-h-0">
              <div className="shrink-0 space-y-1">
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  Referências visuais dos itens desta proposta. Valores na página anterior.
                </p>
                {pageIndex === 0 && catalogItems.length === 0 ? (
                  <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    Nenhum item com imagem nos itens salvos. Cadastre a foto em Orçamentos → Itens
                    salvos (descrição ou detalhe) com o mesmo texto usado no orçamento.
                  </p>
                ) : null}
              </div>
              <div className="print-catalog-grid">
                {pageItems.map((entry, idx) => (
                  <article
                    key={`${entry.label}-${idx}`}
                    className="print-catalog-card"
                  >
                    <div className="print-catalog-card__media">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={entry.imagem_url}
                        alt={entry.label}
                      />
                    </div>
                    <p className="print-catalog-card__name line-clamp-2">
                      {formatQuotePhrase(entry.label)}
                    </p>
                  </article>
                ))}
              </div>
            </main>
            <PrintBottomFooter />
          </div>
        ))}
      </div>
    </div>
  );
}
