"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

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
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,.95), rgba(0,0,0,.7), rgba(0,0,0,1))",
        }}
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
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-neutral-400">
                  Acesso protegido
                </p>
                <h1 className="text-xl font-bold text-neutral-950 leading-snug mt-0.5">
                  Abrir orçamento
                </h1>
                {clientFirstName ? (
                  <p className="text-sm text-neutral-600 mt-2">
                    Olá, <span className="font-semibold text-neutral-900">{clientFirstName}</span>.
                  </p>
                ) : null}
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
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

                <p className="text-xs text-neutral-500 leading-relaxed text-center px-1">
                  A senha é os últimos 4 dígitos do teu celular cadastrado
                </p>

                {error ? (
                  <p className="text-sm text-rose-600 font-medium text-center" role="alert">
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={busy || pin.replace(/\D/g, "").length !== 4}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-55 disabled:pointer-events-none text-white font-semibold py-3.5 transition-colors shadow-sm"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {busy ? "Validando..." : "Acessar Orçamento"}
                </button>
              </form>
            </div>
          </div>

          <p className="mt-6 max-w-[360px] text-center text-[10px] leading-relaxed text-white/45">
            Proteção de dados pessoais e comerciais conforme a LGPD (Lei nº 13.709/2018). Somente
            você acessa este orçamento.
          </p>
        </div>
      </main>

      <footer className="relative z-10 pb-6 px-5 text-center">
        <p className="text-[11px] text-white/45 tracking-wide">
          © {year} Móveis Unghero LTDA. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}
