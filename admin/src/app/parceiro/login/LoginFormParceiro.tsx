"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { formatPhoneInput, PHONE_PLACEHOLDER } from "@/lib/phone";

interface LoginFormParceiroProps {
  loginAction: (data: {
    email: string;
    telefone: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

export default function LoginFormParceiro({ loginAction }: LoginFormParceiroProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !telefone.trim()) {
      setError("Preencha e-mail e telefone.");
      return;
    }

    setError("");
    setLoading(true);

    const res = await loginAction({ email, telefone });

    if (res.success) {
      router.push("/parceiro/painel");
    } else {
      setError(res.error || "Acesso negado. Verifique os dados fornecidos.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold border border-destructive/20 animate-in fade-in duration-200">
          {error}
        </div>
      )}

      <div>
        <label className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wider mb-1">
          E-mail cadastrado
        </label>
        <Input
          type="email"
          required
          autoComplete="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <label className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wider mb-1">
          Telefone cadastrado
        </label>
        <Input
          type="tel"
          required
          autoComplete="tel"
          placeholder={PHONE_PLACEHOLDER}
          value={telefone}
          onChange={(e) => setTelefone(formatPhoneInput(e.target.value))}
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full font-bold btn-metallic">
        {loading ? "Acessando..." : "Entrar no painel"}
      </Button>
    </form>
  );
}
