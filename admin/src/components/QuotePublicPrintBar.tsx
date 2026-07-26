"use client";

/** Barra pública — usa href para funcionar também no proxy sem JS do Next. */
export default function QuotePublicPrintBar() {
  return (
    <div className="print:hidden sticky top-0 z-50 bg-neutral-900 text-white shadow-md">
      <div className="flex items-center justify-between gap-3 p-3">
        <p className="text-sm text-neutral-300 font-medium">Orçamento Móveis Unghero</p>
        <a
          href="javascript:window.print()"
          className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors no-underline shrink-0"
        >
          Salvar PDF
        </a>
      </div>
      <p className="px-3 pb-2.5 text-[11px] text-neutral-400 leading-snug">
        Na impressão: papel <span className="text-neutral-200">A4</span>, margens{" "}
        <span className="text-neutral-200">Nenhuma</span>, escala{" "}
        <span className="text-neutral-200">100%</span> e desmarque{" "}
        <span className="text-neutral-200">Cabeçalhos e rodapés</span> (evita link e nº de
        páginas fora do orçamento).
      </p>
    </div>
  );
}
