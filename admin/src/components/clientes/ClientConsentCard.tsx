"use client";

import { useState } from "react";
import { CheckCircle2, Circle, ShieldCheck, Megaphone } from "lucide-react";
import type { ClientConsent } from "@/lib/clientConsent";
import { CLIENT_CONSENT_LGPD_SUMMARY } from "@/lib/consentCopy";

interface ClientConsentCardProps {
  consent: ClientConsent;
  className?: string;
  /** Cabeçalho colapsável — cabe na ficha sem competir com o nome. */
  collapsible?: boolean;
}

function ConsentDetailsList({ consent }: { consent: ClientConsent }) {
  return (
    <ul className="space-y-2">
      <li className="flex items-start gap-2.5">
        {consent.lgpdAceite ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
        ) : (
          <Circle className="h-4 w-4 text-slate-300 shrink-0 mt-0.5" />
        )}
        <div className="min-w-0">
          <p
            className={`text-xs font-bold leading-snug ${
              consent.lgpdAceite ? "text-emerald-800" : "text-slate-500"
            }`}
          >
            LGPD (atendimento): {consent.lgpdAceite ? "Aceito" : "Não registrado"}
          </p>
          <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-relaxed">
            {consent.lgpdAceite
              ? `${CLIENT_CONSENT_LGPD_SUMMARY}${
                  consent.lgpdAceiteEm ? ` · ${consent.lgpdAceiteEm}` : ""
                }`
              : "Sem aceite estruturado neste cadastro."}
          </p>
        </div>
      </li>

      <li className="flex items-start gap-2.5">
        {consent.marketingAceite ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
        ) : (
          <Circle className="h-4 w-4 text-slate-300 shrink-0 mt-0.5" />
        )}
        <div className="min-w-0">
          <p
            className={`text-xs font-bold leading-snug flex items-center gap-1 ${
              consent.marketingAceite ? "text-emerald-800" : "text-slate-500"
            }`}
          >
            <Megaphone className="h-3 w-3 shrink-0 opacity-70" />
            Marketing: {consent.marketingAceite ? "Aceito (legado)" : "Não"}
          </p>
          <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-relaxed">
            {consent.marketingAceite
              ? "Cadastro antigo com opt-in de novidades."
              : "Clientes novos não passam por este consentimento."}
          </p>
        </div>
      </li>
    </ul>
  );
}

/** Chip compacto para o header da ficha — detalhe no hover / toque. */
export function ClientConsentChip({
  consent,
  className = "",
}: {
  consent: ClientConsent;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ok = consent.lgpdAceite;

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-[var(--radius-sm)] border text-[11px] font-bold cursor-pointer transition-colors ${
          ok
            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
            : "bg-slate-50 text-slate-600 border-slate-200"
        }`}
        aria-expanded={open}
        aria-label="Ver consentimentos"
      >
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
        Consentimentos
        <span className="opacity-70 font-semibold">{ok ? "· LGPD" : "· —"}</span>
      </button>

      {open ? (
        <div
          role="tooltip"
          className="absolute right-0 top-[calc(100%+0.35rem)] z-30 w-72 max-w-[min(18rem,calc(100vw-2rem))] rounded-[var(--radius-md)] border border-border bg-white p-3 shadow-lg"
        >
          <ConsentDetailsList consent={consent} />
        </div>
      ) : null}
    </div>
  );
}

export default function ClientConsentCard({
  consent,
  className = "",
  collapsible = false,
}: ClientConsentCardProps) {
  if (!consent.lgpdAceite && !consent.marketingAceite) return null;

  const body = <ConsentDetailsList consent={consent} />;

  if (collapsible) {
    return (
      <details
        className={`rounded-[var(--radius-md)] border border-emerald-200/70 bg-emerald-50/40 group ${className}`}
      >
        <summary className="flex items-center gap-2 cursor-pointer list-none px-3.5 py-2.5 select-none [&::-webkit-details-marker]:hidden">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wide flex-1">
            Consentimentos
          </span>
          <span className="text-[10px] font-semibold text-emerald-700/80">
            {consent.lgpdAceite ? "LGPD ok" : "Ver"}
          </span>
        </summary>
        <div className="px-3.5 pb-3.5 pt-0.5 border-t border-emerald-200/50">{body}</div>
      </details>
    );
  }

  return (
    <div
      className={`rounded-[var(--radius-md)] border border-emerald-200/80 bg-emerald-50/50 p-3.5 space-y-2.5 ${className}`}
    >
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
        <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
          Consentimentos
        </span>
      </div>
      {body}
    </div>
  );
}
