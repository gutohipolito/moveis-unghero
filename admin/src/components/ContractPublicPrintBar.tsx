"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Barra pública (cliente) — só impressão, sem voltar ao painel. */
export default function ContractPublicPrintBar() {
  return (
    <div className="flex justify-end max-w-[210mm] mx-auto px-1">
      <Button
        type="button"
        onClick={() => window.print()}
        className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold"
      >
        <Printer className="h-4 w-4" /> Imprimir / Salvar PDF
      </Button>
    </div>
  );
}
