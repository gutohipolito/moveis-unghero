/** Fallback visível nas rotas (loading.tsx). */
export default function PageLoadingState() {
  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-6 py-16 text-center"
      role="status"
      aria-live="polite"
      aria-label="Carregando"
    >
      <div className="mu-inline-spinner" aria-hidden="true" />
      <p className="text-base font-semibold text-foreground">Carregando...</p>
    </div>
  );
}
