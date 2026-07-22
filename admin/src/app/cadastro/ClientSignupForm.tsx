"use client";

import React, { useEffect, useState } from "react";
import {
  User,
  Building2,
  MapPin,
  Home as HomeIcon,
  Smartphone,
  Mail,
  FileText,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Send,
} from "lucide-react";
import { submitPublicClientSignupAction } from "@/app/actions/clientSignup";
import type { TipoPessoa } from "@/lib/clientDocument";
import { formatPhoneInput, PHONE_PLACEHOLDER } from "@/lib/phone";
import { preventEnterSubmit, useSubmitUnlock } from "@/hooks/useSubmitUnlock";
import FormProgressBar from "@/components/forms/FormProgressBar";

const TIPO_IMOVEL_OPTIONS = [
  { value: "CASA", label: "Casa Residencial" },
  { value: "APARTAMENTO", label: "Apartamento" },
  { value: "COMERCIAL", label: "Comercial / Escritório" },
  { value: "SOBRADO", label: "Sobrado / Triplex" },
  { value: "OUTRO", label: "Outro" },
];

const TOTAL_STEPS = 4;
const STEP_LABELS = ["Identidade", "Contato", "Endereço", "Imóvel"] as const;
const inputClass =
  "w-full border border-slate-800 bg-slate-950/60 rounded-xl text-xs p-3.5 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-semibold text-slate-100 placeholder-slate-500 transition-all";
const labelClass = "text-xs font-bold text-slate-300 flex items-center gap-1.5";

export default function ClientSignupForm({ companyId }: { companyId?: string }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const [tipoPessoa, setTipoPessoa] = useState<TipoPessoa>("PF");
  const [documento, setDocumento] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [tipoImovel, setTipoImovel] = useState("CASA");
  const [observacoes, setObservacoes] = useState("");
  const [aceitaTermos, setAceitaTermos] = useState(false);
  const [aceitaMarketing, setAceitaMarketing] = useState(false);
  const submitUnlocked = useSubmitUnlock(step === TOTAL_STEPS);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Carrega rascunho
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("moveis_unghero_cliente_draft");
      const saved = localStorage.getItem("moveis_unghero_cliente_draft_v2");
      if (saved) {
        try {
          const d = JSON.parse(saved);
          if (d.step) setStep(d.step);
          if (d.tipoPessoa) setTipoPessoa(d.tipoPessoa);
          if (d.documento) setDocumento(d.documento);
          if (d.nome) setNome(d.nome);
          if (d.telefone) setTelefone(d.telefone);
          if (d.email) setEmail(d.email);
          if (d.cep) setCep(d.cep);
          if (d.endereco) setEndereco(d.endereco);
          if (d.numero) setNumero(d.numero);
          if (d.bairro) setBairro(d.bairro);
          if (d.cidade) setCidade(d.cidade);
          if (d.uf) setUf(d.uf);
          if (d.tipoImovel) setTipoImovel(d.tipoImovel);
          if (d.observacoes) setObservacoes(d.observacoes);
          if (d.aceitaTermos !== undefined) setAceitaTermos(d.aceitaTermos);
          if (d.aceitaMarketing !== undefined) setAceitaMarketing(d.aceitaMarketing);
        } catch (e) {
          console.error("Erro ao recuperar rascunho de cliente:", e);
        }
      }
      setIsLoaded(true);
    }
  }, []);

  // Salva rascunho
  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      localStorage.setItem(
        "moveis_unghero_cliente_draft_v2",
        JSON.stringify({
          step,
          tipoPessoa,
          documento,
          nome,
          telefone,
          email,
          cep,
          endereco,
          numero,
          bairro,
          cidade,
          uf,
          tipoImovel,
          observacoes,
          aceitaTermos,
          aceitaMarketing,
        })
      );
    }
  }, [
    isLoaded,
    step,
    tipoPessoa,
    documento,
    nome,
    telefone,
    email,
    cep,
    endereco,
    numero,
    bairro,
    cidade,
    uf,
    tipoImovel,
    observacoes,
    aceitaTermos,
    aceitaMarketing,
  ]);

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTelefone(formatPhoneInput(e.target.value));
  };

  async function fetchAddressByCep(cepValue: string) {
    const clean = cepValue.replace(/\D/g, "");
    if (clean.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const json = await res.json();
      if (!json.erro) {
        setEndereco((prev) => json.logradouro || prev);
        setBairro((prev) => json.bairro || prev);
        setCidade((prev) => json.localidade || prev);
        setUf((prev) => json.uf || prev);
      }
    } catch (err) {
      console.error("Erro ao buscar CEP:", err);
    }
  }

  async function fetchCompanyByCnpj(cnpjValue: string) {
    const clean = cnpjValue.replace(/\D/g, "");
    if (clean.length !== 14) return;
    setCnpjLoading(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`);
      const json = await res.json();
      if (json && !json.message) {
        setNome((prev) => json.nome_fantasia || json.razao_social || prev);
        setEmail((prev) => json.email || prev);
        setCep((prev) => json.cep || prev);
        setEndereco((prev) => json.logradouro || prev);
        setNumero((prev) => json.numero || prev);
        setBairro((prev) => json.bairro || prev);
        setCidade((prev) => json.municipio || prev);
        setUf((prev) => json.uf || prev);
      }
    } catch (err) {
      console.error("Erro ao buscar CNPJ:", err);
    } finally {
      setCnpjLoading(false);
    }
  }

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  function nextStep() {
    setError(null);
    if (step === 2 && (!nome.trim() || !telefone.trim())) {
      setError("Por favor, preencha seu nome e telefone/WhatsApp.");
      scrollTop();
      return;
    }
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
    scrollTop();
  }

  function prevStep() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
    scrollTop();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!submitUnlocked || step !== TOTAL_STEPS) return;
    if (!nome.trim() || !telefone.trim()) {
      setError("Por favor, preencha seu nome e telefone/WhatsApp.");
      setStep(2);
      scrollTop();
      return;
    }
    if (!aceitaTermos) {
      setError("Você precisa aceitar o tratamento de dados de acordo com a LGPD.");
      scrollTop();
      return;
    }

    setLoading(true);

    const res = await submitPublicClientSignupAction({
      tipo_pessoa: tipoPessoa,
      documento,
      nome,
      email,
      telefone,
      cep,
      endereco,
      numero,
      bairro,
      cidade,
      uf,
      tipo_imovel: tipoImovel,
      observacoes: observacoes.trim(),
      company_id: companyId,
      lgpd_aceite: aceitaTermos,
      marketing_aceite: aceitaMarketing,
    });
    setLoading(false);

    if (res.success) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("moveis_unghero_cliente_draft_v2");
        localStorage.removeItem("moveis_unghero_cliente_draft");
      }
      setSuccess(true);
      return;
    }
    setError(res.error ?? "Não foi possível enviar o cadastro.");
    scrollTop();
  }

  const handleFormKeyDown = preventEnterSubmit;

  if (success) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-6 w-full z-10">
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 md:p-8 shadow-2xl text-center py-12 space-y-8 animate-in fade-in duration-500 flex flex-col items-center">
          <div className="inline-flex p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full mx-auto">
            <CheckCircle className="h-14 w-14 animate-bounce" />
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-black text-slate-100 tracking-tight">Cadastro enviado!</h2>
            <p className="text-sm text-slate-400 font-medium max-w-sm mx-auto leading-relaxed">
              Recebemos seus dados. Nossa equipe já pode dar sequência ao seu atendimento e entrará em
              contato em breve.
            </p>
          </div>

          <div className="p-5 bg-slate-950/40 border border-slate-800/80 rounded-2xl w-full max-w-sm mx-auto space-y-3.5 shadow-inner">
            <p className="text-xs font-bold text-slate-300 uppercase tracking-widest text-center">
              Canais Oficiais
            </p>
            <div className="grid grid-cols-2 gap-3 text-center">
              <a
                href="https://www.instagram.com/moveisunghero/"
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center justify-center p-4 aspect-square bg-slate-900/60 hover:bg-slate-850/60 border border-slate-800 rounded-2xl text-xs font-bold text-slate-200 transition-all gap-2 shadow-sm hover:scale-[1.02] cursor-pointer"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-pink-500 shrink-0">
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
                className="flex flex-col items-center justify-center p-4 aspect-square bg-slate-900/60 hover:bg-slate-850/60 border border-slate-800 rounded-2xl text-xs font-bold text-slate-200 transition-all gap-2 shadow-sm hover:scale-[1.02] cursor-pointer"
              >
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-6 w-6 text-emerald-500 shrink-0">
                  <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
                </svg>
                <span>WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full z-10 relative">
      <form
        onSubmit={handleSubmit}
        onKeyDown={handleFormKeyDown}
        className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-2xl transition-all duration-300 overflow-hidden"
      >
        <FormProgressBar
          step={step}
          totalSteps={TOTAL_STEPS}
          tone="primary"
          stepLabel={`Etapa ${step} de ${TOTAL_STEPS} · ${STEP_LABELS[step - 1]}`}
          className="border-b border-slate-800/80 bg-slate-950/40"
        />

        <div className="p-6 md:p-8">
        {error && (
          <div className="mb-6 p-4 bg-rose-950/40 border border-rose-900/60 text-rose-200 text-xs font-bold rounded-xl flex items-center gap-2.5 animate-in slide-in-from-top-4 duration-300">
            <AlertTriangle className="h-4.5 w-4.5 text-rose-500 shrink-0" />
            <span className="flex-1 text-left">{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-rose-400 hover:text-rose-350 font-extrabold text-sm ml-1 cursor-pointer leading-none"
            >
              ×
            </button>
          </div>
        )}

        {/* PASSO 1: TIPO + DOCUMENTO */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-1.5">
              <h2 className="text-lg font-black text-slate-100 leading-tight">Como é o seu cadastro?</h2>
              <p className="text-xs text-slate-400 font-semibold font-medium">
                Escolha pessoa física ou jurídica. Se for empresa, o CNPJ preenche seus dados.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(["PF", "PJ"] as TipoPessoa[]).map((tipo) => {
                const selected = tipoPessoa === tipo;
                return (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => setTipoPessoa(tipo)}
                    className={`text-left rounded-2xl border p-4 transition-all cursor-pointer ${
                      selected
                        ? "border-primary ring-1 ring-primary bg-primary/5 text-slate-100"
                        : "border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/30 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`p-2.5 rounded-xl ${
                          selected
                            ? "bg-primary/15 text-primary border border-primary/25"
                            : "bg-slate-800/40 text-slate-400 border border-slate-800/20"
                        }`}
                      >
                        {tipo === "PF" ? <User className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                      </span>
                      <div>
                        <p className={`text-sm font-bold ${selected ? "text-slate-100" : "text-slate-300"}`}>
                          {tipo === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="space-y-1.5">
              <label className={labelClass}>
                {tipoPessoa === "PJ" ? "CNPJ da Empresa (Opcional)" : "CPF (Opcional)"}
                {cnpjLoading && <Loader2 className="h-3.5 w-3.5 text-slate-400 animate-spin" />}
              </label>
              <input
                type="text"
                value={documento}
                onChange={(e) => {
                  setDocumento(e.target.value);
                  if (tipoPessoa === "PJ") fetchCompanyByCnpj(e.target.value);
                }}
                placeholder={tipoPessoa === "PJ" ? "00.000.000/0001-00" : "000.000.000-00"}
                className={inputClass}
              />
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

        {/* PASSO 2: CONTATO */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-1.5">
              <h2 className="text-lg font-black text-slate-100 leading-tight">Seus dados de contato</h2>
              <p className="text-xs text-slate-400 font-semibold">Precisamos do nome e de um telefone (WhatsApp ou fixo) para falar com você.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className={labelClass}>
                  <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  {tipoPessoa === "PF" ? "Nome completo" : "Razão social / Nome fantasia"} *
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={labelClass}>
                    <Smartphone className="h-3.5 w-3.5 text-slate-400 shrink-0" /> WhatsApp / Telefone *
                  </label>
                  <input
                    type="tel"
                    value={telefone}
                    onChange={handleTelefoneChange}
                    placeholder={PHONE_PLACEHOLDER}
                    className={inputClass}
                  />
                  <p className="text-[10px] text-slate-400">
                    Celular: (xx) xxxxx-xxxx · Fixo: (xx) xxxx-xxxx
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>
                    <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" /> E-mail (Opcional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button
                key="btn-back-step3"
                type="button"
                onClick={prevStep}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-800 text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-800/40 hover:text-white cursor-pointer transition-all"
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

        {/* PASSO 3: ENDEREÇO */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-1.5">
              <h2 className="text-lg font-black text-slate-100 leading-tight">Endereço (Opcional)</h2>
              <p className="text-xs text-slate-400 font-semibold">Informe o CEP para preenchermos o restante automaticamente.</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className={labelClass}>CEP</label>
                  <input
                    type="text"
                    value={cep}
                    onChange={(e) => {
                      setCep(e.target.value);
                      fetchAddressByCep(e.target.value);
                    }}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className={labelClass}>Rua / Logradouro</label>
                  <input type="text" value={endereco} onChange={(e) => setEndereco(e.target.value)} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className={labelClass}>Número</label>
                  <input type="text" value={numero} onChange={(e) => setNumero(e.target.value)} className={inputClass} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className={labelClass}>Bairro</label>
                  <input type="text" value={bairro} onChange={(e) => setBairro(e.target.value)} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className={labelClass}>Cidade</label>
                  <input type="text" value={cidade} onChange={(e) => setCidade(e.target.value)} className={inputClass} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>UF</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={uf}
                    onChange={(e) => setUf(e.target.value.toUpperCase())}
                    className={`${inputClass} uppercase`}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button
                key="btn-back-step4"
                type="button"
                onClick={prevStep}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-800 text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-800/40 hover:text-white cursor-pointer transition-all"
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

        {/* PASSO 4: IMÓVEL + OBSERVAÇÕES */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-1.5">
              <h2 className="text-lg font-black text-slate-100 leading-tight">Sobre o seu projeto</h2>
              <p className="text-xs text-slate-400 font-semibold">Últimos detalhes para conhecermos melhor sua necessidade.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className={labelClass}>
                  <HomeIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" /> Tipo de imóvel
                </label>
                <select
                  value={tipoImovel}
                  onChange={(e) => setTipoImovel(e.target.value)}
                  className={`${inputClass} cursor-pointer bg-slate-950/65 border-slate-800 text-slate-100`}
                >
                  {TIPO_IMOVEL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-slate-900 text-slate-100">
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>
                  <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" /> Observações (Opcional)
                </label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={4}
                  className={`${inputClass} resize-none bg-slate-950/60 text-slate-100 border border-slate-800`}
                />
              </div>

              {/* Questões de LGPD */}
              <div className="space-y-3 pt-3 border-t border-slate-800/40">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={aceitaTermos}
                    onChange={(e) => setAceitaTermos(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-850 bg-slate-950 text-primary focus:ring-primary focus:ring-offset-slate-900 cursor-pointer"
                    required
                  />
                  <span className="text-[11px] font-semibold text-slate-350 leading-relaxed">
                    Estou de acordo com o tratamento de meus dados pessoais para fins de atendimento comercial e orçamento, em conformidade com a LGPD. *
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={aceitaMarketing}
                    onChange={(e) => setAceitaMarketing(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-850 bg-slate-950 text-primary focus:ring-primary focus:ring-offset-slate-900 cursor-pointer"
                  />
                  <span className="text-[11px] font-semibold text-slate-400 leading-relaxed">
                    Aceito receber contatos e novidades da Móveis Unghero via WhatsApp ou e-mail. (Opcional)
                  </span>
                </label>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:justify-between gap-3 pt-2">
              <button
                key="btn-back-step5"
                type="button"
                onClick={prevStep}
                disabled={loading}
                className="flex items-center justify-center gap-1.5 px-4 py-2 border border-slate-800 text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-800/40 hover:text-white cursor-pointer transition-all order-2 sm:order-1"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar
              </button>
              <div className="flex flex-col items-stretch sm:items-end gap-1.5 order-1 sm:order-2">
                <button
                  key="btn-submit-client"
                  type="submit"
                  disabled={loading || !aceitaTermos || !submitUnlocked}
                  title={
                    !aceitaTermos
                      ? "Aceite o tratamento de dados (LGPD) para enviar o cadastro"
                      : !submitUnlocked
                        ? "Aguarde um instante para enviar"
                        : undefined
                  }
                  aria-disabled={loading || !aceitaTermos || !submitUnlocked}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg shadow-md cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none disabled:hover:bg-emerald-600"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
                    </>
                  ) : !submitUnlocked ? (
                    "Aguarde..."
                  ) : (
                    <>
                      <Send className="h-4 w-4" /> Enviar Cadastro
                    </>
                  )}
                </button>
                {!aceitaTermos && !loading ? (
                  <p className="text-[10px] text-amber-400/90 font-semibold text-center sm:text-right leading-snug px-1">
                    Marque o aceite da LGPD para liberar o envio
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        )}
        </div>
      </form>
    </div>
  );
}
