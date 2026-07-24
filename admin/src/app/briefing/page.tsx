import React from "react";
import BriefingForm from "./BriefingForm";
import FormLgpdNotice from "@/components/forms/FormLgpdNotice";
import { PUBLIC_PAGE_COPY, publicPageMetadata } from "@/lib/publicPageMetadata";

export const metadata = publicPageMetadata({
  title: PUBLIC_PAGE_COPY.briefing.title,
  description: PUBLIC_PAGE_COPY.briefing.description,
  noIndex: false,
});

export default function BriefingPage() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <header className="w-full bg-slate-950 border-b border-slate-900 py-4 px-6 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Móveis Unghero" className="h-9 w-auto object-contain" />
          </div>
          <span className="text-[10px] font-black text-white uppercase tracking-widest bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700/60 shadow-inner">
            Orçamento
          </span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center py-8 px-4">
        <div className="w-full max-w-2xl mx-auto">
          <div className="text-center mb-6 space-y-2">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
              Conte-nos sobre o seu projeto
            </h1>
            <p className="text-xs md:text-sm text-slate-500 max-w-lg mx-auto">
              Responda algumas perguntas rápidas sobre seu imóvel e preferências para
              prepararmos um orçamento de móveis planejados sob medida.
            </p>
          </div>
          <BriefingForm />
          <FormLgpdNotice className="text-slate-400" />
        </div>
      </div>

      <footer className="w-full border-t border-slate-900 bg-slate-950 py-6 text-center text-xs font-bold text-slate-500">
        <p>© {new Date().getFullYear()} Móveis Unghero — Todos os direitos reservados.</p>
        <p className="text-[10px] font-semibold text-slate-600 mt-1">Farroupilha · RS · desde 2006</p>
      </footer>
    </main>
  );
}
