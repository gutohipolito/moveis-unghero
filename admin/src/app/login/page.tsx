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
        window.location.href = "/crm";
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
        <div>
          <img src="/logo.png" alt="Móveis Unghero" className="h-12 w-auto mb-8" />
          <h1 className="login-brand-title">Feito com afeto.<br />Gerido com precisão.</h1>
          <p className="login-brand-tagline">
            Painel interno para acompanhar clientes, projetos, fábrica e financeiro da marcenaria.
          </p>
        </div>
        <p className="text-sm text-[hsl(var(--sidebar-muted))]">
          Farroupilha · RS · desde 2006
        </p>
      </div>

      <div className="login-form-panel">
        <div className="login-card space-y-6">
          <div className="md:hidden flex justify-center mb-2">
            <img src="/logo.png" alt="Móveis Unghero" className="h-10 w-auto" />
          </div>

          <div>
            <h2 className="page-title text-xl">Entrar no painel</h2>
            <p className="detail-text mt-1">Use o e-mail cadastrado pela equipe.</p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  required
                  placeholder="seu.email@moveisunghero.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Acessar painel"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
      <ActionDialogHost dialog={dialog} />
    </div>
  );
}
