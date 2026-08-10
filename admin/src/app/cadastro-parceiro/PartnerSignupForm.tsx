"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PartnerType } from "@prisma/client";
import {
  CheckCircle,
  Loader2,
  Send,
  ArrowLeft,
  ArrowRight,
  User,
  Briefcase,
  MapPin,
  Smartphone,
  Mail,
  Link as LinkIcon,
  Handshake,
  Award,
} from "lucide-react";
import { submitPublicPartnerSignupAction } from "@/app/actions/partnerSignup";
import {
  PARTNER_ORIGEM_OPTIONS,
  PARTNER_SIGNUP_TYPES,
  PARTNER_TYPE_STYLES,
} from "@/lib/partnerTypes";
import { formatPhoneInput, isValidBrPhoneDigits, PHONE_PLACEHOLDER } from "@/lib/phone";
import { FORM_FIELD_LIMITS } from "@/lib/brDocuments";
import { validateOptionalEmail } from "@/lib/email";
import { preventEnterSubmit, useSubmitUnlock } from "@/hooks/useSubmitUnlock";
import FormProgressBar from "@/components/forms/FormProgressBar";
import { CIDADES_SERRA_GAUCHA } from "@/lib/address";
import {
  PARTNER_LGPD_CHECKBOX_LABEL,
  PARTNER_MARKETING_CHECKBOX_LABEL,
} from "@/lib/consentCopy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const TOTAL_STEPS = 5;

const STEP_LABELS = [
  "Especialidade",
  "Identidade",
  "Contato",
  "Portfólio",
  "Parceria",
] as const;

const labelClass =
  "text-[10px] font-bold text-muted-foreground block uppercase tracking-wider";
const inputClass =
  "h-11 bg-white/90 border-border/70 focus-visible:ring-primary/30";
const selectClass =
  "w-full h-11 rounded-md border border-border/70 bg-white/90 px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 cursor-pointer";
const textareaClass =
  "w-full rounded-md border border-border/70 bg-white/90 px-3 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 resize-none";

export default function PartnerSignupForm({ companyId }: { companyId?: string }) {
  const [step, setStep] = useState(1);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<PartnerType>("ARQUITETO");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [cidade, setCidade] = useState("");
  const [escritorio, setEscritorio] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [registroProfissional, setRegistroProfissional] = useState("");
  const [origem, setOrigem] = useState("");
  const [aceitaLgpd, setAceitaLgpd] = useState(false);
  const [aceitaMarketing, setAceitaMarketing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const submitUnlocked = useSubmitUnlock(step === TOTAL_STEPS);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("moveis_unghero_partner_draft");
      const saved = localStorage.getItem("moveis_unghero_partner_draft_v2");
      if (saved) {
        try {
          const draft = JSON.parse(saved);
          if (draft.step) setStep(draft.step);
          if (draft.nome) setNome(draft.nome);
          if (draft.tipo) setTipo(draft.tipo);
          if (draft.telefone) setTelefone(draft.telefone);
          if (draft.email) setEmail(draft.email);
          if (draft.cidade) setCidade(draft.cidade);
          if (draft.escritorio) setEscritorio(draft.escritorio);
          if (draft.portfolioUrl) setPortfolioUrl(draft.portfolioUrl);
          if (draft.observacoes) setObservacoes(draft.observacoes);
          if (draft.registroProfissional) setRegistroProfissional(draft.registroProfissional);
          if (draft.origem) setOrigem(draft.origem);
        } catch (e) {
          console.error("Erro ao recuperar rascunho de parceiro:", e);
        }
      }
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      const draft = {
        step,
        nome,
        tipo,
        telefone,
        email,
        cidade,
        escritorio,
        portfolioUrl,
        observacoes,
        registroProfissional,
        origem,
      };
      localStorage.setItem("moveis_unghero_partner_draft_v2", JSON.stringify(draft));
    }
  }, [
    isLoaded,
    step,
    nome,
    tipo,
    telefone,
    email,
    cidade,
    escritorio,
    portfolioUrl,
    observacoes,
    registroProfissional,
    origem,
  ]);

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTelefone(formatPhoneInput(e.target.value));
  };

  const handleSelectTipo = (value: PartnerType) => {
    setTipo(value);
    autoAdvance(2);
  };

  const autoAdvance = (nextStep: number) => {
    setTimeout(() => {
      setStep(nextStep);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 250);
  };

  const nextStep = () => {
    setError(null);
    if (step === 1 && !tipo) {
      setError("Por favor, selecione seu tipo de atuação.");
      return;
    }
    if (step === 2) {
      const cleanNome = nome.trim();
      if (!cleanNome) {
        setError("Por favor, informe seu nome completo.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      const nameParts = cleanNome.split(/\s+/).filter((part) => part.length > 0);
      if (nameParts.length < 2) {
        setError("Por favor, informe seu nome e sobrenome (nome completo).");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (!cidade.trim()) {
        setError("Por favor, selecione sua cidade de atuação.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (tipo === "ARQUITETO" && !registroProfissional.trim()) {
        setError("Por favor, informe o seu CAU para prosseguir.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (tipo === "ENGENHEIRO" && !registroProfissional.trim()) {
        setError("Por favor, informe o seu CREA para prosseguir.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }
    if (step === 3) {
      if (!telefone.trim()) {
        setError("Informe um WhatsApp/telefone com DDD (obrigatório).");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (!isValidBrPhoneDigits(telefone)) {
        setError("Por favor, insira um WhatsApp/Telefone válido com DDD (fixo ou celular).");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (!email.trim()) {
        setError("Informe um e-mail válido (obrigatório para o portal).");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      const emailError = validateOptionalEmail(email);
      if (emailError) {
        setError(emailError);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }
    if (step === 4) {
      if (portfolioUrl.trim()) {
        const value = portfolioUrl.trim();
        let testValue = value;
        if (!/^https?:\/\//i.test(value)) {
          testValue = `https://${value}`;
        }
        try {
          const parsedUrl = new URL(testValue);
          if (!parsedUrl.hostname.includes(".")) {
            setError(
              "Por favor, insira um link ou URL válido para o seu portfólio (ex: https://instagram.com/seu_perfil)."
            );
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
          }
        } catch {
          setError(
            "Por favor, insira um link ou URL válido para o seu portfólio (ex: https://instagram.com/seu_perfil)."
          );
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }
      }
    }

    setStep(step + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const prevStep = () => {
    setError(null);
    setStep(step - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!submitUnlocked || step !== TOTAL_STEPS) return;

    const cleanNome = nome.trim();
    if (!cleanNome) {
      setError("Por favor, informe seu nome completo.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const nameParts = cleanNome.split(/\s+/).filter((part) => part.length > 0);
    if (nameParts.length < 2) {
      setError("Por favor, informe seu nome e sobrenome (nome completo).");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!cidade.trim()) {
      setError("Por favor, informe sua cidade de atuação.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (tipo === "ARQUITETO" && !registroProfissional.trim()) {
      setError("Por favor, informe o seu CAU.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (tipo === "ENGENHEIRO" && !registroProfissional.trim()) {
      setError("Por favor, informe o seu CREA.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!telefone.trim() || !isValidBrPhoneDigits(telefone)) {
      setError("Informe um WhatsApp/telefone válido com DDD (obrigatório).");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!email.trim()) {
      setError("Informe um e-mail válido (obrigatório para o portal).");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    {
      const emailError = validateOptionalEmail(email);
      if (emailError) {
        setError(emailError);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }
    if (portfolioUrl.trim()) {
      const value = portfolioUrl.trim();
      let testValue = value;
      if (!/^https?:\/\//i.test(value)) {
        testValue = `https://${value}`;
      }
      try {
        const parsedUrl = new URL(testValue);
        if (!parsedUrl.hostname.includes(".")) {
          setError("Por favor, insira um link ou URL de portfólio válido.");
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }
      } catch {
        setError("Por favor, insira um link ou URL de portfólio válido.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }

    if (!origem.trim()) {
      setError("Por favor, informe como conheceu nossa empresa.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (!aceitaLgpd) {
      setError("Você precisa aceitar o tratamento de dados de acordo com a LGPD.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setLoading(true);

    const res = await submitPublicPartnerSignupAction({
      nome,
      tipo,
      telefone,
      email,
      cidade,
      escritorio,
      portfolio_url: portfolioUrl,
      registro_profissional: registroProfissional.trim() || undefined,
      origem: origem.trim(),
      observacoes: observacoes.trim() || undefined,
      company_id: companyId,
      lgpd_aceite: aceitaLgpd,
      marketing_aceite: aceitaMarketing,
    });

    setLoading(false);

    if (res.success) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("moveis_unghero_partner_draft_v2");
        localStorage.removeItem("moveis_unghero_partner_draft");
      }
      setSuccess(true);
      return;
    }

    setError(res.error ?? "Não foi possível enviar o cadastro.");
  }

  const handleFormKeyDown = preventEnterSubmit;

  const navRow = (
    <div className="flex items-center justify-between gap-3 pt-1">
      {step > 1 ? (
        <Button
          type="button"
          variant="outline"
          onClick={prevStep}
          disabled={loading}
          className="h-11 font-bold gap-1.5 border-border/70 bg-white/80"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      ) : (
        <span />
      )}
      {step < TOTAL_STEPS ? (
        <Button
          type="button"
          onClick={nextStep}
          className="h-11 font-bold btn-metallic gap-1.5 ml-auto"
        >
          Continuar
          <ArrowRight className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );

  if (success) {
    return (
      <div className="space-y-5 text-center animate-in fade-in duration-500">
        <div className="inline-flex p-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700">
          <CheckCircle className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <h2 className="parceiro-login-title">Cadastro enviado!</h2>
          <p className="parceiro-login-subtitle mx-auto max-w-sm">
            Obrigado pelo interesse em fazer parceria com a Móveis Unghero. Nossa
            equipe analisará seu perfil e, após a aprovação, liberará o acesso ao
            portal.
          </p>
        </div>

        <Link
          href="/parceiro/login"
          className="inline-flex w-full h-11 items-center justify-center rounded-md text-sm font-bold btn-metallic"
        >
          Ir para o login
        </Link>

        <div className="rounded-xl border border-border/60 bg-slate-50/80 p-3.5 space-y-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Canais oficiais
          </p>
          <div className="grid grid-cols-2 gap-2">
            <a
              href="https://www.instagram.com/moveisunghero/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 h-10 rounded-lg border border-border/70 bg-white/90 text-xs font-bold text-foreground hover:bg-white transition-colors"
            >
              Instagram
            </a>
            <a
              href="https://wa.me/5554999971050"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 h-10 rounded-lg border border-border/70 bg-white/90 text-xs font-bold text-foreground hover:bg-white transition-colors"
            >
              <Smartphone className="h-3.5 w-3.5 text-emerald-600" />
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-5">
      <FormProgressBar
        step={step}
        totalSteps={TOTAL_STEPS}
        tone="slate"
        stepLabel={`Etapa ${step} de ${TOTAL_STEPS} · ${STEP_LABELS[step - 1]}`}
        className="rounded-xl border border-border/50 bg-slate-50/70 overflow-hidden -mx-0"
      />

      {error ? (
        <div
          role="alert"
          className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold border border-destructive/20 animate-in fade-in duration-200"
        >
          {error}
        </div>
      ) : null}

      {step === 1 && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <div>
            <h2 className="text-sm font-bold text-foreground tracking-tight">
              Qual a sua especialidade?
            </h2>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              Selecione sua principal área de atuação.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {PARTNER_SIGNUP_TYPES.map((t) => {
              const isSelected = tipo === t;
              const style = PARTNER_TYPE_STYLES[t];
              const Icon = style.icon;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleSelectTipo(t)}
                  className={cn(
                    "p-3.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[6.5rem] gap-2",
                    isSelected
                      ? "border-primary/50 bg-primary text-primary-foreground shadow-sm"
                      : "border-border/70 bg-white/90 text-foreground hover:border-border"
                  )}
                >
                  <span
                    className={cn(
                      "p-2 rounded-lg transition-all",
                      isSelected ? "bg-white/15 text-white" : `${style.bg} ${style.text}`
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                  </span>
                  <span className="text-[11px] font-bold leading-tight">{style.label}</span>
                </button>
              );
            })}
          </div>

          {navRow}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <div>
            <h2 className="text-sm font-bold text-foreground tracking-tight">
              Quem é você e onde atua?
            </h2>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              Queremos conhecer você e seu escritório.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="parceiro-signup-nome" className={labelClass}>
                Nome completo *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="parceiro-signup-nome"
                  required
                  type="text"
                  placeholder="Seu nome completo"
                  value={nome}
                  onChange={(e) => setNome(e.target.value.slice(0, FORM_FIELD_LIMITS.nome))}
                  maxLength={FORM_FIELD_LIMITS.nome}
                  className={cn(inputClass, "pl-10")}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="parceiro-signup-escritorio" className={labelClass}>
                  Escritório / studio
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="parceiro-signup-escritorio"
                    type="text"
                    placeholder="Nome do studio (opcional)"
                    value={escritorio}
                    onChange={(e) =>
                      setEscritorio(e.target.value.slice(0, FORM_FIELD_LIMITS.escritorio))
                    }
                    maxLength={FORM_FIELD_LIMITS.escritorio}
                    className={cn(inputClass, "pl-10")}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="parceiro-signup-cidade" className={labelClass}>
                  Cidade de atuação *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                  <select
                    id="parceiro-signup-cidade"
                    required
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    className={cn(selectClass, "pl-10")}
                  >
                    <option value="">Selecione...</option>
                    {CIDADES_SERRA_GAUCHA.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="parceiro-signup-registro" className={labelClass}>
                {tipo === "ARQUITETO"
                  ? "Registro CAU *"
                  : tipo === "ENGENHEIRO"
                    ? "Registro CREA *"
                    : "Registro profissional (opcional)"}
              </label>
              <div className="relative">
                <Award className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="parceiro-signup-registro"
                  type="text"
                  placeholder={
                    tipo === "ARQUITETO"
                      ? "Ex: A123456-7"
                      : tipo === "ENGENHEIRO"
                        ? "Ex: 123.456-D"
                        : "CAU, CREA ou ABD (se houver)"
                  }
                  value={registroProfissional}
                  onChange={(e) =>
                    setRegistroProfissional(
                      e.target.value.slice(0, FORM_FIELD_LIMITS.registroProfissional)
                    )
                  }
                  maxLength={FORM_FIELD_LIMITS.registroProfissional}
                  className={cn(inputClass, "pl-10")}
                  required={tipo === "ARQUITETO" || tipo === "ENGENHEIRO"}
                />
              </div>
            </div>
          </div>

          {navRow}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <div>
            <h2 className="text-sm font-bold text-foreground tracking-tight">
              Como falamos com você?
            </h2>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              Contatos comerciais para retorno e acesso ao portal.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="parceiro-signup-telefone" className={labelClass}>
                WhatsApp / telefone *
              </label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="parceiro-signup-telefone"
                  required
                  type="tel"
                  inputMode="numeric"
                  placeholder={PHONE_PLACEHOLDER}
                  value={telefone}
                  onChange={handleTelefoneChange}
                  maxLength={16}
                  className={cn(inputClass, "pl-10")}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">Celular ou fixo com DDD</p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="parceiro-signup-email" className={labelClass}>
                E-mail comercial *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="parceiro-signup-email"
                  required
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="arquiteto@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.slice(0, FORM_FIELD_LIMITS.email))}
                  maxLength={FORM_FIELD_LIMITS.email}
                  className={cn(inputClass, "pl-10")}
                />
              </div>
            </div>
          </div>

          {navRow}
        </div>
      )}

      {step === 4 && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <div>
            <h2 className="text-sm font-bold text-foreground tracking-tight">
              Portfólio ou perfil digital
            </h2>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              Compartilhe um link para conhecermos seus trabalhos (opcional).
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="parceiro-signup-portfolio" className={labelClass}>
              Instagram, site ou Behance
            </label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="parceiro-signup-portfolio"
                type="url"
                placeholder="https://instagram.com/seu_perfil"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                className={cn(inputClass, "pl-10")}
              />
            </div>
          </div>

          {navRow}
        </div>
      )}

      {step === 5 && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <div>
            <h2 className="text-sm font-bold text-foreground tracking-tight">
              Sobre a parceria
            </h2>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              Expectativas e como conheceu a Móveis Unghero.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="parceiro-signup-obs" className={labelClass}>
                Como podemos atuar juntos?
              </label>
              <div className="relative">
                <Handshake className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                <textarea
                  id="parceiro-signup-obs"
                  placeholder="Ex: políticas de indicação, RT, envio de projetos técnicos…"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={3}
                  className={cn(textareaClass, "pl-10")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className={labelClass}>Como conheceu nossa empresa? *</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PARTNER_ORIGEM_OPTIONS.map((option) => {
                  const selected = origem === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setOrigem(option)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left text-xs font-semibold transition-all cursor-pointer",
                        selected
                          ? "border-primary/45 bg-primary/5 text-foreground"
                          : "border-border/70 bg-white/90 text-muted-foreground hover:border-border hover:text-foreground"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                          selected
                            ? "border-primary bg-primary"
                            : "border-border bg-white"
                        )}
                        aria-hidden
                      >
                        {selected ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                        ) : null}
                      </span>
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-border/50">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={aceitaLgpd}
                  onChange={(e) => setAceitaLgpd(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary/30 cursor-pointer"
                  required
                />
                <span className="text-[11px] font-medium text-foreground leading-relaxed">
                  {PARTNER_LGPD_CHECKBOX_LABEL}
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={aceitaMarketing}
                  onChange={(e) => setAceitaMarketing(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary/30 cursor-pointer"
                />
                <span className="text-[11px] font-medium text-muted-foreground leading-relaxed">
                  {PARTNER_MARKETING_CHECKBOX_LABEL}
                </span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={loading}
              className="h-11 font-bold gap-1.5 border-border/70 bg-white/80"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <Button
              type="submit"
              disabled={loading || !submitUnlocked || !aceitaLgpd}
              title={
                !aceitaLgpd
                  ? "Aceite o tratamento de dados (LGPD) para enviar"
                  : !submitUnlocked
                    ? "Aguarde um instante para enviar"
                    : undefined
              }
              className="h-11 font-bold btn-metallic gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando…
                </>
              ) : !submitUnlocked ? (
                "Aguarde…"
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Enviar cadastro
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
