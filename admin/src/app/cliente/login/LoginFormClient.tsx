"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

interface LoginFormClientProps {
  loginAction: (data: { identificador: string; cpf: string }) => Promise<{ success: boolean; clientId?: string; error?: string }>;
}

export default function LoginFormClient({ loginAction }: LoginFormClientProps) {
  const router = useRouter();
  const [identificador, setIdentificador] = useState("");
  const [cpf, setCpf] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identificador || !cpf) {
      setError("Por favor, preencha todos os campos.");
      return;
    }

    setError("");
    setLoading(true);

    const res = await loginAction({ identificador, cpf });
    
    if (res.success && res.clientId) {
      // Redireciona para o painel do cliente
      router.push("/cliente/dashboard");
    } else {
      setError(res.error || "Acesso negado. Verifique os dados fornecidos.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold border border-destructive/20 animate-in fade-in duration-200">
          ⚠️ {error}
        </div>
      )}

      <div>
        <label className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wider mb-1">
          E-mail ou Telefone
        </label>
        <Input
          type="text"
          required
          placeholder="Digite seu e-mail ou telefone"
          value={identificador}
          onChange={(e) => setIdentificador(e.target.value)}
        />
      </div>

      <div>
        <label className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wider mb-1">
          CPF do Titular
        </label>
        <Input
          type="text"
          required
          placeholder="Apenas números"
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full font-bold">
        {loading ? "Acessando..." : "Acessar Portal"}
      </Button>
    </form>
  );
}
