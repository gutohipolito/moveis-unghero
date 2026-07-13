"use client";

import React, { useState } from "react";
import { TipoPessoa } from "@prisma/client";
import { CheckCircle, Loader2, Send, UserPlus } from "lucide-react";
import {
  lookupPublicClientAction,
  submitPublicClientSignupAction,
} from "@/app/actions/clientSignup";
import { formatPhoneDisplay, formatPhoneInput, PHONE_PLACEHOLDER } from "@/lib/phone";

const TIPO_IMOVEL_OPTIONS = [
  { value: "CASA", label: "Casa Residencial" },
  { value: "APARTAMENTO", label: "Apartamento" },
  { value: "COMERCIAL", label: "Comercial / Escritório" },
  { value: "SOBRADO", label: "Sobrado / Triplex" },
  { value: "OUTRO", label: "Outro" },
] as const;

function formatCpfInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length > 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  if (digits.length > 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  if (digits.length > 3) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  }
  return digits;
}

function formatCnpjInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length > 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }
  if (digits.length > 8) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  if (digits.length > 5) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  }
  if (digits.length > 2) {
    return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  }
  return digits;
}

function formatCepInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length > 5) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  return digits;
}

const inputClass =
  "w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";
const labelClass = "text-xs font-bold text-slate-600";
const sectionClass =
  "text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2";

export default function ClientSignupForm({ companyId }: { companyId?: string }) {
  const [tipoPessoa, setTipoPessoa] = useState<TipoPessoa>("PF");
  const [documento, setDocumento] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [tipoImovel, setTipoImovel] = useState("CASA");
  const [obsImovel, setObsImovel] = useState("");
  const [obsEntrega, setObsEntrega] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingCnpj, setFetchingCnpj] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [isUpdate, setIsUpdate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [wasUpdate, setWasUpdate] = useState(false);

  function applyClientData(data: {
    nome: string;
    email: string;
    telefone: string;
    tipo_pessoa: TipoPessoa;
    cpf: string | null;
    cnpj: string | null;
    cep: string | null;
    endereco: string | null;
    numero: string | null;
    bairro: string | null;
    cidade: string;
    uf: string | null;
    tipo_imovel: string | null;
    obs_imovel: string | null;
    obs_entrega: string | null;
  }) {
    setNome(data.nome);
    setEmail(data.email);
    setTelefone(formatPhoneDisplay(data.telefone));
    setCep(data.cep ? formatCepInput(data.cep) : "");
    setEndereco(data.endereco || "");
    setNumero(data.numero || "");
    setBairro(data.bairro || "");
    setCidade(data.cidade);
    setUf(data.uf || "");
    setTipoImovel(data.tipo_imovel || "CASA");
    setObsImovel(data.obs_imovel || "");
    setObsEntrega(data.obs_entrega || "");
  }

  async function lookupExistingClient(tipo: TipoPessoa, docValue: string): Promise<boolean> {
    const digits = docValue.replace(/\D/g, "");
    const isComplete = tipo === "PF" ? digits.length === 11 : digits.length === 14;
    if (!isComplete) {
      setIsUpdate(false);
      return false;
    }

    setLookingUp(true);
    const result = await lookupPublicClientAction({
      tipo_pessoa: tipo,
      cpf: tipo === "PF" ? docValue : undefined,
      cnpj: tipo === "PJ" ? docValue : undefined,
      company_id: companyId,
    });
    setLookingUp(false);

    if (result.found && result.client) {
      applyClientData(result.client);
      setIsUpdate(true);
      return true;
    }

    setIsUpdate(false);
    return false;
  }

  async function fetchAddressByCep(cepValue: string) {
    const cleanCep = cepValue.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setEndereco(data.logradouro || "");
        setBairro(data.bairro || "");
        setCidade(data.localidade || "");
        setUf(data.uf || "");
      }
    } catch (err) {
      console.error("Erro ao buscar CEP:", err);
    }
  }

  async function fetchCompanyByCnpj(cnpjValue: string) {
    const cleanCnpj = cnpjValue.replace(/\D/g, "");
    if (cleanCnpj.length !== 14) return;
    setFetchingCnpj(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
      const data = await res.json();
      if (data && !data.message) {
        if (!isUpdate) {
          setNome(data.nome_fantasia || data.razao_social || "");
          if (data.email) setEmail(data.email);
          if (data.ddd_telefone_1 || data.telefone) {
            setTelefone(formatPhoneInput(data.ddd_telefone_1 || data.telefone));
          }
        }
        if (data.cep) {
          const formattedCep = formatCepInput(data.cep);
          setCep(formattedCep);
          fetchAddressByCep(formattedCep);
        }
        if (!isUpdate) {
          if (data.logradouro) setEndereco(data.logradouro);
          if (data.numero) setNumero(data.numero);
          if (data.bairro) setBairro(data.bairro);
          if (data.municipio) setCidade(data.municipio);
          if (data.uf) setUf(data.uf);
        }
      }
    } catch (err) {
      console.error("Erro ao buscar CNPJ:", err);
    }
    setFetchingCnpj(false);
  }

  async function handleDocumentoChange(value: string) {
    if (tipoPessoa === "PF") {
      const formatted = formatCpfInput(value);
      setDocumento(formatted);
      await lookupExistingClient("PF", formatted);
      return;
    }

    const formatted = formatCnpjInput(value);
    setDocumento(formatted);
    const found = await lookupExistingClient("PJ", formatted);
    if (!found) {
      fetchCompanyByCnpj(formatted);
    }
  }

  function handleTipoPessoaChange(next: TipoPessoa) {
    setTipoPessoa(next);
    setDocumento("");
    setIsUpdate(false);
    setNome("");
    setEmail("");
    setTelefone("");
    setCep("");
    setEndereco("");
    setNumero("");
    setBairro("");
    setCidade("");
    setUf("");
    setTipoImovel("CASA");
    setObsImovel("");
    setObsEntrega("");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const res = await submitPublicClientSignupAction({
      nome,
      email,
      telefone,
      tipo_pessoa: tipoPessoa,
      cpf: tipoPessoa === "PF" ? documento : undefined,
      cnpj: tipoPessoa === "PJ" ? documento : undefined,
      cep,
      endereco,
      numero,
      bairro,
      cidade,
      uf,
      tipo_imovel: tipoImovel,
      obs_imovel: obsImovel,
      obs_entrega: obsEntrega,
      company_id: companyId,
    });

    setLoading(false);

    if (res.success) {
      setWasUpdate(res.isExistingClient ?? isUpdate);
      setSuccess(true);
      return;
    }

    setError(res.error ?? "Não foi possível enviar o cadastro.");
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center space-y-4 py-12 px-6">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">
          {wasUpdate ? "Cadastro atualizado!" : "Cadastro enviado!"}
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          {wasUpdate
            ? "Seus dados foram atualizados com sucesso na Móveis Unghero."
            : "Obrigado por se cadastrar na Móveis Unghero. Seus dados foram registrados com sucesso."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 space-y-5">
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-primary/10 text-primary mb-2">
          <UserPlus className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Cadastro de Cliente
        </h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          Preencha seus dados pessoais, endereço e informações do imóvel.
          Se já estiver cadastrado, informe seu CPF ou CNPJ para atualizar.
        </p>
      </div>

      <div className="space-y-6 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl text-xs font-bold">
          <button
            type="button"
            className={`flex-1 py-2 rounded-lg transition-all ${
              tipoPessoa === "PF"
                ? "bg-white shadow-sm text-slate-900"
                : "text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => handleTipoPessoaChange("PF")}
          >
            Pessoa Física (PF)
          </button>
          <button
            type="button"
            className={`flex-1 py-2 rounded-lg transition-all ${
              tipoPessoa === "PJ"
                ? "bg-white shadow-sm text-slate-900"
                : "text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => handleTipoPessoaChange("PJ")}
          >
            Pessoa Jurídica (PJ)
          </button>
        </div>

        {isUpdate ? (
          <p className="text-xs font-semibold text-primary bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
            Cadastro encontrado — você pode revisar e atualizar seus dados abaixo.
          </p>
        ) : null}

        <div className="space-y-4">
          <p className={sectionClass}>1. Dados Pessoais</p>

          <div className="space-y-1.5">
            <label className={labelClass}>
              {tipoPessoa === "PF" ? "CPF *" : "CNPJ *"}
              {lookingUp ? (
                <span className="ml-2 text-[10px] font-semibold text-primary">Buscando cadastro...</span>
              ) : null}
              {fetchingCnpj ? (
                <span className="ml-2 text-[10px] font-semibold text-primary">Buscando dados...</span>
              ) : null}
            </label>
            <input
              required
              value={documento}
              onChange={(e) => handleDocumentoChange(e.target.value)}
              className={inputClass}
              placeholder={tipoPessoa === "PF" ? "000.000.000-00" : "00.000.000/0000-00"}
            />
          </div>

          <div className="space-y-1.5">
            <label className={labelClass}>
              {tipoPessoa === "PF" ? "Nome completo *" : "Razão social / Nome fantasia *"}
            </label>
            <input
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className={inputClass}
              placeholder="Seu nome"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={labelClass}>E-mail *</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="seu@email.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>Telefone / WhatsApp *</label>
              <input
                required
                type="tel"
                value={telefone}
                onChange={(e) => setTelefone(formatPhoneInput(e.target.value))}
                placeholder={PHONE_PLACEHOLDER}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <p className={sectionClass}>2. Endereço</p>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className={labelClass}>CEP</label>
              <input
                value={cep}
                onChange={(e) => {
                  const val = formatCepInput(e.target.value);
                  setCep(val);
                  fetchAddressByCep(val);
                }}
                className={inputClass}
                placeholder="00000-000"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <label className={labelClass}>Rua / Logradouro</label>
              <input
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                className={inputClass}
                placeholder="Rua, avenida..."
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className={labelClass}>Número</label>
              <input
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                className={inputClass}
                placeholder="123"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <label className={labelClass}>Bairro</label>
              <input
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                className={inputClass}
                placeholder="Bairro"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <label className={labelClass}>Cidade *</label>
              <input
                required
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                className={inputClass}
                placeholder="Ex: Farroupilha"
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>UF</label>
              <input
                value={uf}
                onChange={(e) => setUf(e.target.value.toUpperCase().slice(0, 2))}
                className={`${inputClass} uppercase`}
                placeholder="RS"
                maxLength={2}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <p className={sectionClass}>3. Imóvel</p>

          <div className="space-y-1.5">
            <label className={labelClass}>Tipo de imóvel</label>
            <select
              value={tipoImovel}
              onChange={(e) => setTipoImovel(e.target.value)}
              className={inputClass}
            >
              {TIPO_IMOVEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className={labelClass}>Observações da obra / imóvel</label>
            <textarea
              value={obsImovel}
              onChange={(e) => setObsImovel(e.target.value)}
              rows={2}
              className={`${inputClass} h-auto py-2 resize-none`}
              placeholder="Obra em andamento, condomínio, restrições de horário..."
            />
          </div>

          <div className="space-y-1.5">
            <label className={labelClass}>Observações na entrega</label>
            <textarea
              value={obsEntrega}
              onChange={(e) => setObsEntrega(e.target.value)}
              rows={2}
              className={`${inputClass} h-auto py-2 resize-none`}
              placeholder="Acesso ao imóvel, elevador, horários de entrega..."
            />
          </div>
        </div>

        {error ? (
          <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading || fetchingCnpj || lookingUp}
          className="w-full h-12 rounded-xl bg-slate-900 text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              {isUpdate ? "Atualizar cadastro" : "Enviar cadastro"}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
