import PartnerSignupForm from "./PartnerSignupForm";

export const metadata = {
  title: "Cadastro de Parceiros | Móveis Unghero",
  description:
    "Projetistas, arquitetos e decoradores: cadastre-se para fazer parceria com a Móveis Unghero.",
};

export default function CadastroParceiroPage() {
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col justify-between relative overflow-hidden">
      {/* Imagem de Fundo Overlay Sutil */}
      <div 
        className="absolute inset-0 z-0 bg-[url('/partner_signup_bg.png')] bg-cover bg-center opacity-10 mix-blend-overlay pointer-events-none"
        style={{ filter: "brightness(0.6) contrast(1.1)" }}
      />

      <header className="w-full bg-slate-950/80 backdrop-blur-sm border-b border-slate-900 py-4 px-6 shadow-sm z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="Móveis Unghero"
              className="h-9 w-auto object-contain"
            />
          </div>
          <span className="text-[10px] font-black text-white uppercase tracking-widest bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700/60 shadow-inner">
            Parceiros
          </span>
        </div>
      </header>

      <div className="flex-1 flex items-center py-8 z-10">
        <div className="w-full">
          <PartnerSignupForm />
        </div>
      </div>

      <footer className="w-full border-t border-slate-900 bg-slate-950/80 backdrop-blur-sm py-6 text-center text-xs font-bold text-slate-500 z-10">
        <p>© {new Date().getFullYear()} Móveis Unghero — Todos os direitos reservados.</p>
        <p className="text-[10px] font-semibold text-slate-600 mt-1">Farroupilha · RS · desde 2006</p>
      </footer>
    </main>
  );
}
