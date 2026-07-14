"use client";

import React, { useMemo, useState } from "react";
import {
  User,
  Building2,
  MapPin,
  Home as HomeIcon,
  FileText,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertTriangle,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { formatPhoneInput, PHONE_PLACEHOLDER } from "@/lib/phone";
import { labelOrigin, labelStatus } from "@/lib/navLabels";
import type { TipoPessoa } from "@/lib/clientDocument";
import type { Origin } from "@/app/actions/kanban";

export interface ClientWizardData {
  tipo_pessoa: TipoPessoa;
  documento: string;
  nome: string;
  email: string;
  telefone: string;
  cep: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  tipo_imovel: string;
  origem: Origin;
  status: string;
  observacoes: string;
  obs_imovel: string;
  obs_entrega: string;
}

interface ClientWizardProps {
  mode: "create" | "edit";
  initial?: Partial<ClientWizardData>;
  onCancel: () => void;
  onSubmit: (data: ClientWizardData) => Promise<{ success: boolean; error?: string }>;
}

const ORIGINS: Origin[] = [
  "SITE",
  "INSTAGRAM",
  "INDICACAO",
  "GOOGLE",
  "WHATSAPP",
  "FACEBOOK",
  "FORMULARIO",
];
const STATUS_OPTIONS = ["LEAD", "EM_CONTATO", "NEGOCIACAO", "APROVADO", "INATIVO"];
const TIPO_IMOVEL_OPTIONS = [
  { value: "CASA", label: "Casa Residencial" },
  { value: "APARTAMENTO", label: "Apartamento" },
  { value: "COMERCIAL", label: "Comercial / Escritório" },
  { value: "SOBRADO", label: "Sobrado / Triplex" },
  { value: "OUTRO", label: "Outro" },
];

const DEFAULTS: ClientWizardData = {
  tipo_pessoa: "PF",
  documento: "",
  nome: "",
  email: "",
  telefone: "",
  cep: "",
  endereco: "",
  numero: "",
  bairro: "",
  cidade: "",
  uf: "",
  tipo_imovel: "CASA",
  origem: "INSTAGRAM",
  status: "LEAD",
  observacoes: "",
  obs_imovel: "",
  obs_entrega: "",
};

const STEPS = [
  { title: "Tipo de cliente", subtitle: "Identificação do cadastro." },
  { title: "Contato", subtitle: "Nome e formas de contato." },
  { title: "Endereço", subtitle: "Localização e entrega." },
  { title: "Imóvel & Comercial", subtitle: "Perfil do imóvel e origem." },
  { title: "Observações", subtitle: "Notas finais do cadastro." },
];

const inputClass =
  "w-full border border-slate-200 bg-white rounded-xl text-xs p-3.5 focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 font-semibold text-slate-900";
const labelClass = "text-xs font-bold text-slate-700 flex items-center gap-1";

export default function ClientWizard({ mode, initial, onCancel, onSubmit }: ClientWizardProps) {
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cnpjLoading, setCnpjLoading] = useState(false);

  const [data, setData] = useState<ClientWizardData>(() => ({
    ...DEFAULTS,
    ...initial,
  }));

  const set = <K extends keyof ClientWizardData>(key: K, value: ClientWizardData[K]) =>
    setData((prev) => ({ ...prev, [key]: value }));

  const progressPercent = useMemo(
    () => Math.round(((step - 1) / (STEPS.length - 1)) * 100),
    [step]
  );

  async function fetchAddressByCep(cepValue: string) {
    const cleanCep = cepValue.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const json = await res.json();
      if (!json.erro) {
        setData((prev) => ({
          ...prev,
          endereco: json.logradouro || prev.endereco,
          bairro: json.bairro || prev.bairro,
          cidade: json.localidade || prev.cidade,
          uf: json.uf || prev.uf,
        }));
      }
    } catch (err) {
      console.error("Erro ao buscar CEP:", err);
    }
  }

  async function fetchCompanyByCnpj(cnpjValue: string) {
    const cleanCnpj = cnpjValue.replace(/\D/g, "");
    if (cleanCnpj.length !== 14) return;
    setCnpjLoading(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
      const json = await res.json();
      if (json && !json.message) {
        setData((prev) => ({
          ...prev,
          nome: json.nome_fantasia || json.razao_social || prev.nome,
          email: json.email || prev.email,
          cep: json.cep || prev.cep,
          endereco: json.logradouro || prev.endereco,
          numero: json.numero || prev.numero,
          bairro: json.bairro || prev.bairro,
          cidade: json.municipio || prev.cidade,
          uf: json.uf || prev.uf,
        }));
        if (json.cep) fetchAddressByCep(json.cep);
      }
    } catch (err) {
      console.error("Erro ao buscar CNPJ:", err);
    } finally {
      setCnpjLoading(false);
    }
  }

  function goNext() {
    setError(null);
    if (step === 2 && (!data.nome.trim() || !data.telefone.trim())) {
      setError("Preencha o nome e o telefone/WhatsApp do cliente.");
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length));
  }

  function goPrev() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!data.nome.trim() || !data.telefone.trim()) {
      setError("Preencha o nome e o telefone/WhatsApp do cliente.");
      setStep(2);
      return;
    }
    setLoading(true);
    const res = await onSubmit(data);
    setLoading(false);
    if (!res.success) {
      setError(res.error || "Não foi possível salvar o cliente.");
    }
  }

  return (
    <div className="pr-6">
      {/* Cabeçalho + progresso */}
      <div className="mb-5 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-foreground">
              {mode === "create" ? "Novo Cliente" : "Editar Cliente"}
            </h3>
            <p className="text-xs text-muted-foreground">
              Passo {step} de {STEPS.length} — {STEPS[step - 1].subtitle}
            </p>
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${
              data.tipo_pessoa === "PF"
                ? "bg-blue-500/10 text-blue-600"
                : "bg-purple-500/10 text-purple-600"
            }`}
          >
            {data.tipo_pessoa === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
          <span className="flex-1">{STEPS[step - 1].title}</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-rose-450 hover:text-rose-600 font-extrabold text-sm cursor-pointer leading-none"
            >
              ×
            </button>
          </div>
        )}

        {/* PASSO 1: TIPO + DOCUMENTO */}
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(["PF", "PJ"] as TipoPessoa[]).map((tipo) => {
                const selected = data.tipo_pessoa === tipo;
                return (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => set("tipo_pessoa", tipo)}
                    className={`text-left rounded-2xl border p-4 transition-all cursor-pointer ${
                      selected
                        ? "border-primary ring-1 ring-primary bg-primary/5"
                        : "border-slate-200 bg-white hover:border-slate-350"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2.5 rounded-xl ${
                          tipo === "PF"
                            ? "bg-blue-500/10 text-blue-600"
                            : "bg-purple-500/10 text-purple-600"
                        }`}
                      >
                        {tipo === "PF" ? (
                          <User className="h-5 w-5" />
                        ) : (
                          <Building2 className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">
                          {tipo === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}
                        </p>
                        <p className="text-[11px] font-semibold text-muted-foreground">
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
                {data.tipo_pessoa === "PJ" ? "CNPJ da Empresa" : "CPF do Cliente"}
                <span
                  title={
                    data.tipo_pessoa === "PJ"
                      ? "Digite o CNPJ para preencher os dados automaticamente."
                      : "Insira o CPF para identificação e contratos."
                  }
                >
                  <HelpCircle className="h-3.5 w-3.5 text-slate-400 cursor-help" />
                </span>
                {cnpjLoading && <Loader2 className="h-3.5 w-3.5 text-slate-400 animate-spin" />}
              </label>
              <input
                type="text"
                value={data.documento}
                onChange={(e) => {
                  const val = e.target.value;
                  set("documento", val);
                  if (data.tipo_pessoa === "PJ") fetchCompanyByCnpj(val);
                }}
                placeholder={data.tipo_pessoa === "PJ" ? "00.000.000/0001-00" : "000.000.000-00"}
                className={inputClass}
              />
            </div>
          </div>
        )}

        {/* PASSO 2: CONTATO */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="space-y-1.5">
              <label className={labelClass}>
                <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                {data.tipo_pessoa === "PF" ? "Nome Completo" : "Razão Social / Nome Fantasia"} *
              </label>
              <input
                type="text"
                value={data.nome}
                onChange={(e) => set("nome", e.target.value)}
                placeholder={data.tipo_pessoa === "PF" ? "Ex: João da Silva" : "Ex: Marcenaria Alfa Ltda"}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={labelClass}>Telefone / WhatsApp *</label>
                <input
                  type="tel"
                  placeholder={PHONE_PLACEHOLDER}
                  value={data.telefone}
                  onChange={(e) => set("telefone", formatPhoneInput(e.target.value))}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>E-mail</label>
                <input
                  type="email"
                  placeholder="cliente@exemplo.com"
                  value={data.email}
                  onChange={(e) => set("email", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        )}

        {/* PASSO 3: ENDEREÇO */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className={labelClass}>
                  CEP
                  <span title="Preenche o endereço automaticamente.">
                    <HelpCircle className="h-3.5 w-3.5 text-slate-400 cursor-help" />
                  </span>
                </label>
                <input
                  type="text"
                  value={data.cep}
                  onChange={(e) => {
                    const val = e.target.value;
                    set("cep", val);
                    fetchAddressByCep(val);
                  }}
                  placeholder="00000-000"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className={labelClass}>Rua / Logradouro</label>
                <input
                  type="text"
                  value={data.endereco}
                  onChange={(e) => set("endereco", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className={labelClass}>Número</label>
                <input
                  type="text"
                  value={data.numero}
                  onChange={(e) => set("numero", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className={labelClass}>Bairro</label>
                <input
                  type="text"
                  value={data.bairro}
                  onChange={(e) => set("bairro", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label className={labelClass}>Cidade</label>
                <input
                  type="text"
                  value={data.cidade}
                  onChange={(e) => set("cidade", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>UF</label>
                <input
                  type="text"
                  maxLength={2}
                  value={data.uf}
                  onChange={(e) => set("uf", e.target.value.toUpperCase())}
                  className={`${inputClass} uppercase`}
                />
              </div>
            </div>
          </div>
        )}

        {/* PASSO 4: IMÓVEL & COMERCIAL */}
        {step === 4 && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="space-y-1.5">
              <label className={labelClass}>
                <HomeIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" /> Tipo de Imóvel
              </label>
              <select
                value={data.tipo_imovel}
                onChange={(e) => set("tipo_imovel", e.target.value)}
                className={`${inputClass} cursor-pointer`}
              >
                {TIPO_IMOVEL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={labelClass}>
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" /> Origem
                </label>
                <select
                  value={data.origem}
                  onChange={(e) => set("origem", e.target.value as Origin)}
                  className={`${inputClass} cursor-pointer`}
                >
                  {ORIGINS.map((o) => (
                    <option key={o} value={o}>
                      {labelOrigin(o)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Status</label>
                <select
                  value={data.status}
                  onChange={(e) => set("status", e.target.value)}
                  className={`${inputClass} cursor-pointer`}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {labelStatus(s)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* PASSO 5: OBSERVAÇÕES */}
        {step === 5 && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="space-y-1.5">
              <label className={labelClass}>
                <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" /> Observações Gerais / Briefing
                <span title="Móveis que o cliente procura, estilo, preferências de cores.">
                  <HelpCircle className="h-3.5 w-3.5 text-slate-400 cursor-help" />
                </span>
              </label>
              <textarea
                value={data.observacoes}
                onChange={(e) => set("observacoes", e.target.value)}
                rows={3}
                className={`${inputClass} resize-y`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={labelClass}>Observações da Obra / Imóvel</label>
                <textarea
                  value={data.obs_imovel}
                  onChange={(e) => set("obs_imovel", e.target.value)}
                  rows={2}
                  className={`${inputClass} resize-y`}
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Observações na Entrega</label>
                <textarea
                  value={data.obs_entrega}
                  onChange={(e) => set("obs_entrega", e.target.value)}
                  rows={2}
                  className={`${inputClass} resize-y`}
                />
              </div>
            </div>
          </div>
        )}

        {/* Navegação */}
        <div className="flex items-center justify-between gap-3 pt-6 mt-2 border-t border-slate-100">
          {step > 1 ? (
            <button
              type="button"
              onClick={goPrev}
              className="flex items-center gap-1.5 px-4 py-2.5 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 cursor-pointer transition-all"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
          ) : (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 cursor-pointer transition-all"
            >
              Cancelar
            </button>
          )}

          {step < STEPS.length ? (
            <button
              type="button"
              onClick={goNext}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg shadow-sm cursor-pointer transition-all"
            >
              Continuar <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[hsl(28_85%_45%)] hover:bg-[hsl(28_85%_40%)] text-white text-xs font-black rounded-lg shadow-sm cursor-pointer transition-all disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {mode === "create" ? "Cadastrar Cliente" : "Salvar Alterações"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
