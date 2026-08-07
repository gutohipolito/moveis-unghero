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
      }
      .no-print { display: none !important; }
      .commission-sheet {
        box-shadow: none !important;
        margin: 0 !important;
        border-radius: 0 !important;
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
      padding: 16mm 18mm 14mm;
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
  const orcamentoCodigo =
    receipt.orcamento_codigo?.trim() ||
    (receipt.orcamento_versao != null ? `v${receipt.orcamento_versao}` : null);
  const emitidoEm = formatContractDateLong(new Date(receipt.createdAt));

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: commissionReceiptPrintStylesCss() }} />
      {topBar}
      <div className="commission-sheet">
        <div className="commission-inner">
          {/* Header: logo preto | título + Nº */}
          <header className="flex items-center justify-between gap-6 border-b border-neutral-200 pb-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoSrc}
              alt="Móveis Unghero"
              className="commission-logo-black h-12 w-auto object-contain shrink-0 invert brightness-[0.25]"
            />
            <div className="text-right space-y-0.5 shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                Comprovante de comissão
              </p>
              <p className="text-2xl font-black text-neutral-950 tabular-nums tracking-tight leading-none">
                Nº {numeroLabel}
              </p>
              <p className="text-[10px] text-neutral-500 pt-0.5">Emitido em {emitidoEm}</p>
            </div>
          </header>

          {/* Partes */}
          <section className="mt-6 grid grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-neutral-500">
                Beneficiário
              </p>
              <p className="text-[17px] font-bold text-neutral-950 leading-snug">
                {receipt.parceiro_nome}
              </p>
              <p className="text-xs text-neutral-600">{roleLabel}</p>
              {receipt.parceiro_registro && (
                <p className="text-xs text-neutral-600">{receipt.parceiro_registro}</p>
              )}
              {receipt.parceiro_escritorio && (
                <p className="text-xs text-neutral-600">{receipt.parceiro_escritorio}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-neutral-500">
                Orçamento / projeto
              </p>
              {orcamentoCodigo ? (
                <p className="text-[17px] font-bold text-neutral-950 tabular-nums leading-snug">
                  {orcamentoCodigo}
                </p>
              ) : (
                <p className="text-[17px] font-bold text-neutral-950 leading-snug">—</p>
              )}
              <p className="text-xs text-neutral-600">
                Cliente: <span className="font-semibold text-neutral-800">{receipt.cliente_nome}</span>
              </p>
            </div>
          </section>

          {/* Valores */}
          <section className="mt-6 border border-neutral-200 rounded-xl overflow-hidden">
            <div className="grid grid-cols-3 divide-x divide-neutral-200">
              <div className="px-4 py-3.5">
                <p className="text-[9px] font-black uppercase tracking-wider text-neutral-500">
                  Base aprovada
                </p>
                <p className="text-base font-bold tabular-nums text-neutral-950 mt-1">
                  {formatCurrencyBRL(receipt.base_valor)}
                </p>
              </div>
              <div className="px-4 py-3.5">
                <p className="text-[9px] font-black uppercase tracking-wider text-neutral-500">
                  Percentual
                </p>
                <p className="text-base font-bold tabular-nums text-neutral-950 mt-1">
                  {receipt.percentual}%
                </p>
              </div>
              <div className="px-4 py-3.5 bg-neutral-50">
                <p className="text-[9px] font-black uppercase tracking-wider text-neutral-500">
                  Valor pago
                </p>
                <p className="text-lg font-black tabular-nums text-neutral-950 mt-1">
                  {formatCurrencyBRL(receipt.valor_comissao)}
                </p>
              </div>
            </div>
            <p className="px-4 py-2.5 text-[11px] text-neutral-600 italic border-t border-neutral-100">
              ({currencyToExtenso(receipt.valor_comissao)})
            </p>
          </section>

          {/* NF + datas */}
          <section className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-neutral-200 px-3.5 py-3 col-span-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500">
                Nota fiscal
              </p>
              <p className="text-base font-black tabular-nums text-neutral-950 mt-1">
                {receipt.nota_fiscal_numero || "—"}
              </p>
              <p className="text-[10px] text-neutral-500 mt-0.5">
                {formatDateSafe(receipt.nota_fiscal_emitida_em)}
              </p>
            </div>
            <div className="rounded-lg border border-neutral-200 px-3.5 py-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500">
                Pag. previsto
              </p>
              <p className="text-sm font-semibold text-neutral-800 mt-1">
                {formatDateSafe(receipt.data_pagamento_prevista)}
              </p>
            </div>
            <div className="rounded-lg border border-neutral-200 px-3.5 py-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500">
                Pag. efetivo
              </p>
              <p className="text-sm font-semibold text-neutral-800 mt-1">
                {formatDateSafe(receipt.data_pagamento_efetiva)}
              </p>
            </div>
          </section>

          {receipt.observacoes && (
            <section className="mt-5">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-neutral-500 mb-1">
                Observações
              </p>
              <p className="text-[12px] text-neutral-700 whitespace-pre-wrap leading-relaxed">
                {receipt.observacoes}
              </p>
            </section>
          )}

          {/* Texto legal — CNPJ aqui */}
          <section className="mt-7 space-y-2.5 text-[11px] leading-relaxed text-neutral-600">
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
            <p className="pt-3 text-center text-[13px] font-bold uppercase tracking-wide text-neutral-900">
              Farroupilha — RS, {emitidoEm}
            </p>
          </section>

          {/* Assinatura — CNPJ abaixo */}
          <div className="mt-12 flex justify-center">
            <div className="text-center flex flex-col w-[240px]">
              <div className="h-[48px] flex items-end justify-center pb-1">
                <p
                  className="text-[32px] leading-none text-neutral-900"
                  style={{ fontFamily: '"CladenirSignature", cursive' }}
                >
                  Mareli Unghero
                </p>
              </div>
              <div className="border-t border-neutral-800 mx-2" />
              <div className="space-y-0.5 pt-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest">
                  Mareli Unghero
                </p>
                <p className="text-[9px] text-neutral-500 uppercase tracking-wide">
                  Financeiro
                </p>
                <p className="text-[9px] text-neutral-400">
                  {f.name} — CNPJ {f.cnpj}
                </p>
              </div>
            </div>
          </div>

          {/* Footer — CNPJ aqui */}
          <footer className="mt-auto pt-8 border-t border-neutral-200 text-[10px] text-neutral-600">
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
                  <span className="tabular-nums leading-none">{f.whatsapp}</span>
                </p>
                <p>{f.email}</p>
                <p>{f.site}</p>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
