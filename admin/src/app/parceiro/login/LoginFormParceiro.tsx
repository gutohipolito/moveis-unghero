"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { formatPhoneInput, PHONE_PLACEHOLDER } from "@/lib/phone";
import { Mail, Phone, Loader2 } from "lucide-react";
import { ArrowNarrowRightIcon } from "@/components/icons";

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
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div
          role="alert"
          className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold border border-destructive/20 animate-in fade-in duration-200"
        >
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label
          htmlFor="parceiro-email"
          className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wider"
        >
          E-mail cadastrado
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            id="parceiro-email"
            type="email"
            required
            autoComplete="email"
            placeholder="seu@email.com"
            className="pl-10 h-11 bg-white/90 border-border/70 focus-visible:ring-primary/30"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="parceiro-telefone"
          className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wider"
        >
          Telefone cadastrado
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            id="parceiro-telefone"
            type="tel"
            required
            autoComplete="tel"
            placeholder={PHONE_PLACEHOLDER}
            className="pl-10 h-11 bg-white/90 border-border/70 focus-visible:ring-primary/30"
            value={telefone}
            onChange={(e) => setTelefone(formatPhoneInput(e.target.value))}
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full font-bold btn-metallic h-11 gap-2 mt-1"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Acessando...
          </>
        ) : (
          <>
            Entrar no painel
            <ArrowNarrowRightIcon size={16} />
          </>
        )}
      </Button>
    </form>
  );
}
