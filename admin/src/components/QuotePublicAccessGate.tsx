"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";

type QuotePublicAccessGateProps = {
  code: string;
  clientFirstName: string;
};

export default function QuotePublicAccessGate({
  code,
  clientFirstName,
}: QuotePublicAccessGateProps) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const digits = pin.replace(/\D/g, "");
    if (digits.length !== 4) {
      setError("Informe os 4 últimos dígitos do seu celular.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`/api/o/${encodeURIComponent(code)}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: digits }),
      });
      const data = (await response.json()) as { success?: boolean; error?: string };

      if (!response.ok || !data.success) {
        setError(data.error || "Senha incorreta.");
        return;
      }

      router.refresh();
    } catch {
      setError("Não foi possível validar a senha. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border border-neutral-200 shadow-lg rounded-2xl p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-neutral-900 text-amber-400 flex items-center justify-center">
            <Lock className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-neutral-400">
              Orçamento protegido
            </p>
            <h1 className="text-xl font-bold text-neutral-950 leading-tight">Móveis Unghero</h1>
          </div>
        </div>

        <p className="text-sm text-neutral-600 leading-relaxed">
          {clientFirstName ? `Olá, ${clientFirstName}. ` : null}
          Para abrir o orçamento, digite a senha: os{" "}
          <span className="font-semibold text-neutral-900">4 últimos dígitos do seu celular</span>{" "}
          cadastrado conosco.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Senha (4 dígitos)
            </span>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-center text-2xl font-mono tracking-[0.4em] text-neutral-900 focus:outline-none focus:ring-2 focus:ring-amber-500/60 focus:border-amber-500"
              placeholder="••••"
              disabled={busy}
              autoFocus
            />
          </label>

          {error ? (
            <p className="text-sm text-rose-600 font-medium" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy || pin.replace(/\D/g, "").length !== 4}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold py-3 transition-colors"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {busy ? "Validando..." : "Abrir orçamento"}
          </button>
        </form>
      </div>
    </div>
  );
}
