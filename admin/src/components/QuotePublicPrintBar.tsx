"use client";

/** Barra pública — usa href para funcionar também no proxy sem JS do Next. */
export default function QuotePublicPrintBar() {
  return (
    <div className="print:hidden sticky top-0 bg-neutral-900 text-white p-3 flex items-center justify-between shadow-md z-50">
      <p className="text-sm text-neutral-300 font-medium">Orçamento Móveis Unghero</p>
      <a
        href="javascript:window.print()"
        className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors no-underline"
      >
        Salvar PDF
      </a>
    </div>
  );
}
