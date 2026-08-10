"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { formatPhoneInput, PHONE_PLACEHOLDER } from "@/lib/phone";
import { Mail, Phone, Loader2, KeyRound } from "lucide-react";
import { ArrowNarrowRightIcon, useAnimatedIconHover } from "@/components/icons";

interface LoginFormParceiroProps {
  loginAction: (data: {
    email: string;
    telefone: string;
  }) => Promise<{
    success: boolean;
    needsOtp?: boolean;
    emailHint?: string;
    error?: string;
  }>;
  confirmOtpAction: (data: {
    code: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

export default function LoginFormParceiro({
  loginAction,
  confirmOtpAction,
}: LoginFormParceiroProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [emailHint, setEmailHint] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submitIcon = useAnimatedIconHover();

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !telefone.trim()) {
      setError("Preencha e-mail e telefone.");
      return;
    }

    setError("");
    setLoading(true);

    const res = await loginAction({ email, telefone });

    if (res.success && res.needsOtp) {
      setEmailHint(res.emailHint || email.trim());
      setStep("otp");
      setCode("");
      setLoading(false);
      return;
    }

    if (res.success) {
      router.push("/parceiro/painel");
      return;
    }

    setError(res.error || "Acesso negado. Verifique os dados fornecidos.");
    setLoading(false);
  };

  const handleOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.replace(/\D/g, "").length !== 6) {
      setError("Informe o código de 6 dígitos enviado por e-mail.");
      return;
    }

    setError("");
    setLoading(true);

    const res = await confirmOtpAction({ code });
    if (res.success) {
      router.push("/parceiro/painel");
      return;
    }

    setError(res.error || "Código inválido.");
    setLoading(false);
  };

  if (step === "otp") {
    return (
      <form onSubmit={handleOtp} className="space-y-5">
        {error && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold border border-destructive/20 animate-in fade-in duration-200"
          >
            {error}
          </div>
        )}

        <div className="rounded-xl border border-border/60 bg-slate-50/80 px-3.5 py-3 text-xs text-muted-foreground leading-relaxed">
          Enviamos um código de 6 dígitos para{" "}
          <span className="font-bold text-foreground">{emailHint}</span>. O código
          vale por 5 minutos.
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="parceiro-otp"
            className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wider"
          >
            Código de acesso
          </label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              id="parceiro-otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={6}
              placeholder="000000"
              className="pl-10 h-11 tracking-[0.35em] font-bold text-center bg-white/90 border-border/70 focus-visible:ring-primary/30"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-11 font-bold btn-metallic gap-2"
          onMouseEnter={submitIcon.onMouseEnter}
          onMouseLeave={submitIcon.onMouseLeave}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Entrar
              <ArrowNarrowRightIcon triggerRef={submitIcon.triggerRef} className="h-4 w-4" />
            </>
          )}
        </Button>

        <button
          type="button"
          className="w-full text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          onClick={() => {
            setStep("credentials");
            setCode("");
            setError("");
          }}
        >
          Voltar e usar outro e-mail
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleCredentials} className="space-y-5">
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
          WhatsApp / telefone
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

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Depois de validar os dados, enviamos um código de 6 dígitos para o seu e-mail.
      </p>

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-11 font-bold btn-metallic gap-2"
        onMouseEnter={submitIcon.onMouseEnter}
        onMouseLeave={submitIcon.onMouseLeave}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            Continuar
            <ArrowNarrowRightIcon triggerRef={submitIcon.triggerRef} className="h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );
}
