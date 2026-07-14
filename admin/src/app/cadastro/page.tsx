import React from "react";
import ClientSignupForm from "./ClientSignupForm";

export const metadata = {
  title: "Cadastro de Cliente | Móveis Unghero",
  description: "Cadastre-se para receber atendimento e orçamento de móveis planejados sob medida.",
};

export default function CadastroClientePage() {
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col justify-between relative w-full max-w-full overflow-x-hidden text-slate-100">
      {/* Imagem de Fundo Overlay Sutil */}
      <div 
        className="absolute inset-0 z-0 bg-[url('/factory-bg.png')] bg-cover bg-center opacity-15 pointer-events-none"
        style={{ filter: "brightness(0.20) contrast(1.15) grayscale(0.2)" }}
      />

      {/* Logo no Topo */}
      <div className="w-full flex justify-center pt-8 pb-4 md:pt-12 md:pb-6 z-10 shrink-0">
        <img
          src="/logo.png"
          alt="Móveis Unghero"
          className="h-10 w-auto object-contain"
        />
      </div>

      {/* Conteúdo Principal (Formulário Centralizado) */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-12 z-10 w-full max-w-2xl mx-auto">
        <ClientSignupForm />
        
        {/* Texto de LGPD abaixo do formulário */}
        <p className="mt-6 text-[10px] font-medium text-slate-500 leading-relaxed text-center max-w-md">
          De acordo com a Lei Geral de Proteção de Dados (LGPD), as informações enviadas neste formulário serão tratadas com total confidencialidade e utilizadas apenas para prestar o atendimento comercial e enviar o orçamento solicitado.
        </p>
      </div>

      {/* Rodapé Público */}
      <footer className="w-full border-t border-slate-900/60 bg-slate-950/80 backdrop-blur-sm py-6 text-center text-xs font-bold text-slate-500 z-10 shrink-0">
        <p>© {new Date().getFullYear()} Móveis Unghero — Todos os direitos reservados.</p>
        <p className="text-[10px] font-semibold text-slate-600 mt-1">Farroupilha · RS · desde 2006</p>
      </footer>
    </main>
  );
}
