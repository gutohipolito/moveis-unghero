import React from "react";
import Link from "next/link";
import { loginParceiro, confirmParceiroLoginOtp } from "@/app/actions/parceiroPortal";
import LoginFormParceiro from "./LoginFormParceiro";
import ParceiroLoginBackground from "./ParceiroLoginBackground";
import ParceiroLoginBadgeIcon from "./ParceiroLoginBadgeIcon";
import { PUBLIC_PAGE_COPY, publicPageMetadata } from "@/lib/publicPageMetadata";

export const metadata = publicPageMetadata({
  title: PUBLIC_PAGE_COPY.portalParceiro.title,
  description: PUBLIC_PAGE_COPY.portalParceiro.description,
});

export default function ParceiroLoginPage() {
  return (
    <div className="parceiro-login-shell">
      <ParceiroLoginBackground />

      <div className="parceiro-login-content animate-in fade-in duration-500">
        <div className="parceiro-login-brand">
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
              <span className="parceiro-login-badge inline-flex items-center gap-1.5">
                <ParceiroLoginBadgeIcon />
                Acesso do parceiro
              </span>
              <h1 className="parceiro-login-title">Acessar seu painel</h1>
              <p className="parceiro-login-subtitle">
                Informe e-mail e telefone do cadastro. Enviaremos um código de
                acesso para o e-mail.
              </p>
            </div>

            <LoginFormParceiro
              loginAction={loginParceiro}
              confirmOtpAction={confirmParceiroLoginOtp}
            />
          </div>
        </div>

        <p className="parceiro-login-footer">
          Ainda não é parceiro?{" "}
          <Link href="/cadastro-parceiro" className="parceiro-login-footer-link">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}
