"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PartnerCommissionReceiptToolbar({
  backHref,
  numeroLabel,
}: {
  backHref: string;
  numeroLabel: string;
}) {
  return (
    <div className="no-print sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold text-muted-foreground hover:bg-muted/60 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
        <div className="min-w-0">
          <p className="text-sm font-bold truncate">Comprovante de comissão Nº {numeroLabel}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Uso interno · sem link público
          </p>
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        className="cursor-pointer gap-1.5"
        onClick={() => window.print()}
      >
        <Printer className="h-4 w-4" />
        Imprimir / PDF
      </Button>
    </div>
  );
}
