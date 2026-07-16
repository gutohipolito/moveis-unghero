"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ContractPrintToolbar() {
  return (
    <div className="flex items-center justify-between gap-3 max-w-[210mm] mx-auto px-1">
      <Link
        href="/contratos"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-600 hover:text-neutral-900"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar aos contratos
      </Link>
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
