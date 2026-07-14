"use client";

import { CheckCircle2, Circle, ShieldCheck, Megaphone } from "lucide-react";
import type { ClientConsent } from "@/lib/clientConsent";

interface ClientConsentCardProps {
  consent: ClientConsent;
  className?: string;
}

export default function ClientConsentCard({ consent, className = "" }: ClientConsentCardProps) {
  if (!consent.lgpdAceite && !consent.marketingAceite) return null;

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
              Aceite LGPD
            </p>
            <p className="text-[10px] text-emerald-700/80 font-medium mt-0.5 leading-relaxed">
              {consent.lgpdAceite
                ? `Autorizou o tratamento de dados pessoais${
                    consent.lgpdAceiteEm ? ` em ${consent.lgpdAceiteEm}` : ""
                  }`
                : "Não registrado"}
            </p>
          </div>
        </li>

        <li className="flex items-start gap-2.5">
          {consent.marketingAceite ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <Circle className="h-4 w-4 text-slate-300 shrink-0 mt-0.5" />
          )}
          <div className="min-w-0 flex items-start gap-1.5">
            <div className="min-w-0">
              <p
                className={`text-xs font-bold leading-snug flex items-center gap-1 ${
                  consent.marketingAceite ? "text-emerald-800" : "text-slate-500"
                }`}
              >
                <Megaphone className="h-3 w-3 shrink-0 opacity-70" />
                Marketing
              </p>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-relaxed">
                {consent.marketingAceite
                  ? "Aceitou receber comunicações e novidades"
                  : "Não aceitou comunicações de marketing"}
              </p>
            </div>
          </div>
        </li>
      </ul>
    </div>
  );
}
