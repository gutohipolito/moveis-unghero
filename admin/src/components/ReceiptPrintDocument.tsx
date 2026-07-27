import type { ReactNode } from "react";
import { Check, Phone } from "lucide-react";
import { QUOTE_PRINT_FACTORY } from "@/components/QuotePrintDocument";
import { formatContractDateLong } from "@/lib/contractTemplates";
import {
  currencyToExtenso,
  formatCurrencyBRL,
} from "@/lib/currencyExtenso";
import { receiptPaymentBrands } from "@/lib/paymentBrands";

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
  /** Código do método (PIX, BOLETO…) para bandeira. */
  metodo?: string | null;
  data_recebimento: Date | string;
  cidade_emissao: string;
  quitacao: "TOTAL" | "PARCIAL";
  cliente_nome: string;
  cliente_documento: string;
  cliente_endereco?: string | null;
  emitido_por_nome?: string | null;
  observacoes?: string | null;
  referencia?: ReceiptPrintReferencia | null;
  financeiro?: {
    valorTotalProjeto: number;
    valorParcela: number;
    saldoPendente: number;
  } | null;
  validacao?: {
    url: string;
    qrDataUrl: string;
    codigo: string;
  } | null;
};

/** Capitaliza a primeira letra de cada linha (condição de pagamento). */
export function capitalizePaymentCondition(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "";
      return trimmed.charAt(0).toLocaleUpperCase("pt-BR") + trimmed.slice(1);
    })
    .join("\n")
    .trim();
}

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
      .receipt-header-dark,
      .receipt-condition-card,
      .receipt-ref-card,
      .receipt-pay-badge,
      .receipt-validate-block {
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
  const hasStructuredRef = Boolean(ref && (ref.titulos.length > 0 || ref.natureza));
  const observacoes = capitalizePaymentCondition(receipt.observacoes || "");
  const payBrands = receiptPaymentBrands(receipt.metodo);
  const financeiro = receipt.financeiro;
  const projetoQuitado = Boolean(
    financeiro && financeiro.saldoPendente <= 0.009
  );
  const validacao = receipt.validacao;

  const parcelaRefLabel = parcelaLabel
    ? parcelaLabel.replace(/^Parcela\s+/i, "parcela ")
    : null;

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

            <header className="receipt-header-dark relative z-10 flex items-center justify-between gap-6 bg-neutral-900 text-white px-10 py-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoSrc}
                alt={f.name}
                className="h-10 w-auto object-contain"
              />
              <div className="text-right space-y-1 shrink-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/55">
                  Recibo de pagamento
                </p>
                {receipt.numeroLabel ? (
                  <p className="text-sm font-black tracking-tight text-white">
                    {receipt.numeroLabel}
                  </p>
                ) : null}
                {parcelaLabel ? (
                  <p className="text-[12px] font-semibold text-white/80">{parcelaLabel}</p>
                ) : null}
              </div>
            </header>

            <main className="relative z-10 flex-1 px-10 py-7 space-y-5 text-[13px] leading-relaxed font-medium">
              {financeiro ? (
                <div className="rounded-lg border border-neutral-200 bg-neutral-50/80 px-4 py-3.5 space-y-3">
                  <div className="grid grid-cols-3 gap-2 items-end">
                    <div className="min-w-0 text-left">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                        Valor total do projeto
                      </p>
                      <p className="text-sm font-bold tracking-tight text-neutral-600 mt-0.5 tabular-nums">
                        {formatCurrencyBRL(financeiro.valorTotalProjeto)}
                      </p>
                    </div>
                    <div className="min-w-0 text-center rounded-lg bg-amber-50/90 border border-amber-200/70 px-2 py-2 -my-0.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800/80">
                        Valor desta parcela
                      </p>
                      <p className="text-xl font-black tracking-tight text-amber-950 mt-0.5 tabular-nums">
                        {formatCurrencyBRL(financeiro.valorParcela)}
                      </p>
                    </div>
                    <div className="min-w-0 text-right">
                      {projetoQuitado ? (
                        <>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700/80">
                            Saldo
                          </p>
                          <p className="inline-flex items-center justify-end gap-1 text-sm font-black tracking-tight text-emerald-700 mt-0.5">
                            <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={3} aria-hidden />
                            Projeto quitado
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                            Saldo pendente
                          </p>
                          <p className="text-sm font-bold tracking-tight text-neutral-600 mt-0.5 tabular-nums">
                            {formatCurrencyBRL(financeiro.saldoPendente)}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-neutral-200/80 pt-3">
                    <p className="text-sm font-bold text-neutral-800">
                      <span className="font-semibold text-neutral-500">Forma de pagamento:</span>{" "}
                      {receipt.metodoLabel}
                    </p>
                    {payBrands.length > 0 ? (
                      <span className="receipt-pay-badge inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-1.5 py-0.5 shadow-xs shrink-0">
                        {payBrands.map((brand) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={brand.src}
                            src={`${assetBase}${brand.src}`}
                            alt={brand.alt}
                            width={brand.width}
                            height={brand.height}
                            className="object-contain"
                          />
                        ))}
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-neutral-200 bg-neutral-50/80 px-4 py-3.5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800/80">
                      Valor recebido
                    </p>
                    <p className="text-2xl font-black tracking-tight text-amber-950">
                      {valorLabel}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <p className="text-sm font-bold text-neutral-800 text-right">
                      <span className="font-semibold text-neutral-500">Forma de pagamento:</span>{" "}
                      {receipt.metodoLabel}
                    </p>
                    {payBrands.length > 0 ? (
                      <span className="receipt-pay-badge inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-1.5 py-0.5 shadow-xs">
                        {payBrands.map((brand) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={brand.src}
                            src={`${assetBase}${brand.src}`}
                            alt={brand.alt}
                            width={brand.width}
                            height={brand.height}
                            className="object-contain"
                          />
                        ))}
                      </span>
                    ) : null}
                  </div>
                </div>
              )}

              <p className="text-justify leading-[1.7] text-[13px] text-neutral-800">
                Declaramos o recebimento de <strong>{valorLabel}</strong>
                {valorExtenso ? (
                  <>
                    {" "}
                    (<strong>{valorExtenso}</strong>)
                  </>
                ) : null}
                , pagos via <strong>{receipt.metodoLabel}</strong> por{" "}
                <strong>{receipt.cliente_nome}</strong>
                {receipt.cliente_documento ? (
                  <>
                    , {receipt.cliente_documento}
                    {receipt.cliente_endereco
                      ? `, com endereço em ${receipt.cliente_endereco}`
                      : ""}
                  </>
                ) : null}
                {parcelaRefLabel ? (
                  <>
                    , referentes à <strong>{parcelaRefLabel}</strong> do projeto descrito neste
                    documento
                  </>
                ) : hasStructuredRef ? (
                  <>, referentes ao projeto descrito neste documento</>
                ) : (
                  <>
                    , referentes a{" "}
                    <strong className="whitespace-pre-line">{receipt.referente}</strong>
                  </>
                )}
                , correspondente à <strong>{quitacaoLabel}</strong>
                {hasStructuredRef ? ", conforme ambientes abaixo" : null}.{" "}
                <strong>{f.name}</strong>, inscrita no CNPJ sob o nº <strong>{f.cnpj}</strong>, com
                sede na {f.street}, {f.neighborhood}, {f.city}.
              </p>

              {hasStructuredRef && ref ? (
                <section className="receipt-ref-card overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50/60">
                  <div className="border-l-[3px] border-neutral-800 px-5 py-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500 mb-2.5">
                      Ambientes
                    </p>

                    {ref.titulos.length > 0 ? (
                      <ul className="space-y-1.5">
                        {ref.titulos.map((titulo, index) => (
                          <li
                            key={`${titulo}-${index}`}
                            className="text-[13px] font-semibold tracking-tight text-neutral-950 leading-snug"
                          >
                            {titulo}
                          </li>
                        ))}
                      </ul>
                    ) : ref.natureza ? (
                      <p className="text-[13px] font-semibold text-neutral-950">{ref.natureza}</p>
                    ) : null}
                  </div>
                </section>
              ) : null}

              {observacoes ? (
                <section className="receipt-condition-card rounded-xl border border-neutral-200 bg-neutral-50/80 px-5 py-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500 mb-1.5">
                    Condição de pagamento
                  </p>
                  <p className="text-[12px] leading-relaxed text-neutral-700 whitespace-pre-line">
                    {observacoes}
                  </p>
                </section>
              ) : null}

              <p className="pt-1 text-[11px] text-neutral-500 leading-relaxed">
                Este recibo comprova o recebimento do valor descrito acima, referente à parcela
                indicada. Não substitui a Nota Fiscal de Serviço ou de Venda, quando exigida pela
                legislação vigente.
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

              {validacao ? (
                <div className="flex justify-end pt-10">
                  <div className="receipt-validate-block flex items-center gap-3.5 rounded-xl border border-neutral-200 bg-neutral-50/90 px-3.5 py-3 max-w-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={validacao.qrDataUrl}
                      alt={`QR Code para validar ${validacao.codigo}`}
                      width={88}
                      height={88}
                      className="h-[88px] w-[88px] shrink-0 rounded-md bg-white"
                    />
                    <div className="min-w-0 text-left space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-neutral-700">
                        Validar autenticidade
                      </p>
                      <p className="text-[11px] leading-snug text-neutral-600">
                        Escaneie para verificar este recibo.
                      </p>
                      <p className="text-[11px] font-bold text-neutral-900 tabular-nums">
                        Código: {validacao.codigo}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
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
                  <p className="inline-flex items-center justify-end gap-1.5">
                    <Phone className="h-2.5 w-2.5 shrink-0 text-neutral-500" aria-hidden />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`${assetBase}/icons/whatsapp.svg`}
                      alt="WhatsApp"
                      width={10}
                      height={10}
                      className="h-2.5 w-2.5 shrink-0 object-contain"
                    />
                    <span className="tabular-nums leading-none">{f.whatsapp}</span>
                  </p>
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
