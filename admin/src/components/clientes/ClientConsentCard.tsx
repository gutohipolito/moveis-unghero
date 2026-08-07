"use client";

import { CheckCircle2, Circle, ShieldCheck, Megaphone } from "lucide-react";
import type { ClientConsent } from "@/lib/clientConsent";
import { CLIENT_CONSENT_LGPD_SUMMARY } from "@/lib/consentCopy";

interface ClientConsentCardProps {
  consent: ClientConsent;
  className?: string;
  /** Cabeçalho colapsável — cabe na ficha sem competir com o nome. */
  collapsible?: boolean;
}

export default function ClientConsentCard({
  consent,
  className = "",
  collapsible = false,
}: ClientConsentCardProps) {
  if (!consent.lgpdAceite && !consent.marketingAceite) return null;

  const body = (
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
              consent.lgpdAceite ? "text-emerald-800" : "text-slate-400"
            }`}
          >
            Aceite LGPD (atendimento)
          </p>
          <p className="text-[10px] text-emerald-700/80 font-medium mt-0.5 leading-relaxed">
            {consent.lgpdAceite
              ? `${CLIENT_CONSENT_LGPD_SUMMARY}${
                  consent.lgpdAceiteEm ? ` · ${consent.lgpdAceiteEm}` : ""
                }`
              : "Não registrado"}
          </p>
        </div>
      </li>

      {consent.marketingAceite ? (
        <li className="flex items-start gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-xs font-bold leading-snug flex items-center gap-1 text-emerald-800">
              <Megaphone className="h-3 w-3 shrink-0 opacity-70" />
              Marketing (legado)
            </p>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-relaxed">
              Cadastro antigo com opt-in de novidades — clientes novos não passam por este
              consentimento.
            </p>
          </div>
        </li>
      ) : null}
    </ul>
  );

  if (collapsible) {
    return (
      <details
        className={`rounded-xl border border-emerald-200/70 bg-emerald-50/40 group ${className}`}
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
      className={`rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3.5 space-y-2.5 ${className}`}
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
