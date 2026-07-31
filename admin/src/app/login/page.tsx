"use client";

import React, { useState } from "react";
import { ActionDialogHost, useActionDialog } from "@/components/ActionDialogHost";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Mail, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const dialog = useActionDialog();
  const { showError } = dialog;

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data) {
        window.location.href = "/";
      } else if (res.status === 429) {
        showError(
          "Muitas tentativas",
          data?.message || "Aguarde alguns minutos e tente novamente."
        );
        setLoading(false);
      } else {
        showError("Login inválido", data?.message || "E-mail ou senha incorretos.");
        setLoading(false);
      }
    } catch {
      showError("Erro de conexão", "Não foi possível conectar ao servidor de autenticação.");
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-brand-panel">
        <div className="login-brand-content relative z-10">
          <h1 className="login-brand-title">Feito com afeto.<br />Gerido com precisão.</h1>
        </div>
        <p className="text-sm text-white/60 relative z-10 font-medium tracking-wide">
          Farroupilha · RS · desde 2006
        </p>
      </div>

      <div className="login-form-panel">
        <div className="relative z-10 flex flex-col items-center w-full max-w-[25rem]">
          <img src="/logo.png" alt="Móveis Unghero" className="login-form-logo h-12 w-auto mb-8" />
          
          <div className="login-card">
            <div className="mb-6">
              <span className="login-card-badge">Acesso Restrito</span>
              <h2 className="page-title text-xl font-bold mt-1">Entrar no painel</h2>
              <p className="detail-text mt-1">Use o e-mail cadastrado pela equipe.</p>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-5">
              <div className="login-form-group space-y-1.5">
                <label className="text-xs font-semibold text-foreground/80 tracking-wide uppercase">E-mail</label>
                <div className="relative">
                  <Mail className="absolute h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    required
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="login-form-group space-y-1.5">
                <label className="text-xs font-semibold text-foreground/80 tracking-wide uppercase">Senha</label>
                <div className="relative">
                  <Lock className="absolute h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    required
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className="w-full login-submit-btn mt-2" disabled={loading}>
                {loading ? "Entrando..." : "Acessar painel"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
      <ActionDialogHost dialog={dialog} />
    </div>
  );
}
