import type { ReactNode } from "react";
import { formatContractDateLong } from "@/lib/contractTemplates";
import { currencyToExtenso, formatCurrencyBRL } from "@/lib/currencyExtenso";
import { getPartnerRoleLabel } from "@/lib/partnerTypes";
import type { PartnerCommissionReceiptDTO } from "@/app/actions/partnerCommissions";

export function commissionReceiptPrintStylesCss() {
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
      color: #1a120c;
      font-family: "Segoe UI", system-ui, sans-serif;
      box-shadow: 0 8px 40px rgba(24, 16, 8, 0.12);
    }
    .commission-inner {
      padding: 18mm 18mm 16mm;
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
}: {
  receipt: PartnerCommissionReceiptDTO;
  topBar?: ReactNode;
}) {
  const roleLabel = getPartnerRoleLabel(receipt.parceiro_tipo, receipt.parceiro_nome);
  const numeroLabel = String(receipt.numero).padStart(4, "0");

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: commissionReceiptPrintStylesCss() }} />
      {topBar}
      <div className="commission-sheet">
        <div className="commission-inner">
          <header className="flex items-start justify-between gap-6 border-b border-stone-200 pb-5">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Móveis Unghero" className="h-12 w-auto object-contain" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">
                  Móveis Unghero
                </p>
                <h1 className="text-xl font-bold tracking-tight text-stone-900 mt-0.5">
                  Comprovante de comissão
                </h1>
              </div>
            </div>
            <div className="text-right space-y-1">
              <span className="inline-flex items-center rounded-md border border-stone-300 bg-stone-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-stone-700">
                Uso interno
              </span>
              <p className="text-xs font-semibold text-stone-600 tabular-nums">
                Nº {numeroLabel}
              </p>
              <p className="text-[10px] text-stone-500">
                Emitido em {formatContractDateLong(new Date(receipt.createdAt))}
              </p>
            </div>
          </header>

          <section className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-4 space-y-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-stone-500">
                Parceiro / Beneficiário
              </p>
              <p className="text-base font-bold text-stone-900">{receipt.parceiro_nome}</p>
              <p className="text-xs text-stone-600 font-medium">{roleLabel}</p>
              {receipt.parceiro_registro && (
                <p className="text-xs text-stone-600">{receipt.parceiro_registro}</p>
              )}
              {receipt.parceiro_escritorio && (
                <p className="text-xs text-stone-600">{receipt.parceiro_escritorio}</p>
              )}
            </div>
            <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-4 space-y-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-stone-500">
                Projeto (referência)
              </p>
              <p className="text-base font-bold text-stone-900">{receipt.cliente_nome}</p>
              {receipt.projeto_ref && (
                <p className="text-xs text-stone-600">{receipt.projeto_ref}</p>
              )}
              <p className="text-xs text-stone-600">
                Orçamento{" "}
                {receipt.orcamento_codigo ||
                  (receipt.orcamento_versao != null ? `v${receipt.orcamento_versao}` : "—")}
              </p>
            </div>
          </section>

          <section className="mt-5 rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-stone-50 p-5 space-y-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-amber-900/70">
              Cálculo da comissão
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Base aprovada
                </p>
                <p className="text-lg font-bold tabular-nums text-stone-900 mt-1">
                  {formatCurrencyBRL(receipt.base_valor)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Percentual
                </p>
                <p className="text-lg font-bold tabular-nums text-stone-900 mt-1">
                  {receipt.percentual}%
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Valor da comissão
                </p>
                <p className="text-xl font-bold tabular-nums text-amber-900 mt-1">
                  {formatCurrencyBRL(receipt.valor_comissao)}
                </p>
              </div>
            </div>
            <p className="text-[11px] text-stone-600 italic leading-relaxed">
              ({currencyToExtenso(receipt.valor_comissao)})
            </p>
          </section>

          <section className="mt-5 grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-lg border border-stone-200 p-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-stone-500">
                Pagamento previsto
              </p>
              <p className="font-semibold text-stone-800 mt-1">
                {formatDateSafe(receipt.data_pagamento_prevista)}
              </p>
            </div>
            <div className="rounded-lg border border-stone-200 p-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-stone-500">
                Pagamento efetivo
              </p>
              <p className="font-semibold text-stone-800 mt-1">
                {formatDateSafe(receipt.data_pagamento_efetiva)}
              </p>
            </div>
          </section>

          {receipt.observacoes && (
            <section className="mt-5">
              <p className="text-[9px] font-black uppercase tracking-widest text-stone-500 mb-1">
                Observações
              </p>
              <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">
                {receipt.observacoes}
              </p>
            </section>
          )}

          <footer className="mt-auto pt-10 border-t border-stone-200 flex items-end justify-between gap-6">
            <div className="text-[10px] text-stone-500 max-w-xs leading-relaxed">
              Documento interno da Móveis Unghero. Não substitui nota fiscal nem recibo de
              pagamento do cliente. Não compartilhe com o cliente final.
            </div>
            <div className="text-right text-xs text-stone-600">
              <p className="font-semibold text-stone-800">
                Emitido por {receipt.emitido_por_nome || "—"}
              </p>
              <div className="mt-8 w-48 border-t border-stone-400 pt-1 text-[10px] text-stone-500">
                Assinatura / visto
              </div>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
