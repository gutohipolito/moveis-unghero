"use client";

import React, { useState } from "react";
import { PartnerType } from "@prisma/client";
import { CheckCircle, Loader2, PenTool, Send } from "lucide-react";
import { submitPublicPartnerSignupAction } from "@/app/actions/partnerSignup";
import { PARTNER_TYPE_LABELS, PARTNER_TYPES } from "@/lib/partnerTypes";
import { PHONE_PLACEHOLDER } from "@/lib/phone";

export default function PartnerSignupForm({ companyId }: { companyId?: string }) {
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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

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
        <h2 className="text-2xl font-black text-slate-900">Cadastro enviado!</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Obrigado pelo interesse em fazer parceria com a Móveis Unghero.
          Nossa equipe analisará seu cadastro e entrará em contato em breve.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto px-4 space-y-5">
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-primary/10 text-primary mb-2">
          <PenTool className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Cadastro de Parceiros
        </h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          Projetistas, arquitetos e decoradores: cadastre-se para indicar clientes ou co-projetar com a Móveis Unghero.
        </p>
      </div>

      <div className="space-y-4 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600">Nome completo *</label>
          <input
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Seu nome profissional"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600">Tipo de atuação *</label>
            <select
              required
              value={tipo}
              onChange={(e) => setTipo(e.target.value as PartnerType)}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {PARTNER_TYPES.map((item) => (
                <option key={item} value={item}>
                  {PARTNER_TYPE_LABELS[item]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600">Cidade</label>
            <input
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Ex: Farroupilha"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600">Escritório / Studio</label>
          <input
            value={escritorio}
            onChange={(e) => setEscritorio(e.target.value)}
            className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Nome do escritório (opcional)"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600">Telefone / WhatsApp</label>
            <input
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder={PHONE_PLACEHOLDER}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="seu@email.com"
            />
          </div>
        </div>

        <p className="text-[11px] text-slate-400">* Informe pelo menos telefone ou e-mail.</p>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600">Portfolio / Instagram</label>
          <input
            type="url"
            value={portfolioUrl}
            onChange={(e) => setPortfolioUrl(e.target.value)}
            className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="https://instagram.com/seu_perfil"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600">Observações</label>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Como conheceu a Móveis Unghero? Áreas de atuação?"
          />
        </div>

        {error ? (
          <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
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
              Enviar cadastro
            </>
          )}
        </button>
      </div>
    </form>
  );
}
