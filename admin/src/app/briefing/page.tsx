import React from "react";
import BriefingForm from "./BriefingForm";
import Image from "next/image";

export const metadata = {
  title: "Qualificação de Projeto | Móveis Unghero",
  description: "Preencha o briefing de modulação 3D para o seu projeto sob medida.",
};

export default function BriefingPage() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Cabeçalho Público */}
      <header className="w-full bg-white border-b border-slate-200/80 py-4 px-6 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src="/logo.png" 
              alt="Móveis Unghero" 
              className="h-9 w-auto object-contain"
            />
          </div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200/50">
            Orçamento
          </span>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex items-center py-8">
        <div className="w-full">
          <BriefingForm />
        </div>
      </div>

      {/* Rodapé Público */}
      <footer className="w-full border-t border-slate-200/80 bg-white py-6 text-center text-xs font-bold text-slate-400">
        <p>© {new Date().getFullYear()} Móveis Unghero — Todos os direitos reservados.</p>
        <p className="text-[10px] font-semibold text-slate-350 mt-1">Farroupilha · RS · desde 2006</p>
      </footer>
    </main>
  );
}
