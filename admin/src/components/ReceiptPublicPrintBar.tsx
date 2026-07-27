"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Barra pública do recibo — só impressão. */
export default function ReceiptPublicPrintBar() {
  return (
    <div className="print:hidden sticky top-0 z-50 bg-neutral-900 text-white shadow-md">
      <div className="flex items-center justify-between gap-3 p-3 max-w-[210mm] mx-auto w-full">
        <p className="text-sm text-neutral-300 font-medium">Recibo Móveis Unghero</p>
        <Button
          type="button"
          onClick={() => window.print()}
          className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold shrink-0"
        >
          <Printer className="h-4 w-4" /> Imprimir / Salvar PDF
        </Button>
      </div>
      <p className="px-3 pb-2.5 text-[11px] text-neutral-400 leading-snug max-w-[210mm] mx-auto">
        Na impressão: papel <span className="text-neutral-200">A4</span>, margens{" "}
        <span className="text-neutral-200">Nenhuma</span>, escala{" "}
        <span className="text-neutral-200">100%</span> e desmarque{" "}
        <span className="text-neutral-200">Cabeçalhos e rodapés</span>.
      </p>
    </div>
  );
}
