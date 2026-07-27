import type { ReactNode } from "react";
import { QUOTE_PRINT_FACTORY } from "@/components/QuotePrintDocument";
import { formatContractDateLong } from "@/lib/contractTemplates";
import {
  currencyToExtenso,
  formatCurrencyBRL,
} from "@/lib/currencyExtenso";

export type ReceiptPrintReferencia = {
  titulos: string[];
  residencia: string | null;
  orcamentoCodigo: string | null;
  natureza: string | null;
};

export type ReceiptPrintData = {
  id: string;
  numero?: number;
  numeroLabel?: string;
  valor: number;
  parcela_numero?: number | null;
  parcela_total?: number | null;
  referente: string;
  metodoLabel: string;
  data_recebimento: Date | string;
  cidade_emissao: string;
  quitacao: "TOTAL" | "PARCIAL";
  cliente_nome: string;
  cliente_documento: string;
  cliente_endereco?: string | null;
  emitido_por_nome?: string | null;
  observacoes?: string | null;
  referencia?: ReceiptPrintReferencia | null;
};

export function receiptPrintStylesCss() {
  return `
    @font-face {
      font-family: "CladenirSignature";
      src: url("/fonts/cladenir-signature.woff2") format("woff2");
      font-display: swap;
    }
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
        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;
        page-break-after: auto !important;
        break-after: auto !important;
        padding: 0 !important;
        margin: 0 !important;
        box-sizing: border-box !important;
        border: none !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        background: #ffffff !important;
        overflow: visible !important;
        transform: none !important;
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
      .print\\:hidden,
      .print-hidden {
        display: none !important;
      }
      .receipt-logo-header {
        /* logo.png é branco (pensado p/ header escuro); no recibo o fundo é claro */
        filter: brightness(0) !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .receipt-watermark {
        opacity: 0.05 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .receipt-watermark img {
        filter: invert(1) brightness(0.25) !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .receipt-meta-card,
      .receipt-condition-card {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      a[href]::after,
      a[href^="http"]::after,
      a[href^="mailto"]::after {
        content: none !important;
      }
    }
    @media screen {
      .print-shell {
        min-height: 100vh;
        background: #e5e5e5;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }
      .print-shell-inner {
        width: max-content;
        max-width: none;
        margin: 0 auto;
        padding: 24px;
        box-sizing: border-box;
      }
      .print-page {
        width: 210mm !important;
        min-width: 210mm !important;
        max-width: 210mm !important;
        min-height: 297mm;
        margin: 0 auto;
        box-sizing: border-box;
        background: #fff;
        box-shadow: 0 8px 30px rgba(0,0,0,.12);
        overflow: visible;
      }
    }
  `;
}

type ReceiptPrintDocumentProps = {
  receipt: ReceiptPrintData;
  assetBase?: string;
  topBar?: ReactNode;
};

export default function ReceiptPrintDocument({
  receipt,
  assetBase = "",
  topBar,
}: ReceiptPrintDocumentProps) {
  const logoSrc = `${assetBase}/logo.png`;
  const watermarkSrc = `${assetBase}/mu-watermark.png`;
  const f = QUOTE_PRINT_FACTORY;
  const valorLabel = formatCurrencyBRL(receipt.valor);
  const valorExtenso = currencyToExtenso(receipt.valor);
  const dataLabel = formatContractDateLong(receipt.data_recebimento);
  const parcelaLabel =
    receipt.parcela_numero && receipt.parcela_total
      ? `Parcela ${String(receipt.parcela_numero).padStart(2, "0")}/${String(
          receipt.parcela_total
        ).padStart(2, "0")}`
      : null;
  const quitacaoLabel =
    receipt.quitacao === "TOTAL"
      ? "quitação total da obrigação referida"
      : "quitação parcial da obrigação referida";

  const ref = receipt.referencia;
  const hasStructuredRef = Boolean(
    ref &&
      (ref.titulos.length > 0 ||
        ref.orcamentoCodigo ||
        ref.residencia ||
        ref.natureza)
  );
  const observacoes = receipt.observacoes?.trim() || "";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: receiptPrintStylesCss() }} />
      <div className="print-shell">
        {topBar ? <div className="print:hidden mb-4">{topBar}</div> : null}
        <div className="print-shell-inner">
          <article className="print-page relative flex flex-col text-neutral-900 overflow-hidden">
            <div
              className="receipt-watermark pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.05]"
              aria-hidden
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={watermarkSrc}
                alt=""
                className="w-[92%] max-w-[680px] object-contain invert brightness-[0.25]"
              />
            </div>

            <header className="relative z-10 flex items-center justify-between gap-6 border-b border-neutral-200 px-10 pt-8 pb-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoSrc}
                alt={f.name}
                className="receipt-logo-header h-10 w-auto object-contain brightness-0"
              />
              <div className="text-right space-y-0.5 shrink-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
                  Recibo de pagamento
                </p>
                {receipt.numeroLabel ? (
                  <p className="text-sm font-black tracking-tight text-neutral-900">
                    {receipt.numeroLabel}
                  </p>
                ) : null}
              </div>
            </header>

            <main className="relative z-10 flex-1 px-10 py-8 space-y-5 text-[13px] leading-relaxed font-medium">
              <div className="receipt-meta-card rounded-xl bg-neutral-900 text-white px-5 py-4 grid grid-cols-2 gap-4">
                <div className="min-w-0 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
                    Recibo de pagamento
                  </p>
                  <p className="text-sm font-semibold text-white/90">
                    {parcelaLabel || ref?.natureza || "Pagamento"}
                  </p>
                </div>
                <div className="min-w-0 text-right space-y-1">
                  {receipt.numeroLabel ? (
                    <p className="text-sm font-black tracking-tight">{receipt.numeroLabel}</p>
                  ) : null}
                  {ref?.orcamentoCodigo ? (
                    <p className="text-[11px] font-medium text-white/70">
                      Orçamento {ref.orcamentoCodigo}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-lg border border-neutral-200 bg-neutral-50/80 px-4 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    Valor recebido
                  </p>
                  <p className="text-2xl font-black tracking-tight text-neutral-950">
                    {valorLabel}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    Forma de pagamento
                  </p>
                  <p className="text-sm font-bold text-neutral-800">{receipt.metodoLabel}</p>
                </div>
              </div>

              <p className="text-justify leading-[1.75] text-[13px] text-neutral-800">
                <strong>{f.name}</strong>, inscrita no CNPJ sob o nº <strong>{f.cnpj}</strong>, com
                sede na {f.street}, {f.neighborhood}, {f.city}, declara para os devidos fins que{" "}
                <strong>recebeu de {receipt.cliente_nome}</strong>
                {receipt.cliente_documento ? (
                  <>
                    , {receipt.cliente_documento}
                    {receipt.cliente_endereco ? `, com endereço em ${receipt.cliente_endereco}` : ""}
                  </>
                ) : null}
                , a importância de <strong>{valorLabel}</strong>
                {valorExtenso ? (
                  <>
                    {" "}
                    (<strong>{valorExtenso}</strong>)
                  </>
                ) : null}
                , pago mediante <strong>{receipt.metodoLabel}</strong>, correspondente à{" "}
                <strong>{quitacaoLabel}</strong>
                {hasStructuredRef ? ", conforme referência abaixo" : null}
                {!hasStructuredRef ? (
                  <>
                    , referente a <strong className="whitespace-pre-line">{receipt.referente}</strong>
                  </>
                ) : null}
                .
              </p>

              {hasStructuredRef && ref ? (
                <section className="rounded-xl border border-neutral-200 bg-white px-5 py-4 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500">
                    Referente ao projeto
                  </p>
                  {ref.titulos.length > 0 ? (
                    <ul className="space-y-1">
                      {ref.titulos.map((titulo) => (
                        <li
                          key={titulo}
                          className="text-[13px] font-semibold text-neutral-900 leading-snug"
                        >
                          {titulo}
                        </li>
                      ))}
                    </ul>
                  ) : ref.natureza ? (
                    <p className="text-[13px] font-semibold text-neutral-900">{ref.natureza}</p>
                  ) : null}
                  <div className="space-y-0.5 pt-1 border-t border-neutral-100">
                    {ref.residencia ? (
                      <p className="text-[12px] text-neutral-600">
                        Residência <span className="font-semibold text-neutral-800">{ref.residencia}</span>
                      </p>
                    ) : null}
                    {ref.orcamentoCodigo ? (
                      <p className="text-[12px] text-neutral-600">
                        Orçamento:{" "}
                        <span className="font-semibold text-neutral-800">{ref.orcamentoCodigo}</span>
                      </p>
                    ) : null}
                  </div>
                </section>
              ) : null}

              {observacoes ? (
                <section className="receipt-condition-card rounded-xl border border-sky-200/80 bg-sky-50/90 px-5 py-4">
                  <div className="flex gap-3">
                    <span
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-600 text-[11px] font-black text-white"
                      aria-hidden
                    >
                      i
                    </span>
                    <div className="min-w-0 space-y-1.5">
                      <p className="text-[11px] font-black uppercase tracking-wider text-sky-900">
                        Condição de pagamento
                      </p>
                      <p className="text-[12px] leading-relaxed text-sky-950/90 whitespace-pre-line">
                        {observacoes}
                      </p>
                    </div>
                  </div>
                </section>
              ) : null}

              <p className="pt-1 text-[11px] text-neutral-500 leading-relaxed">
                Este recibo comprova o recebimento do valor acima pela pessoa jurídica emissora. Não
                substitui nota fiscal quando a legislação exigir a emissão do documento fiscal
                correspondente.
              </p>

              <p className="pt-6 text-center text-[13px] font-bold uppercase tracking-wide">
                {receipt.cidade_emissao}, {dataLabel}
              </p>

              <div className="grid grid-cols-2 gap-10 pt-16 items-end">
                <div className="text-center flex flex-col">
                  <div className="h-[44px] flex items-end justify-center pb-1">
                    <p
                      className="text-[30px] leading-none text-neutral-900"
                      style={{ fontFamily: '"CladenirSignature", cursive' }}
                    >
                      Cladenir Unghero
                    </p>
                  </div>
                  <div className="border-t border-neutral-800 mx-4" />
                  <div className="space-y-1 pt-1.5">
                    <p className="text-[10px] font-black uppercase tracking-widest">
                      Cladenir Unghero
                    </p>
                    <p className="text-[9px] text-neutral-500 uppercase tracking-wide">
                      Responsável Comercial
                    </p>
                    <p className="text-[9px] text-neutral-400">
                      {f.name} — CNPJ {f.cnpj}
                    </p>
                  </div>
                </div>
                <div className="text-center flex flex-col text-[#3f3f46]">
                  <div className="h-[44px]" aria-hidden />
                  <div className="border-t border-[#3f3f46] mx-4" />
                  <div className="space-y-1 pt-1.5">
                    <p className="text-[10px] font-black uppercase tracking-widest">Pagador</p>
                    <p className="text-[9px] font-bold">{receipt.cliente_nome}</p>
                    <p className="text-[9px]">{receipt.cliente_documento}</p>
                  </div>
                </div>
              </div>
            </main>

            <footer className="relative z-10 mt-auto border-t border-neutral-200 px-10 py-5 text-[10px] text-neutral-600">
              <div className="flex flex-row items-end justify-between gap-4">
                <div className="space-y-0.5 min-w-0">
                  <p className="font-bold text-neutral-800">{f.name}</p>
                  <p>CNPJ {f.cnpj}</p>
                  <p>
                    {f.street} — {f.neighborhood} — {f.city}
                  </p>
                </div>
                <div className="text-right space-y-0.5 shrink-0">
                  <p>{f.whatsapp}</p>
                  <p>{f.email}</p>
                  <p>{f.site}</p>
                </div>
              </div>
            </footer>
          </article>
        </div>
      </div>
    </>
  );
}
