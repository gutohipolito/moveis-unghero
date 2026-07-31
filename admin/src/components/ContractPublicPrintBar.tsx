import PublicPrintButton from "@/components/PublicPrintButton";

/** Barra pública (cliente) — só impressão, sem voltar ao painel. */
export default function ContractPublicPrintBar() {
  return (
    <div className="print:hidden flex justify-end max-w-[210mm] mx-auto px-1">
      <PublicPrintButton label="Imprimir / Salvar PDF" />
    </div>
  );
}
