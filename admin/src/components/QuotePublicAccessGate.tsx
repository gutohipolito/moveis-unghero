"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, ShieldCheck } from "lucide-react";

const BG_SRC = "/img-fundo-senha-moveis-unghero.jpg";
const LOGO_SRC = "/logo.png";

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
  const year = new Date().getFullYear();

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
    <div className="relative min-h-svh flex flex-col overflow-hidden text-white">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${BG_SRC})` }}
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/60 to-black/80"
        aria-hidden
      />

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 py-10 sm:py-14">
        <div className="w-full max-w-[420px] flex flex-col items-center">
          <img
            src={LOGO_SRC}
            alt="Móveis Unghero"
            className="h-11 sm:h-12 w-auto object-contain brightness-0 invert drop-shadow-md mb-8"
          />

          <div className="w-full rounded-2xl bg-white text-neutral-950 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.55)] border border-white/20 overflow-hidden">
            <div className="px-7 pt-7 pb-6 sm:px-8 sm:pt-8 space-y-5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-10 w-10 shrink-0 rounded-full bg-neutral-900 text-amber-400 flex items-center justify-center">
                  <Lock className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-neutral-400">
                    Acesso protegido
                  </p>
                  <h1 className="text-xl font-bold text-neutral-950 leading-snug mt-0.5">
                    Abrir orçamento
                  </h1>
                </div>
              </div>

              <p className="text-sm text-neutral-600 leading-relaxed">
                {clientFirstName ? (
                  <>
                    Olá, <span className="font-semibold text-neutral-900">{clientFirstName}</span>.{" "}
                  </>
                ) : null}
                Digite a senha: os{" "}
                <span className="font-semibold text-neutral-900">
                  4 últimos dígitos do seu celular
                </span>{" "}
                cadastrado conosco.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                    Senha (4 dígitos)
                  </span>
                  <input
                    type="password"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className="w-full rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-3.5 text-center text-2xl font-mono tracking-[0.45em] text-neutral-900 placeholder:tracking-[0.45em] placeholder:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-amber-500/55 focus:border-amber-500 focus:bg-white transition-colors"
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
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-55 disabled:pointer-events-none text-white font-semibold py-3.5 transition-colors shadow-sm"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {busy ? "Validando..." : "Abrir orçamento"}
                </button>
              </form>
            </div>
          </div>

          <div className="mt-6 w-full rounded-xl border border-white/15 bg-black/35 backdrop-blur-sm px-4 py-3.5 flex gap-3 text-left">
            <ShieldCheck
              className="h-5 w-5 shrink-0 text-amber-400 mt-0.5"
              aria-hidden
            />
            <p className="text-[12px] leading-relaxed text-white/80">
              <span className="font-semibold text-white/95">Por que pedimos senha?</span>{" "}
              Para proteger seus dados pessoais e comerciais, em conformidade com a{" "}
              <span className="text-white/95">Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</span>.
              Assim, somente você — ou quem conhece o celular cadastrado — acessa este orçamento.
            </p>
          </div>
        </div>
      </main>

      <footer className="relative z-10 pb-6 px-5 text-center">
        <p className="text-[11px] text-white/55 tracking-wide">
          © {year} Móveis Unghero LTDA. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}
