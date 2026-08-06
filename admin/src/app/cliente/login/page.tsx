import React from "react";
import { loginCliente } from "@/app/actions/cliente";
import LoginFormClient from "./LoginFormClient";
import ClienteLoginHeroIcon from "./ClienteLoginHeroIcon";
import { PUBLIC_PAGE_COPY, publicPageMetadata } from "@/lib/publicPageMetadata";

export const metadata = publicPageMetadata({
  title: PUBLIC_PAGE_COPY.portalCliente.title,
  description: PUBLIC_PAGE_COPY.portalCliente.description,
});

export default function ClienteLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-radial-gradient from-[#221c18] to-[#120e0c] p-4 text-foreground relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full bg-amber-500/5 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[420px] space-y-6 z-10 animate-in fade-in duration-300">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-3">
            <ClienteLoginHeroIcon />
          </div>
          <h1 className="text-2xl font-extrabold tracking-widest text-foreground uppercase leading-none">
            MÓVEIS UNGHERO
          </h1>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest block font-bold">
            Portal do Cliente — Acompanhar Sonho
          </span>
        </div>

        <div className="rounded-2xl border border-border/40 bg-card/35 backdrop-blur-md p-6 shadow-2xl relative overflow-hidden">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">Acessar seu Painel</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Use os dados do seu cadastro para acompanhar o andamento do seu projeto de móveis.
              </p>
            </div>

            <LoginFormClient loginAction={loginCliente} />
          </div>
        </div>
      </div>
    </div>
  );
}
