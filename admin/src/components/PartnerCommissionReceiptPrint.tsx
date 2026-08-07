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
  const orcamento =
    receipt.orcamento_codigo ||
    (receipt.orcamento_versao != null ? `v${receipt.orcamento_versao}` : "—");
  const emitidoEm = formatContractDateLong(new Date(receipt.createdAt));

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: commissionReceiptPrintStylesCss() }} />
      {topBar}
      <div className="commission-sheet">
        <div className="commission-inner">
          <header className="flex items-start justify-between gap-6 border-b border-neutral-200 pb-5">
            <div className="flex items-center gap-3.5 min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoSrc}
                alt="Móveis Unghero"
                className="h-14 w-auto object-contain shrink-0"
              />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500">
                  {f.name}
                </p>
                <h1 className="text-[22px] font-black tracking-tight text-neutral-950 mt-0.5 leading-tight">
                  Comprovante de comissão
                </h1>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  CNPJ {f.cnpj}
                </p>
              </div>
            </div>
            <div className="text-right space-y-1 shrink-0">
              <p className="text-sm font-black text-neutral-900 tabular-nums">
                Nº {numeroLabel}
              </p>
              <p className="text-[10px] text-neutral-500">Emitido em {emitidoEm}</p>
            </div>
          </header>

          <section className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50/80 px-4 py-3.5 space-y-1.5">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-neutral-500">
                Beneficiário
              </p>
              <p className="text-base font-bold text-neutral-950">{receipt.parceiro_nome}</p>
              <p className="text-xs text-neutral-600 font-medium">{roleLabel}</p>
              {receipt.parceiro_registro && (
                <p className="text-xs text-neutral-600">{receipt.parceiro_registro}</p>
              )}
              {receipt.parceiro_escritorio && (
                <p className="text-xs text-neutral-600">{receipt.parceiro_escritorio}</p>
              )}
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50/80 px-4 py-3.5 space-y-1.5">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-neutral-500">
                Projeto de referência
              </p>
              <p className="text-base font-bold text-neutral-950">{receipt.cliente_nome}</p>
              {receipt.projeto_ref && (
                <p className="text-xs text-neutral-600">{receipt.projeto_ref}</p>
              )}
              <p className="text-xs text-neutral-600">Orçamento {orcamento}</p>
            </div>
          </section>

          <section className="mt-5 rounded-xl border border-neutral-200 overflow-hidden">
            <div className="bg-neutral-950 text-white px-4 py-2.5">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-neutral-300">
                Valores da comissão
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 px-4 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Base aprovada
                </p>
                <p className="text-lg font-bold tabular-nums text-neutral-950 mt-1">
                  {formatCurrencyBRL(receipt.base_valor)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Percentual
                </p>
                <p className="text-lg font-bold tabular-nums text-neutral-950 mt-1">
                  {receipt.percentual}%
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Valor pago
                </p>
                <p className="text-xl font-black tabular-nums text-neutral-950 mt-1">
                  {formatCurrencyBRL(receipt.valor_comissao)}
                </p>
              </div>
            </div>
            <p className="px-4 pb-4 text-[11px] text-neutral-600 italic leading-relaxed border-t border-neutral-100 pt-3">
              ({currencyToExtenso(receipt.valor_comissao)})
            </p>
          </section>

          <section className="mt-5 grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 text-white px-4 py-3.5 space-y-1">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-neutral-400">
                Nota fiscal
              </p>
              <p className="text-lg font-black tabular-nums tracking-tight">
                {receipt.nota_fiscal_numero || "—"}
              </p>
              <p className="text-[11px] text-neutral-300">
                Emitida em {formatDateSafe(receipt.nota_fiscal_emitida_em)}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <div className="rounded-lg border border-neutral-200 px-3 py-2.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500">
                  Pagamento previsto
                </p>
                <p className="text-sm font-semibold text-neutral-800 mt-0.5">
                  {formatDateSafe(receipt.data_pagamento_prevista)}
                </p>
              </div>
              <div className="rounded-lg border border-neutral-200 px-3 py-2.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500">
                  Pagamento efetivo
                </p>
                <p className="text-sm font-semibold text-neutral-800 mt-0.5">
                  {formatDateSafe(receipt.data_pagamento_efetiva)}
                </p>
              </div>
            </div>
          </section>

          {receipt.observacoes && (
            <section className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50/70 px-4 py-3">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-neutral-500 mb-1">
                Observações
              </p>
              <p className="text-[12px] text-neutral-700 whitespace-pre-wrap leading-relaxed">
                {receipt.observacoes}
              </p>
            </section>
          )}

          <section className="mt-6 space-y-3 text-[11px] leading-relaxed text-neutral-600">
            <p>
              <strong>{f.name}</strong>, inscrita no CNPJ sob o nº <strong>{f.cnpj}</strong>, com
              sede na {f.street}, {f.neighborhood}, {f.city}, declara ter efetuado o pagamento da
              comissão acima descrita ao beneficiário identificado neste documento, no valor de{" "}
              <strong>{formatCurrencyBRL(receipt.valor_comissao)}</strong>
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
            <p className="pt-2 text-center text-[13px] font-bold uppercase tracking-wide text-neutral-900">
              Farroupilha — RS, {emitidoEm}
            </p>
          </section>

          <div className="mt-10 flex justify-center">
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
