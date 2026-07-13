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

const TIPO_IMOVEL_OPTIONS = [
  { value: "CASA", label: "Casa Residencial" },
  { value: "APARTAMENTO", label: "Apartamento" },
  { value: "COMERCIAL", label: "Comercial / Escritório" },
  { value: "SOBRADO", label: "Sobrado / Triplex" },
  { value: "OUTRO", label: "Outro" },
];

const TOTAL_STEPS = 4;
const inputClass =
  "w-full border border-slate-200 bg-white rounded-xl text-xs p-3.5 focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 font-semibold text-slate-900";
const labelClass = "text-xs font-bold text-slate-700 flex items-center gap-1.5";

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

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Carrega rascunho
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("moveis_unghero_cliente_draft");
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
        "moveis_unghero_cliente_draft",
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
  ]);

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
    if (!nome.trim() || !telefone.trim()) {
      setError("Por favor, preencha seu nome e telefone/WhatsApp.");
      setStep(2);
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
      observacoes,
      company_id: companyId,
    });
    setLoading(false);

    if (res.success) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("moveis_unghero_cliente_draft");
      }
      setSuccess(true);
      return;
    }
    setError(res.error ?? "Não foi possível enviar o cadastro.");
    scrollTop();
  }

  const progressPercent = Math.round(((step - 1) / (TOTAL_STEPS - 1)) * 100);

  if (success) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-6">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 shadow-sm text-center py-12 space-y-8 animate-in fade-in duration-500 flex flex-col items-center">
          <div className="inline-flex p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-full mx-auto">
            <CheckCircle className="h-14 w-14 animate-bounce" />
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Cadastro enviado!</h2>
            <p className="text-sm text-slate-500 font-medium max-w-sm mx-auto leading-relaxed">
              Recebemos seus dados. Nossa equipe já pode dar sequência ao seu atendimento e entrará em
              contato em breve.
            </p>
          </div>

          <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl w-full max-w-sm mx-auto space-y-3.5 shadow-inner">
            <p className="text-xs font-bold text-slate-800 uppercase tracking-widest text-center">
              Canais Oficiais
            </p>
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
    <div className="max-w-2xl mx-auto px-6 py-6">
      {/* Barra de Progresso */}
      <div className="mb-8 space-y-2">
        <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
          <span>Cadastro de Cliente</span>
          <span>{progressPercent}% Concluído</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 shadow-sm transition-all duration-300"
      >
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

        {/* PASSO 1: TIPO + DOCUMENTO */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-1.5">
              <h2 className="text-lg font-black text-slate-900 leading-tight">Como é o seu cadastro?</h2>
              <p className="text-xs text-slate-400 font-semibold">
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
                        ? "border-primary ring-1 ring-primary bg-primary/5"
                        : "border-slate-200 bg-white hover:border-slate-350"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`p-2.5 rounded-xl ${
                          tipo === "PF" ? "bg-blue-500/10 text-blue-600" : "bg-purple-500/10 text-purple-600"
                        }`}
                      >
                        {tipo === "PF" ? <User className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {tipo === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}
                        </p>
                        <p className="text-[11px] font-semibold text-slate-400">
                          {tipo === "PF" ? "PF — CPF" : "PJ — CNPJ"}
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
              <h2 className="text-lg font-black text-slate-900 leading-tight">Seus dados de contato</h2>
              <p className="text-xs text-slate-400 font-semibold">Precisamos do nome e do WhatsApp para falar com você.</p>
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
                  placeholder={tipoPessoa === "PF" ? "Ex: João da Silva" : "Ex: Marcenaria Alfa Ltda"}
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
                    placeholder="(54) 99999-9999"
                    value={telefone}
                    onChange={handleTelefoneChange}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>
                    <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" /> E-mail (Opcional)
                  </label>
                  <input
                    type="email"
                    placeholder="voce@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
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

        {/* PASSO 3: ENDEREÇO */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-1.5">
              <h2 className="text-lg font-black text-slate-900 leading-tight">Endereço (Opcional)</h2>
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
                    placeholder="00000-000"
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

        {/* PASSO 4: IMÓVEL + OBSERVAÇÕES */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-1.5">
              <h2 className="text-lg font-black text-slate-900 leading-tight">Sobre o seu projeto</h2>
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
                  className={`${inputClass} cursor-pointer`}
                >
                  {TIPO_IMOVEL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
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
                  placeholder="Conte o que você procura: ambientes, estilo, prazos, preferências..."
                  className={`${inputClass} resize-none`}
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
                    <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" /> Enviar Cadastro
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
