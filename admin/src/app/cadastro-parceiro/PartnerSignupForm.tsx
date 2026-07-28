"use client";

import React, { useState, useEffect } from "react";
import { PartnerType } from "@prisma/client";
import { 
  CheckCircle, 
  Loader2, 
  Send, 
  ArrowLeft, 
  ArrowRight, 
  AlertTriangle, 
  User, 
  Briefcase, 
  MapPin, 
  Smartphone, 
  Mail, 
  Link as LinkIcon, 
  Handshake,
  Award
} from "lucide-react";
import { submitPublicPartnerSignupAction } from "@/app/actions/partnerSignup";
import { PARTNER_ORIGEM_OPTIONS, PARTNER_SIGNUP_TYPES, PARTNER_TYPE_STYLES } from "@/lib/partnerTypes";
import { formatPhoneInput, isValidBrPhoneDigits, PHONE_PLACEHOLDER } from "@/lib/phone";
import { preventEnterSubmit, useSubmitUnlock } from "@/hooks/useSubmitUnlock";
import FormProgressBar from "@/components/forms/FormProgressBar";
import { CIDADES_SERRA_GAUCHA } from "@/lib/address";

const TOTAL_STEPS = 5;

const STEP_LABELS = ["Especialidade", "Identidade", "Contato", "Portfólio", "Parceria"] as const;

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

  // Carregar rascunho do localStorage na montagem (client-side)
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

  // Salvar rascunho no localStorage
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
  }, [isLoaded, step, nome, tipo, telefone, email, cidade, escritorio, portfolioUrl, observacoes, registroProfissional, origem]);

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
      const nameParts = cleanNome.split(/\s+/).filter(part => part.length > 0);
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
      if (!telefone.trim() && !email.trim()) {
        setError("Por favor, preencha pelo menos um meio de contato (WhatsApp ou E-mail).");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (telefone.trim()) {
        if (!isValidBrPhoneDigits(telefone)) {
          setError("Por favor, insira um WhatsApp/Telefone válido com DDD (fixo ou celular).");
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }
      }
      if (email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
          setError("Por favor, insira um e-mail válido.");
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }
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
            setError("Por favor, insira um link ou URL válido para o seu portfólio (ex: https://instagram.com/seu_perfil).");
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
          }
        } catch (e) {
          setError("Por favor, insira um link ou URL válido para o seu portfólio (ex: https://instagram.com/seu_perfil).");
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
    const nameParts = cleanNome.split(/\s+/).filter(part => part.length > 0);
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
    if (!telefone.trim() && !email.trim()) {
      setError("Por favor, preencha pelo menos um contato (WhatsApp ou E-mail) para podermos retornar.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (telefone.trim()) {
      if (!isValidBrPhoneDigits(telefone)) {
        setError("Por favor, insira um WhatsApp/Telefone válido com DDD (fixo ou celular).");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }
    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setError("Por favor, insira um e-mail válido.");
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
      } catch (e) {
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

  if (success) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-6 partner-container">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 shadow-sm text-center py-12 px-6 space-y-8 animate-in fade-in duration-500 partner-card flex flex-col items-center">
          <div className="inline-flex p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-full mx-auto">
            <CheckCircle className="h-14 w-14 animate-bounce" />
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Cadastro enviado!
            </h2>
            <p className="text-sm text-slate-500 font-medium max-w-sm mx-auto leading-relaxed">
              Obrigado pelo interesse em fazer parceria com a Móveis Unghero.
              Nossa equipe analisará seu perfil e entrará em contato em breve para alinharmos os detalhes.
            </p>
          </div>

          <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl w-full max-w-sm mx-auto space-y-3.5 shadow-inner">
            <p className="text-xs font-bold text-slate-800 uppercase tracking-widest text-center">Canais Oficiais</p>
            <div className="grid grid-cols-2 gap-3 text-center">
              <a 
                href="https://www.instagram.com/moveisunghero/" 
                target="_blank" 
                rel="noreferrer" 
                className="flex flex-col items-center justify-center p-4 aspect-square bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 transition-all gap-2 shadow-sm hover:scale-[1.02] cursor-pointer"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-pink-600 shrink-0">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
                <span>Instagram</span>
              </a>
              <a 
                href="https://wa.me/5554999971050" 
                target="_blank" 
                rel="noreferrer" 
                className="flex flex-col items-center justify-center p-4 aspect-square bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 transition-all gap-2 shadow-sm hover:scale-[1.02] cursor-pointer"
              >
                <Smartphone className="h-6 w-6 text-emerald-600 shrink-0" />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full partner-container">
      <form
        onSubmit={handleSubmit}
        onKeyDown={handleFormKeyDown}
        className="bg-white border border-slate-200/80 rounded-2xl shadow-sm transition-all duration-300 partner-card text-slate-800 overflow-hidden"
      >
        <FormProgressBar
          step={step}
          totalSteps={TOTAL_STEPS}
          tone="amber"
          stepLabel={`Etapa ${step} de ${TOTAL_STEPS} · ${STEP_LABELS[step - 1]}`}
          className="border-b border-slate-100 bg-slate-50/50"
        />

        <div className="p-6 md:p-8">
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2.5 animate-in slide-in-from-top-4 duration-300">
            <AlertTriangle className="h-4.5 w-4.5 text-rose-600 shrink-0" />
            <span className="flex-1 text-left">{error}</span>
            <button 
              type="button" 
              onClick={() => setError(null)} 
              className="text-rose-450 hover:text-rose-600 font-extrabold text-sm ml-1 cursor-pointer leading-none"
            >
              ×
            </button>
          </div>
        )}

        {/* PASSO 1: ESPECIALIDADE PROFISSIONAL */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-1.5">
              <h2 className="text-lg font-black text-slate-900 leading-tight">Qual a sua especialidade profissional?</h2>
              <p className="text-xs text-slate-500 font-semibold font-medium">Selecione sua principal área de atuação para personalizarmos a parceria.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PARTNER_SIGNUP_TYPES.map((t) => {
                const isSelected = tipo === t;
                const style = PARTNER_TYPE_STYLES[t];
                const Icon = style.icon;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleSelectTipo(t)}
                    className={`p-4 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[110px] gap-2.5 ${
                      isSelected 
                        ? "border-primary bg-primary text-primary-foreground font-bold shadow-sm" 
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-350"
                    }`}
                  >
                    <span className={`p-2.5 rounded-xl transition-all ${
                      isSelected ? "bg-white/15 text-white" : `${style.bg} ${style.text}`
                    }`}>
                      <Icon className="h-5 w-5 shrink-0" />
                    </span>
                    <span className="text-xs font-bold leading-tight">{style.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                key="btn-next-step1"
                type="button"
                onClick={nextStep}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg shadow-sm cursor-pointer transition-all"
              >
                Continuar <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* PASSO 2: IDENTIFICAÇÃO E ATUAÇÃO */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-1.5">
              <h2 className="text-lg font-black text-slate-900 leading-tight">Quem é você e onde atua?</h2>
              <p className="text-xs text-slate-500 font-semibold font-medium">Queremos conhecer você e seu escritório de projetos.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-slate-400 shrink-0" /> Nome Completo *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Seu nome completo"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full border border-slate-200 bg-white rounded-xl text-xs p-3.5 focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 font-semibold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-slate-400 shrink-0" /> Escritório / Studio (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Nome do seu studio de design/arquitetura"
                    value={escritorio}
                    onChange={(e) => setEscritorio(e.target.value)}
                    className="w-full border border-slate-200 bg-white rounded-xl text-xs p-3.5 focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 font-semibold text-slate-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" /> Cidade de atuação principal *
                  </label>
                  <select
                    required
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    className="w-full border border-slate-200 bg-white rounded-xl text-xs p-3.5 focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 font-semibold text-slate-900 cursor-pointer"
                  >
                    <option value="" className="text-slate-400">Selecione...</option>
                    {CIDADES_SERRA_GAUCHA.map((c) => (
                      <option key={c} value={c} className="text-slate-900 font-semibold">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Registro do Conselho de Classe (CAU, CREA, etc.) */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100 mt-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  {tipo === "ARQUITETO" ? "Registro CAU *" : tipo === "ENGENHEIRO" ? "Registro CREA *" : "Registro Profissional / Conselho de Classe (CAU, CREA, ABD) (Opcional)"}
                </label>
                <input
                  type="text"
                  placeholder={tipo === "ARQUITETO" ? "Ex: A123456-7" : tipo === "ENGENHEIRO" ? "Ex: 123.456-D" : "Ex: CAU, CREA ou ABD (se houver)"}
                  value={registroProfissional}
                  onChange={(e) => setRegistroProfissional(e.target.value)}
                  className="w-full border border-slate-200 bg-white rounded-xl text-xs p-3.5 focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 font-semibold text-slate-900"
                  required={tipo === "ARQUITETO" || tipo === "ENGENHEIRO"}
                />
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button
                key="btn-back-step2"
                type="button"
                onClick={prevStep}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 cursor-pointer transition-all"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar
              </button>
              <button
                key="btn-next-step2"
                type="button"
                onClick={nextStep}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg shadow-sm cursor-pointer transition-all"
              >
                Continuar <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* PASSO 3: CONTATOS */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-1.5 text-center">
              <h2 className="text-lg font-black text-slate-900 leading-tight">Como podemos falar com você?</h2>
              <p className="text-xs text-slate-500 font-semibold font-medium">Informe seus contatos comerciais para retornarmos.</p>
            </div>

            <div className="space-y-4 border border-slate-100 rounded-xl p-5 bg-slate-50/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Smartphone className="h-3.5 w-3.5 text-slate-400 shrink-0" /> WhatsApp / Telefone *
                  </label>
                  <input
                    required
                    type="tel"
                    placeholder={PHONE_PLACEHOLDER}
                    value={telefone}
                    onChange={handleTelefoneChange}
                    className="w-full border border-slate-200 bg-white rounded-xl text-xs p-3.5 focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 font-semibold text-slate-900"
                  />
                  <p className="text-[10px] text-slate-400">Celular ou fixo com DDD</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" /> E-mail comercial *
                  </label>
                  <input
                    required
                    type="email"
                    placeholder="arquiteto@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-slate-200 bg-white rounded-xl text-xs p-3.5 focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 font-semibold text-slate-900"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button
                key="btn-back-step3"
                type="button"
                onClick={prevStep}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 cursor-pointer transition-all"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar
              </button>
              <button
                key="btn-next-step3"
                type="button"
                onClick={nextStep}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg shadow-sm cursor-pointer transition-all"
              >
                Continuar <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* PASSO 4: PRESENÇA DIGITAL E PORTFÓLIO */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-1.5">
              <h2 className="text-lg font-black text-slate-900 leading-tight">Seu Portfólio ou Perfil Digital</h2>
              <p className="text-xs text-slate-500 font-semibold font-medium">Compartilhe um link para podermos conhecer um pouco mais de seus trabalhos e projetos.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <LinkIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" /> Instagram Profissional ou Site/Behance
                </label>
                <input
                  type="url"
                  placeholder="https://instagram.com/seu_perfil ou portfolio"
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  className="w-full border border-slate-200 bg-white rounded-xl text-xs p-3.5 focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 font-semibold text-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button
                key="btn-back-step4"
                type="button"
                onClick={prevStep}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 cursor-pointer transition-all"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar
              </button>
              <button
                key="btn-next-step4"
                type="button"
                onClick={nextStep}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg shadow-sm cursor-pointer transition-all"
              >
                Continuar <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* PASSO 5: EXPECTATIVAS E OBSERVAÇÕES */}
        {step === 5 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-1.5">
              <h2 className="text-lg font-black text-slate-900 leading-tight">Sobre a Parceria</h2>
              <p className="text-xs text-slate-500 font-semibold font-medium">Conte-nos um pouco sobre suas expectativas e como nos conheceu.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Handshake className="h-3.5 w-3.5 text-slate-400 shrink-0" /> Como podemos atuar juntos? (Opcional)
                </label>
                <textarea
                  placeholder="Ex: Gostaria de saber mais sobre as políticas de indicação e RT para designers, ou como enviar projetos técnicos."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={4}
                  className="w-full border border-slate-200 bg-white rounded-xl text-xs p-3.5 focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 font-semibold resize-none text-slate-900"
                />
              </div>

              <div className="space-y-2.5">
                <label className="text-xs font-bold text-slate-700">Como conheceu nossa empresa? *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PARTNER_ORIGEM_OPTIONS.map((option) => {
                    const selected = origem === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setOrigem(option)}
                        className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left text-xs font-bold transition-all cursor-pointer ${
                          selected
                            ? "border-amber-500 bg-amber-50 text-amber-900"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                            selected ? "border-amber-600 bg-amber-600" : "border-slate-300 bg-white"
                          }`}
                          aria-hidden
                        >
                          {selected ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                        </span>
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button
                key="btn-back-step5"
                type="button"
                onClick={prevStep}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 cursor-pointer transition-all"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar
              </button>
              <button
                key="btn-submit-partner"
                type="submit"
                disabled={loading || !submitUnlocked}
                title={!submitUnlocked ? "Aguarde um instante para enviar" : undefined}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg shadow-md cursor-pointer transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : !submitUnlocked ? (
                  "Aguarde..."
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Enviar Cadastro
                  </>
                )}
              </button>
            </div>
          </div>
        )}
        </div>
      </form>
    </div>
  );
}
