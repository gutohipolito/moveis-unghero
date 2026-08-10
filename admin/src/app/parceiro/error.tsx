"use client";

import { useEffect } from "react";

export default function ParceiroError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro no portal do parceiro:", error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-medium text-white/70">
        Não foi possível carregar esta página.
      </p>
      <button
        type="button"
        onClick={reset}
        className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90"
      >
        Tentar de novo
      </button>
    </div>
  );
}
