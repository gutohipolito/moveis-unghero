"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

export default function ParceiroCommissionPrintToolbar({
  numeroLabel,
}: {
  numeroLabel: string;
}) {
  return (
    <div className="no-print sticky top-0 z-20 border-b border-stone-300/80 bg-stone-100/95 backdrop-blur-sm">
      <div className="max-w-[210mm] mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/parceiro/comissoes"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar às comissões
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-stone-500">
            Comprovante nº {numeroLabel}
          </span>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            Imprimir / PDF
          </button>
        </div>
      </div>
    </div>
  );
}
