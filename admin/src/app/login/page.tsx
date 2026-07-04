"use client";

import React, { useState, useEffect } from "react";
import { loginSimulated } from "@/app/actions/login";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Lock, 
  Mail, 
  ShieldAlert, 
  Sparkles,
  ArrowRight,
  ChevronRight
} from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLocalhost, setIsLocalhost] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsLocalhost(
        window.location.hostname === "localhost" || 
        window.location.hostname === "127.0.0.1"
      );
    }
  }, []);

  // Submit normal do Better Auth (tentativa real)
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          password
        })
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data) {
        // Login realizado com sucesso. O better-auth já definiu os cookies de sessão no navegador.
        // Redireciona o usuário para o painel principal.
        window.location.href = "/crm";
      } else {
        alert(data?.message || "E-mail ou senha incorretos.");
        setLoading(false);
      }
    } catch (err) {
      console.error("Erro no login:", err);
      alert("Erro ao conectar ao servidor de autenticação.");
      setLoading(false);
    }
  };

  // Login de Demonstração
  const handleDemoLogin = async (role: string) => {
    setLoading(true);
    await loginSimulated(role);
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        
        {/* Logo / Branding */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl overflow-hidden"
            style={{ background: "hsl(28 85% 95%)", border: "1px solid hsl(28 85% 80%)" }}>
            <img 
              src="/logo.png" 
              alt="Móveis Unghero" 
              className="w-12 h-12 object-contain"
              style={{ filter: "sepia(1) saturate(2) hue-rotate(340deg) brightness(0.75)" }}
            />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-widest text-gradient-gold">
              MÓVEIS UNGHERO
            </h1>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
              SaaS Admin & CRM
            </p>
          </div>
        </div>

        {/* Card de Login */}
        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">Acesse sua conta</h2>
            <p className="text-xs text-muted-foreground">Preencha suas credenciais de acesso.</p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground block">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                <Input
                  type="email"
                  required
                  placeholder="seu.email@moveisunghero.com"
                  className="pl-9 bg-white border-border focus-visible:ring-primary"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground block">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                <Input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="pl-9 bg-white border-border focus-visible:ring-primary"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <Button type="submit" className="w-full font-semibold" disabled={loading}>
              {loading ? "Entrando..." : "Entrar no Painel"} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          {/* Painel de Acesso Rápido Simulado APENAS em localhost */}
          {isLocalhost && (
            <>
              {/* Divisor Decorativo */}
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-border/40"></div>
                <span className="flex-shrink mx-4 text-[10px] font-bold text-muted-foreground tracking-widest uppercase">
                  Demonstração
                </span>
                <div className="flex-grow border-t border-border/40"></div>
              </div>

              {/* Painel de Acesso Rápido Simulado */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-xs text-amber-400 font-medium bg-amber-500/5 border border-amber-500/10 p-2.5 rounded-lg">
                  <ShieldAlert className="h-4 w-4 flex-shrink-0" />
                  <span>Acesse com um clique para testar as telas da Fase 1:</span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => handleDemoLogin("ADMIN")}
                    className="flex items-center justify-between w-full px-4 py-2.5 text-xs font-semibold rounded-lg bg-secondary border border-border/60 hover:border-primary/40 hover:bg-accent/40 text-left transition-all group text-foreground cursor-pointer"
                    disabled={loading}
                    type="button"
                  >
                    <span>Administrador Geral (ADMIN)</span>
                    <ChevronRight className="h-4 w-4 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <button
                    onClick={() => handleDemoLogin("COMERCIAL")}
                    className="flex items-center justify-between w-full px-4 py-2.5 text-xs font-semibold rounded-lg bg-secondary border border-border/60 hover:border-primary/40 hover:bg-accent/40 text-left transition-all group text-foreground cursor-pointer"
                    disabled={loading}
                    type="button"
                  >
                    <span>Vendedor Comercial (COMERCIAL)</span>
                    <ChevronRight className="h-4 w-4 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <button
                    onClick={() => handleDemoLogin("PRODUCAO")}
                    className="flex items-center justify-between w-full px-4 py-2.5 text-xs font-semibold rounded-lg bg-secondary border border-border/60 hover:border-primary/40 hover:bg-accent/40 text-left transition-all group text-foreground cursor-pointer"
                    disabled={loading}
                    type="button"
                  >
                    <span>Chão de Fábrica (PRODUCAO)</span>
                    <ChevronRight className="h-4 w-4 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer do Login */}
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Móveis Unghero. Todos os direitos reservados.
        </p>

      </div>
    </div>
  );
}
