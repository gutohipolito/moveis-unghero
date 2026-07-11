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
  Handshake
} from "lucide-react";
import { submitPublicPartnerSignupAction } from "@/app/actions/partnerSignup";
import { PARTNER_TYPE_LABELS, PARTNER_TYPES, PARTNER_TYPE_STYLES } from "@/lib/partnerTypes";

export default function PartnerSignupForm({ companyId }: { companyId?: string }) {
  const [step, setStep] = useState(1);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<PartnerType>("PROJETISTA");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [cidade, setCidade] = useState("");
  const [escritorio, setEscritorio] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Carregar rascunho do localStorage na montagem (client-side)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("moveis_unghero_partner_draft");
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
      };
      localStorage.setItem("moveis_unghero_partner_draft", JSON.stringify(draft));
    }
  }, [isLoaded, step, nome, tipo, telefone, email, cidade, escritorio, portfolioUrl, observacoes]);

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    
    if (value.length > 6) {
      value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else if (value.length > 0) {
      value = `(${value}`;
    }
    setTelefone(value);
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
      if (!nome.trim()) {
        setError("Por favor, preencha seu nome completo profissional.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (nome.trim().length < 3) {
        setError("Por favor, informe seu nome completo.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (!cidade.trim()) {
        setError("Por favor, informe sua cidade de atuação.");
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
      if (email.trim() && !email.includes("@")) {
        setError("Por favor, insira um e-mail válido.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
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

    if (!nome.trim() || nome.trim().length < 3) {
      setError("Por favor, preencha seu nome completo profissional.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!telefone.trim() && !email.trim()) {
      setError("Por favor, preencha pelo menos um contato (WhatsApp ou E-mail) para podermos retornar.");
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
      observacoes,
      company_id: companyId,
    });

    setLoading(false);

    if (res.success) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("moveis_unghero_partner_draft");
      }
      setSuccess(true);
      return;
    }

    setError(res.error ?? "Não foi possível enviar o cadastro.");
  }

  // Barra de progresso dinâmica baseada em 5 etapas
  const progressPercent = Math.round(((step - 1) / 4) * 100);

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

          <div className="p-6 bg-slate-50 border border-slate-200/80 rounded-2xl w-full max-w-sm mx-auto space-y-4 shadow-inner">
            <p className="text-xs font-bold text-slate-800 uppercase tracking-widest text-center">Canais Oficiais</p>
            <div className="grid grid-cols-1 gap-2 text-left">
              <a 
                href="https://www.instagram.com/moveisunghero/" 
                target="_blank" 
                rel="noreferrer" 
                className="flex items-center gap-3 p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5 text-pink-600 shrink-0">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
                Instagram da Unghero
              </a>
              <a 
                href="https://wa.me/5554999971050" 
                target="_blank" 
                rel="noreferrer" 
                className="flex items-center gap-3 p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all"
              >
                <Smartphone className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                WhatsApp de Parcerias
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-6 partner-container">
      {/* Barra de Progresso */}
      <div className="mb-8 space-y-2 partner-progress-wrapper">
        <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
          <span>Seja um Parceiro Unghero</span>
          <span>{progressPercent}% Concluído</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300 ease-out" 
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 shadow-sm transition-all duration-300 partner-card">
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
              <p className="text-xs text-slate-400 font-semibold font-medium">Selecione sua principal área de atuação para personalizarmos a parceria.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PARTNER_TYPES.map((t) => {
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
              <p className="text-xs text-slate-400 font-semibold font-medium">Queremos conhecer você e seu escritório de projetos.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-slate-400 shrink-0" /> Nome profissional *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Seu nome profissional completo"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full border border-slate-200 bg-white rounded-xl text-xs p-3.5 focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 font-semibold"
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
                    className="w-full border border-slate-200 bg-white rounded-xl text-xs p-3.5 focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" /> Cidade de atuação principal *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Ex: Farroupilha - RS"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    className="w-full border border-slate-200 bg-white rounded-xl text-xs p-3.5 focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 font-semibold"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 cursor-pointer transition-all"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar
              </button>
              <button
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
              <p className="text-xs text-slate-400 font-semibold font-medium">Informe seus contatos comerciais para retornarmos.</p>
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
                    placeholder="(54) 99999-9999"
                    value={telefone}
                    onChange={handleTelefoneChange}
                    className="w-full border border-slate-200 bg-white rounded-xl text-xs p-3.5 focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 font-semibold"
                  />
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
                    className="w-full border border-slate-200 bg-white rounded-xl text-xs p-3.5 focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 font-semibold"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 cursor-pointer transition-all"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar
              </button>
              <button
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
              <p className="text-xs text-slate-400 font-semibold font-medium">Compartilhe um link para podermos conhecer um pouco mais de seus trabalhos e projetos.</p>
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
                  className="w-full border border-slate-200 bg-white rounded-xl text-xs p-3.5 focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 font-semibold"
                />
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 cursor-pointer transition-all"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar
              </button>
              <button
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
              <p className="text-xs text-slate-400 font-semibold font-medium">Conte-nos um pouco sobre suas expectativas (indicação de clientes, execução de móveis sob medida, RT, etc.) ou observações adicionais.</p>
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
                  className="w-full border border-slate-200 bg-white rounded-xl text-xs p-3.5 focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 font-semibold resize-none"
                />
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={prevStep}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 cursor-pointer transition-all"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg shadow-md cursor-pointer transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
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
      </form>
    </div>
  );
}
