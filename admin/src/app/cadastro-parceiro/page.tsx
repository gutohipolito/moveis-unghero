import PartnerSignupForm from "./PartnerSignupForm";

export const metadata = {
  title: "Cadastro de Parceiros | Móveis Unghero",
  description:
    "Projetistas, arquitetos e decoradores: cadastre-se para fazer parceria com a Móveis Unghero.",
};

export default function CadastroParceiroPage() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <header className="w-full bg-slate-950 border-b border-slate-900 py-4 px-6 shadow-sm">
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

      <div className="flex-1 flex items-center py-8">
        <div className="w-full">
          <PartnerSignupForm />
        </div>
      </div>

      <footer className="w-full border-t border-slate-900 bg-slate-950 py-6 text-center text-xs font-bold text-slate-500">
        <p>© {new Date().getFullYear()} Móveis Unghero — Todos os direitos reservados.</p>
        <p className="text-[10px] font-semibold text-slate-600 mt-1">Farroupilha · RS · desde 2006</p>
      </footer>
    </main>
  );
}
