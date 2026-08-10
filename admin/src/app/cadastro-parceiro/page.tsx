import React from "react";
import Link from "next/link";
import PartnerSignupForm from "./PartnerSignupForm";
import FormLgpdNotice from "@/components/forms/FormLgpdNotice";
import ParceiroLoginBackground from "@/app/parceiro/login/ParceiroLoginBackground";
import { PUBLIC_PAGE_COPY, publicPageMetadata } from "@/lib/publicPageMetadata";

export const metadata = publicPageMetadata({
  title: PUBLIC_PAGE_COPY.cadastroParceiro.title,
  description: PUBLIC_PAGE_COPY.cadastroParceiro.description,
  noIndex: false,
});

export default function CadastroParceiroPage() {
  return (
    <div className="parceiro-login-shell parceiro-login-shell--scroll">
      <ParceiroLoginBackground />

      <div className="parceiro-login-content parceiro-login-content--wide animate-in fade-in duration-500">
        <div className="parceiro-login-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Móveis Unghero"
            className="parceiro-login-logo"
          />
          <span className="parceiro-login-eyebrow">
            Portal do Parceiro — Arquitetos & Projetistas
          </span>
        </div>

        <div className="parceiro-login-card">
          <div className="parceiro-login-card-accent" />
          <div className="parceiro-login-card-body">
            <div className="mb-5">
              <span className="parceiro-login-badge">Cadastro de parceiro</span>
              <h1 className="parceiro-login-title">Seja nosso parceiro</h1>
              <p className="parceiro-login-subtitle">
                Cadastre-se para indicar clientes e co-projetar com a Móveis
                Unghero. Após a aprovação, liberamos o acesso ao portal.
              </p>
            </div>

            <PartnerSignupForm />

            <FormLgpdNotice
              className="mt-5 !text-muted-foreground"
              purpose="avaliar a parceria profissional e manter contato comercial"
            />
          </div>
        </div>

        <p className="parceiro-login-footer">
          Já é parceiro?{" "}
          <Link href="/parceiro/login" className="parceiro-login-footer-link">
            Acessar painel
          </Link>
        </p>
      </div>
    </div>
  );
}
