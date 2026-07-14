import React from "react";
import ClientSignupForm from "./ClientSignupForm";

export const metadata = {
  title: "Cadastro de Cliente | Móveis Unghero",
  description: "Cadastre-se para receber atendimento e orçamento de móveis planejados sob medida.",
};

export default function CadastroClientePage() {
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col justify-between relative overflow-hidden text-slate-100">
      {/* Imagem de Fundo Overlay Sutil */}
      <div 
        className="absolute inset-0 z-0 bg-[url('/factory-bg.png')] bg-cover bg-center opacity-15 pointer-events-none"
        style={{ filter: "brightness(0.20) contrast(1.15) grayscale(0.2)" }}
      />

      {/* Conteúdo Principal (Centralizado na Tela) */}
      <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 z-10 w-full">
        <div className="w-full max-w-2xl flex flex-col items-center">
          {/* Logo do Dashboard Centralizado */}
          <div className="mb-6 flex flex-col items-center">
            <img
              src="/logo.png"
              alt="Móveis Unghero"
              className="h-10 w-auto object-contain"
            />
          </div>

          <ClientSignupForm />
        </div>
      </div>

      {/* Rodapé Público */}
      <footer className="w-full border-t border-slate-900/60 bg-slate-950/80 backdrop-blur-sm py-6 text-center text-xs font-bold text-slate-500 z-10">
        <p className="max-w-md mx-auto mb-3 px-4 text-[10px] font-medium text-slate-600 leading-relaxed">
          De acordo com a Lei Geral de Proteção de Dados (LGPD), as informações enviadas neste formulário serão tratadas com total confidencialidade e utilizadas apenas para prestar o atendimento comercial e enviar o orçamento solicitado.
        </p>
        <p>© {new Date().getFullYear()} Móveis Unghero — Todos os direitos reservados.</p>
        <p className="text-[10px] font-semibold text-slate-600 mt-1">Farroupilha · RS · desde 2006</p>
      </footer>
    </main>
  );
}
