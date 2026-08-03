import React from "react";
import { PenTool } from "lucide-react";
import Link from "next/link";
import { loginParceiro } from "@/app/actions/parceiroPortal";
import LoginFormParceiro from "./LoginFormParceiro";
import { PUBLIC_PAGE_COPY, publicPageMetadata } from "@/lib/publicPageMetadata";

export const metadata = publicPageMetadata({
  title: PUBLIC_PAGE_COPY.portalParceiro.title,
  description: PUBLIC_PAGE_COPY.portalParceiro.description,
});

export default function ParceiroLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-radial-gradient from-[#221c18] to-[#120e0c] p-4 text-foreground relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full bg-amber-500/5 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[420px] space-y-6 z-10 animate-in fade-in duration-300">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-3">
            <PenTool className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-widest text-foreground uppercase leading-none">
            MÓVEIS UNGHERO
          </h1>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest block font-bold">
            Portal do Parceiro — Arquitetos & Projetistas
          </span>
        </div>

        <div className="rounded-2xl border border-border/40 bg-card/35 backdrop-blur-md p-6 shadow-2xl relative overflow-hidden">
          <div className="partner-card-accent absolute inset-x-0 top-0" />
          <div className="space-y-4 pt-1">
            <div>
              <h2 className="text-lg font-display font-bold text-foreground">Acessar seu painel</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Use o e-mail e o telefone do seu cadastro de parceiro para acompanhar as obras
                vinculadas a você.
              </p>
            </div>

            <LoginFormParceiro loginAction={loginParceiro} />
          </div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground">
          Ainda não é parceiro?{" "}
          <Link href="/cadastro-parceiro" className="text-primary font-semibold hover:underline">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}
