/**
 * Botão de impressão que funciona sem o JS do Next:
 * - no admin (SSR + hidratação)
 * - no proxy HostGator (/o, /r, /c), onde todos os <script> do Next são removidos
 *
 * O HTML nativo com `onclick` e `data-unghero-print` é gerado via
 * dangerouslySetInnerHTML para o atributo sobreviver ao SSR (React não
 * serializa onClick como atributo HTML).
 */
export default function PublicPrintButton({
  label = "Salvar PDF",
  className,
}: {
  label?: string;
  className?: string;
}) {
  const classes =
    className ||
    "inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shrink-0 border-0 cursor-pointer";

  const safeLabel = label
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  const safeClass = classes.replace(/"/g, "&quot;");

  return (
    <span
      className="inline-flex"
      dangerouslySetInnerHTML={{
        __html: `<button type="button" data-unghero-print="1" class="${safeClass}" onclick="window.print()">${safeLabel}</button>`,
      }}
    />
  );
}
