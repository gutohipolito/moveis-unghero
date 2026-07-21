import type { ReactNode } from "react";
import { QUOTE_PRINT_FACTORY } from "@/components/QuotePrintDocument";
import { formatContractDateLong } from "@/lib/contractTemplates";
import {
  currencyToExtenso,
  formatCurrencyBRL,
} from "@/lib/currencyExtenso";

export type ReceiptPrintData = {
  numero: number;
  valor: number;
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
        height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .print-page {
        width: 210mm !important;
        height: auto !important;
        min-height: 297mm !important;
        max-height: none !important;
        page-break-after: auto !important;
        break-after: auto !important;
        padding: 0 !important;
        margin: 0 auto !important;
        box-sizing: border-box !important;
        border: none !important;
        box-shadow: none !important;
        background: #ffffff !important;
        overflow: visible !important;
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
      .print\\:hidden {
        display: none !important;
      }
      .receipt-logo-header {
        filter: invert(1) !important;
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
      a[href^="http"]::after,
      a[href^="mailto"]::after {
        content: none !important;
      }
    }
    @media screen {
      .print-shell {
        min-height: 100vh;
        background: #e5e5e5;
        padding: 2rem 1rem;
      }
      .print-shell-inner {
        max-width: 210mm;
        margin: 0 auto;
      }
      .print-page {
        width: 210mm;
        min-height: 297mm;
        margin: 0 auto;
        background: #fff;
        box-shadow: 0 8px 30px rgba(0,0,0,.12);
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
  const numeroLabel = String(receipt.numero).padStart(4, "0");
  const quitacaoLabel =
    receipt.quitacao === "TOTAL"
      ? "quitação total da obrigação referida"
      : "quitação parcial da obrigação referida";

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

            <header className="relative z-10 flex items-center justify-between border-b border-neutral-200 px-10 pt-8 pb-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoSrc}
                alt={f.name}
                className="receipt-logo-header h-10 w-auto object-contain invert"
              />
              <div className="text-right space-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
                  Recibo de pagamento
                </p>
                <p className="text-xs font-black text-neutral-800">Nº {numeroLabel}</p>
              </div>
            </header>

            <main className="relative z-10 flex-1 px-10 py-8 space-y-6 text-[13px] leading-relaxed font-medium">
              <div className="rounded-lg border border-neutral-200 bg-neutral-50/80 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    Valor recebido
                  </p>
                  <p className="text-2xl font-black tracking-tight text-neutral-950">{valorLabel}</p>
                </div>
                <div className="text-right">
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
                , referente a <strong>{receipt.referente}</strong>, pago mediante{" "}
                <strong>{receipt.metodoLabel}</strong>, correspondente à{" "}
                <strong>{quitacaoLabel}</strong>.
              </p>

              {receipt.observacoes?.trim() ? (
                <p className="text-justify text-[12px] text-neutral-600 leading-relaxed">
                  <span className="font-bold text-neutral-800">Observações: </span>
                  {receipt.observacoes.trim()}
                </p>
              ) : null}

              <p className="pt-2 text-[11px] text-neutral-500 leading-relaxed">
                Este recibo comprova o recebimento do valor acima pela pessoa jurídica emissora. Não
                substitui nota fiscal quando a legislação exigir a emissão do documento fiscal
                correspondente.
              </p>

              <p className="pt-6 text-center text-[13px] font-bold uppercase tracking-wide">
                {receipt.cidade_emissao}, {dataLabel}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 pt-16">
                <div className="text-center space-y-1">
                  <p
                    className="text-[30px] leading-none text-neutral-900"
                    style={{ fontFamily: '"CladenirSignature", cursive' }}
                  >
                    Cladenir Unghero
                  </p>
                  <div className="border-t border-neutral-800 mx-4" />
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
                <div className="text-center space-y-1 pt-[30px]">
                  <div className="border-t border-neutral-800 mx-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-800">
                    Pagador
                  </p>
                  <p className="text-[9px] font-bold text-neutral-600">
                    {receipt.cliente_nome}
                  </p>
                  <p className="text-[9px] text-neutral-500">
                    {receipt.cliente_documento}
                  </p>
                </div>
              </div>
            </main>

            <footer className="relative z-10 mt-auto border-t border-neutral-200 px-10 py-5 text-[10px] text-neutral-600">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="font-bold text-neutral-800">{f.name}</p>
                  <p>CNPJ {f.cnpj}</p>
                  <p>
                    {f.street} — {f.neighborhood} — {f.city}
                  </p>
                </div>
                <div className="sm:text-right space-y-0.5">
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
