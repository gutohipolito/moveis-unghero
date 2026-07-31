import PublicPrintButton from "@/components/PublicPrintButton";

/** Barra pública do recibo — funciona no proxy HostGator sem JS do Next. */
export default function ReceiptPublicPrintBar() {
  return (
    <div className="print:hidden sticky top-0 z-50 bg-neutral-900 text-white shadow-md">
      <div className="flex items-center justify-between gap-3 p-3 max-w-[210mm] mx-auto w-full">
        <p className="text-sm text-neutral-300 font-medium">Recibo Móveis Unghero</p>
        <PublicPrintButton label="Imprimir / Salvar PDF" />
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
