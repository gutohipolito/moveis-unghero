"use client";

import React from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrintButton() {
  return (
    <Button
      onClick={() => window.print()}
      className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-all cursor-pointer"
    >
      <Printer className="h-4 w-4" /> Imprimir Proposta / Salvar PDF
    </Button>
  );
}
