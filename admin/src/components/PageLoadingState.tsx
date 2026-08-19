type PageLoadingStateProps = {
  title?: string;
  hint?: string;
};

/** Fallback visível nas rotas (loading.tsx) — evita tela vazia parecer bug. */
export default function PageLoadingState({
  title = "Carregando informações",
  hint = "Isso pode levar alguns segundos. Não é um erro — aguarde.",
}: PageLoadingStateProps) {
  return (
    <div
      className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 py-16 text-center"
      role="status"
      aria-live="polite"
      aria-label={title}
    >
      <div className="mu-inline-spinner" aria-hidden="true" />
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground leading-relaxed">{hint}</p>
    </div>
  );
}
