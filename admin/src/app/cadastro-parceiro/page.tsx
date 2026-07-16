import React from "react";
import PartnerSignupForm from "./PartnerSignupForm";
import FormLgpdNotice from "@/components/forms/FormLgpdNotice";

export const metadata = {
  title: "Cadastro de Parceiros | Móveis Unghero",
  description:
    "Arquitetos, designers e projetistas: cadastre-se para fazer parceria com a Móveis Unghero.",
};

export default function CadastroParceiroPage() {
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col justify-between relative w-full max-w-full overflow-x-hidden text-slate-100">
      <div
        className="absolute inset-0 z-0 bg-[url('/partner_signup_bg.png')] bg-cover bg-center opacity-15 pointer-events-none"
        style={{ filter: "brightness(0.20) contrast(1.15) grayscale(0.2)" }}
      />

      <div className="w-full flex justify-center pt-8 pb-4 md:pt-12 md:pb-6 z-10 shrink-0">
        <img src="/logo.png" alt="Móveis Unghero" className="h-10 w-auto object-contain" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-12 z-10 w-full max-w-2xl mx-auto">
        <div className="text-center mb-6 space-y-2">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-100">
            Seja Nosso Parceiro
          </h1>
          <p className="text-xs md:text-sm text-slate-400 max-w-lg mx-auto">
            Arquitetos, designers e projetistas: cadastre-se para indicar clientes e co-projetar com a
            Móveis Unghero.
          </p>
        </div>
        <PartnerSignupForm />
        <FormLgpdNotice purpose="avaliar a parceria profissional e manter contato comercial" />
      </div>

      <footer className="w-full border-t border-slate-900/60 bg-slate-950/80 backdrop-blur-sm py-6 text-center text-xs font-bold text-slate-500 z-10 shrink-0">
        <p>© {new Date().getFullYear()} Móveis Unghero — Todos os direitos reservados.</p>
        <p className="text-[10px] font-semibold text-slate-600 mt-1">Farroupilha · RS · desde 2006</p>
      </footer>
    </main>
  );
}
