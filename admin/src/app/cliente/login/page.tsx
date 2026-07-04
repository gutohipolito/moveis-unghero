import React from "react";
import { loginCliente, loginClienteSimulado } from "@/app/actions/cliente";
import LoginFormClient from "./LoginFormClient";
import { Sparkles, ArrowRight, AlertCircle } from "lucide-react";

export default function ClienteLoginPage() {
  
  // Handler simulado para acesso rápido via Server Action
  async function handleQuickAccess(clientId: string) {
    "use server";
    await loginClienteSimulado(clientId);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-radial-gradient from-[#221c18] to-[#120e0c] p-4 text-foreground relative overflow-hidden">
      
      {/* Detalhes de luz de fundo para Rich Aesthetics */}
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full bg-amber-500/5 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[420px] space-y-6 z-10 animate-in fade-in duration-300">
        
        {/* Cabeçalho */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-3">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-widest text-foreground uppercase leading-none">
            MÓVEIS UNGHERO
          </h1>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest block font-bold">
            Portal do Cliente — Acompanhar Sonho
          </span>
        </div>

        {/* Card do Formulário */}
        <div className="rounded-2xl border border-border/40 bg-card/35 backdrop-blur-md p-6 shadow-2xl relative overflow-hidden">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">Acessar seu Painel</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Digite os dados cadastrados no CRM da loja para acompanhar o progresso dos seus móveis.
              </p>
            </div>

            <LoginFormClient loginAction={loginCliente} />
          </div>
        </div>

        {process.env.NODE_ENV !== "production" && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Acesso de Demonstração</h3>
            </div>
            <p className="text-[11px] text-muted-foreground leading-normal">
              Acesse como um cliente cadastrado no CRM para testar a visualização completa do portal pós-venda:
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <form action={handleQuickAccess.bind(null, "cli-2")}>
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-between text-left text-[11px] font-semibold p-2.5 rounded-lg border border-border/40 hover:border-primary/40 bg-black/25 text-neutral-300 hover:text-foreground transition-all cursor-pointer group"
                >
                  <div className="truncate">
                    <span className="block text-[8px] text-muted-foreground font-bold uppercase">Julho / Orçamento</span>
                    Mariana Rezende
                  </div>
                  <ArrowRight className="h-3 w-3 shrink-0 ml-1 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </form>

              <form action={handleQuickAccess.bind(null, "cli-6")}>
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-between text-left text-[11px] font-semibold p-2.5 rounded-lg border border-border/40 hover:border-primary/40 bg-black/25 text-neutral-300 hover:text-foreground transition-all cursor-pointer group"
                >
                  <div className="truncate">
                    <span className="block text-[8px] text-muted-foreground font-bold uppercase">Fábrica / Produção</span>
                    Juliana Castro
                  </div>
                  <ArrowRight className="h-3 w-3 shrink-0 ml-1 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
