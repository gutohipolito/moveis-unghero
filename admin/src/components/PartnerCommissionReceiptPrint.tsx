import type { ReactNode } from "react";
import { Phone } from "lucide-react";
import { QUOTE_PRINT_FACTORY } from "@/components/QuotePrintDocument";
import { formatContractDateLong } from "@/lib/contractTemplates";
import { currencyToExtenso, formatCurrencyBRL } from "@/lib/currencyExtenso";
import { getPartnerRoleLabel } from "@/lib/partnerTypes";
import type { PartnerCommissionReceiptDTO } from "@/app/actions/partnerCommissions";

export function commissionReceiptPrintStylesCss() {
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
        height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
      }
      .no-print { display: none !important; }
      .commission-print-root {
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
        min-height: 0 !important;
      }
      .commission-sheet {
        box-shadow: none !important;
        margin: 0 !important;
        border-radius: 0 !important;
        width: 210mm !important;
        height: 297mm !important;
        min-height: 297mm !important;
        max-height: 297mm !important;
        overflow: hidden !important;
        page-break-after: avoid !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .commission-inner {
        padding: 11mm 14mm 10mm !important;
        min-height: 297mm !important;
        height: 297mm !important;
        max-height: 297mm !important;
        box-sizing: border-box !important;
      }
      .commission-logo-black {
        filter: invert(1) brightness(0.25) !important;
      }
    }
    .commission-sheet {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #fff;
      color: #171717;
      font-family: "Segoe UI", system-ui, sans-serif;
      box-shadow: 0 8px 40px rgba(24, 16, 8, 0.12);
    }
    .commission-inner {
      padding: 12mm 14mm 10mm;
      display: flex;
      flex-direction: column;
      min-height: 297mm;
      box-sizing: border-box;
    }
  `;
}

function formatDateSafe(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return formatContractDateLong(new Date(`${iso.slice(0, 10)}T12:00:00`));
  } catch {
    return iso;
  }
}

export default function PartnerCommissionReceiptPrint({
  receipt,
  topBar,
  assetBase = "",
}: {
  receipt: PartnerCommissionReceiptDTO;
  topBar?: ReactNode;
  assetBase?: string;
}) {
  const f = QUOTE_PRINT_FACTORY;
  const roleLabel = getPartnerRoleLabel(receipt.parceiro_tipo, receipt.parceiro_nome);
  const numeroLabel = String(receipt.numero).padStart(4, "0");
  const logoSrc = `${assetBase}/logo.png`;
  const orcamentoCodigo = receipt.orcamento_codigo?.trim() || null;
  const emitidoEm = formatContractDateLong(new Date(receipt.createdAt));

  return (
    <div className="commission-print-root">
      <style dangerouslySetInnerHTML={{ __html: commissionReceiptPrintStylesCss() }} />
      {topBar}
      <div className="commission-sheet">
        <div className="commission-inner">
          <header className="flex items-center justify-between gap-4 border-b border-neutral-200 pb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoSrc}
              alt="Móveis Unghero"
              className="commission-logo-black h-9 w-auto object-contain shrink-0 invert brightness-[0.25]"
            />
            <div className="text-right shrink-0 leading-tight">
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                Comprovante de comissão
              </p>
              <p className="text-xs font-medium text-neutral-600 tabular-nums mt-0.5">
                Nº {numeroLabel}
              </p>
              <p className="text-[9px] text-neutral-500 mt-0.5">Emitido em {emitidoEm}</p>
            </div>
          </header>

          <section className="mt-4 grid grid-cols-2 gap-4">
            <div className="space-y-0.5">
              <p className="text-[8px] font-black uppercase tracking-[0.14em] text-neutral-500">
                Beneficiário
              </p>
              <p className="text-[15px] font-bold text-neutral-950 leading-snug">
                {receipt.parceiro_nome}
              </p>
              <p className="text-[11px] text-neutral-600">{roleLabel}</p>
              {receipt.parceiro_registro && (
                <p className="text-[11px] text-neutral-600">{receipt.parceiro_registro}</p>
              )}
              {receipt.parceiro_escritorio && (
                <p className="text-[11px] text-neutral-600">{receipt.parceiro_escritorio}</p>
              )}
            </div>
            <div className="space-y-0.5">
              <p className="text-[13px] font-bold text-neutral-950">Orçamento aprovado</p>
              <p className="text-[15px] font-medium text-neutral-800 tabular-nums tracking-tight">
                {orcamentoCodigo || "—"}
              </p>
              <p className="text-[11px] text-neutral-600">
                Cliente:{" "}
                <span className="font-semibold text-neutral-800">{receipt.cliente_nome}</span>
              </p>
            </div>
          </section>

          <section className="mt-3.5 border border-neutral-200 rounded-lg overflow-hidden">
            <div className="grid grid-cols-3 divide-x divide-neutral-200">
              <div className="px-3 py-2.5">
                <p className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
                  Base aprovada
                </p>
                <p className="text-sm font-bold tabular-nums text-neutral-950 mt-0.5">
                  {formatCurrencyBRL(receipt.base_valor)}
                </p>
              </div>
              <div className="px-3 py-2.5">
                <p className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
                  Percentual
                </p>
                <p className="text-sm font-bold tabular-nums text-neutral-950 mt-0.5">
                  {receipt.percentual}%
                </p>
              </div>
              <div className="px-3 py-2.5 bg-neutral-50">
                <p className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
                  Valor pago
                </p>
                <p className="text-base font-black tabular-nums text-neutral-950 mt-0.5">
                  {formatCurrencyBRL(receipt.valor_comissao)}
                </p>
              </div>
            </div>
            <p className="px-3 py-1.5 text-[10px] text-neutral-600 italic border-t border-neutral-100">
              ({currencyToExtenso(receipt.valor_comissao)})
            </p>
          </section>

          <section className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-md border border-neutral-200 px-2.5 py-2">
              <p className="text-[8px] font-black uppercase tracking-widest text-neutral-500">
                Nota fiscal
              </p>
              <p className="text-sm font-black tabular-nums text-neutral-950 mt-0.5">
                {receipt.nota_fiscal_numero || "—"}
              </p>
              <p className="text-[9px] text-neutral-500">
                {formatDateSafe(receipt.nota_fiscal_emitida_em)}
              </p>
            </div>
            <div className="rounded-md border border-neutral-200 px-2.5 py-2">
              <p className="text-[8px] font-black uppercase tracking-widest text-neutral-500">
                Pag. previsto
              </p>
              <p className="text-xs font-semibold text-neutral-800 mt-0.5">
                {formatDateSafe(receipt.data_pagamento_prevista)}
              </p>
            </div>
            <div className="rounded-md border border-neutral-200 px-2.5 py-2">
              <p className="text-[8px] font-black uppercase tracking-widest text-neutral-500">
                Pag. efetivo
              </p>
              <p className="text-xs font-semibold text-neutral-800 mt-0.5">
                {formatDateSafe(receipt.data_pagamento_efetiva)}
              </p>
            </div>
          </section>

          {receipt.observacoes ? (
            <section className="mt-3">
              <p className="text-[8px] font-black uppercase tracking-[0.14em] text-neutral-500 mb-0.5">
                Observações
              </p>
              <p className="text-[11px] text-neutral-700 whitespace-pre-wrap leading-snug line-clamp-3">
                {receipt.observacoes}
              </p>
            </section>
          ) : null}

          <section className="mt-4 space-y-1.5 text-[10px] leading-snug text-neutral-600">
            <p>
              <strong>{f.name}</strong>, inscrita no CNPJ sob o nº <strong>{f.cnpj}</strong>, com
              sede na {f.street}, {f.neighborhood}, {f.city}, declara ter efetuado o pagamento da
              comissão acima descrita ao beneficiário identificado neste documento, no valor de{" "}
              <strong>{formatCurrencyBRL(receipt.valor_comissao)}</strong>
              {orcamentoCodigo ? (
                <>
                  , referente ao orçamento <strong>{orcamentoCodigo}</strong>
                </>
              ) : null}
              {receipt.nota_fiscal_numero ? (
                <>
                  , conforme Nota Fiscal nº <strong>{receipt.nota_fiscal_numero}</strong>
                  {receipt.nota_fiscal_emitida_em
                    ? <> emitida em {formatDateSafe(receipt.nota_fiscal_emitida_em)}</>
                    : null}
                </>
              ) : null}
              .
            </p>
            <p>
              Este comprovante serve como prova do pagamento da comissão ao parceiro indicado. Não
              substitui a Nota Fiscal de Serviço ou documento fiscal próprio do beneficiário,
              quando exigido pela legislação vigente.
            </p>
            <p className="pt-2 text-center text-xs font-bold uppercase tracking-wide text-neutral-900">
              Farroupilha — RS, {emitidoEm}
            </p>
          </section>

          <div className="mt-6 flex justify-center">
            <div className="text-center flex flex-col w-[220px]">
              <div className="h-[36px] flex items-end justify-center pb-0.5">
                <p
                  className="text-[26px] leading-none text-neutral-900"
                  style={{ fontFamily: '"CladenirSignature", cursive' }}
                >
                  Mareli Unghero
                </p>
              </div>
              <div className="border-t border-neutral-800 mx-2" />
              <div className="space-y-0 pt-1">
                <p className="text-[9px] font-black uppercase tracking-widest">
                  Mareli Unghero
                </p>
                <p className="text-[8px] text-neutral-500 uppercase tracking-wide">
                  Financeiro
                </p>
                <p className="text-[8px] text-neutral-400">
                  {f.name} — CNPJ {f.cnpj}
                </p>
              </div>
            </div>
          </div>

          <footer className="mt-auto pt-4 border-t border-neutral-200 text-[9px] text-neutral-600 leading-snug">
            <div className="flex flex-row items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-neutral-800">{f.name}</p>
                <p>CNPJ {f.cnpj}</p>
                <p>
                  {f.street} — {f.neighborhood} — {f.city}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="inline-flex items-center justify-end gap-1">
                  <Phone className="h-2.5 w-2.5 shrink-0 text-neutral-500" aria-hidden />
                  <span className="tabular-nums">{f.whatsapp}</span>
                </p>
                <p>{f.email}</p>
                <p>{f.site}</p>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
