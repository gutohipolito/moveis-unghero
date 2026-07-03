"use client";

import React, { useState } from "react";
import PrivacyToggle from "@/components/PrivacyToggle";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  type Activity, 
  type Payment, 
  addActivityAction 
} from "@/app/actions/cliente";
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  DollarSign, 
  FileText, 
  PlusCircle, 
  MessageCircle, 
  Clock, 
  User, 
  CreditCard, 
  Layers,
  Send,
  ExternalLink,
  ShieldCheck
} from "lucide-react";

interface ProjectSummary {
  id: string;
  status_geral: string;
  valor_previsto: number;
}

interface ClientDetails {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cidade: string;
  origem: string;
  status: string;
  observacoes: string;
  projects?: ProjectSummary[];
}

interface ClienteDetailsClientProps {
  initialClient: ClientDetails;
  initialActivities: Activity[];
  initialPayments: Payment[];
  companyId: string;
}

const ORIGIN_LABELS: Record<string, string> = {
  SITE: "Site Institucional",
  INSTAGRAM: "Instagram",
  INDICACAO: "Indicação",
  GOOGLE: "Busca Google",
  WHATSAPP: "WhatsApp Comercial",
  FACEBOOK: "Campanha Facebook"
};

const STATUS_LABELS: Record<string, string> = {
  LEAD: "Lead Inicial",
  EM_CONTATO: "Em Contato",
  NEGOCIACAO: "Em Negociação",
  APROVADO: "Cliente Aprovado",
  INATIVO: "Inativo"
};

const STATUS_COLORS: Record<string, string> = {
  LEAD: "bg-amber-100 text-amber-800 border-amber-200",
  EM_CONTATO: "bg-cyan-100 text-cyan-800 border-cyan-200",
  NEGOCIACAO: "bg-blue-100 text-blue-800 border-blue-200",
  APROVADO: "bg-emerald-100 text-emerald-800 border-emerald-200",
  INATIVO: "bg-rose-100 text-rose-800 border-rose-200"
};

export default function ClienteDetailsClient({ 
  initialClient, 
  initialActivities, 
  initialPayments,
  companyId 
}: ClienteDetailsClientProps) {
  const [client] = useState<ClientDetails>(initialClient);
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [payments] = useState<Payment[]>(initialPayments);
  
  // Abas: "overview", "finance", "timeline"
  const [activeTab, setActiveTab] = useState<"overview" | "finance" | "timeline">("overview");

  // Notas da Timeline
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Parse dinâmico do documento CPF/CNPJ
  const parseDocument = (obs: string) => {
    let tipo: "PF" | "PJ" = "PF";
    let doc = "";
    let cleanObs = obs || "";
    if (obs?.startsWith("[PF - CPF:")) {
      const closingBracket = obs.indexOf("]");
      if (closingBracket !== -1) {
        doc = obs.substring(10, closingBracket).trim();
        cleanObs = obs.substring(closingBracket + 1).trim();
        tipo = "PF";
      }
    } else if (obs?.startsWith("[PJ - CNPJ:")) {
      const closingBracket = obs.indexOf("]");
      if (closingBracket !== -1) {
        doc = obs.substring(11, closingBracket).trim();
        cleanObs = obs.substring(closingBracket + 1).trim();
        tipo = "PJ";
      }
    }
    return { tipo, doc, cleanObs };
  };

  const parsed = parseDocument(client.observacoes);

  // Link formatado para WhatsApp
  const numLimpo = client.telefone.replace(/\D/g, "");
  const whatsappUrl = `https://wa.me/55${numLimpo}?text=Olá%20${encodeURIComponent(client.nome)},%20tudo%20bem?%20Gostaríamos%20de%20falar%20sobre%20o%20seu%20projeto%20de%20móveis%20planejados...`;

  // Adicionar Anotação na Timeline
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDesc) return;

    setIsSubmittingNote(true);
    const res = await addActivityAction(client.id, newTitle, newDesc, "Administrador");
    if (res.success) {
      setActivities([res.activity, ...activities]);
      setNewTitle("");
      setNewDesc("");
    }
    setIsSubmittingNote(false);
  };

  return (
    <div className="space-y-6">
      {/* Botão Voltar */}
      <div className="flex items-center gap-3">
        <Link 
          href="/clientes" 
          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-muted-foreground transition-all flex items-center justify-center cursor-pointer"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </Link>
        <span className="text-xs font-bold text-muted-foreground">Voltar para a lista</span>
      </div>

      {/* ─── PERFIL DO CLIENTE — HEADER ─── */}
      <Card className="p-6 glass-card flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-start gap-4">
          <div className="p-4 bg-primary/10 text-primary rounded-2xl">
            <User className="h-8 w-8" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black text-foreground tracking-tight">{client.nome}</h1>
              <PrivacyToggle />
              <span className={`text-[10px] font-black tracking-wider px-2 py-0.5 rounded-md ${parsed.tipo === "PF" ? "bg-indigo-50 text-indigo-600 border border-indigo-200" : "bg-purple-50 text-purple-600 border border-purple-200"}`}>
                {parsed.tipo === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}
              </span>
            </div>

            {parsed.doc && (
              <span className="text-xs font-semibold text-slate-500 block mt-0.5 privacy-value">
                {parsed.tipo === "PF" ? "CPF" : "CNPJ"}: {parsed.doc}
              </span>
            )}

            <div className="flex flex-wrap items-center gap-4 mt-2.5 text-xs text-muted-foreground font-medium">
              <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-rose-500" /> {client.cidade}</span>
              <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-primary" /> Origem: {ORIGIN_LABELS[client.origem] || client.origem}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full border text-center ${STATUS_COLORS[client.status] || "bg-slate-100 text-slate-700"}`}>
            {STATUS_LABELS[client.status] || client.status}
          </span>
          
          <a 
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-2 px-4 flex items-center justify-center gap-1.5 transition-all shadow-sm"
          >
            <MessageCircle className="h-4 w-4" /> Enviar WhatsApp
          </a>
        </div>
      </Card>

      {/* ─── SELETOR DE ABAS INTERNAS ─── */}
      <div className="flex gap-1.5 p-1 bg-slate-100/80 border border-slate-200/50 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "overview" ? "bg-white text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Layers className="h-4 w-4" /> Visão Geral & Projetos
        </button>
        <button
          onClick={() => setActiveTab("finance")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "finance" ? "bg-white text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
        >
          <CreditCard className="h-4 w-4" /> Pagamentos & Financeiro
        </button>
        <button
          onClick={() => setActiveTab("timeline")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "timeline" ? "bg-white text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Clock className="h-4 w-4" /> Linha do Tempo & Notas
        </button>
      </div>

      {/* ─── CONTEÚDO DAS ABAS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Lado Esquerdo: Cards Cadastrais (presente em quase todas as telas) */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-5 glass-card space-y-4">
            <h3 className="text-sm font-black text-foreground uppercase tracking-wider border-b border-border/40 pb-2">Informações de Contato</h3>
            <div className="space-y-3.5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Telefone / WhatsApp</span>
                  <a href={`tel:${numLimpo}`} className="text-sm font-semibold text-foreground hover:underline">{client.telefone}</a>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">E-mail Cadastrado</span>
                  <a href={`mailto:${client.email}`} className="text-sm font-semibold text-foreground hover:underline break-all">{client.email}</a>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Cidade de Atendimento</span>
                  <span className="text-sm font-semibold text-foreground">{client.cidade}</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5 glass-card space-y-2">
            <h3 className="text-sm font-black text-foreground uppercase tracking-wider border-b border-border/40 pb-2">Observações / Notas</h3>
            <p className="text-xs text-slate-600 leading-relaxed pt-1 whitespace-pre-line">
              {parsed.cleanObs || "Sem observações iniciais registradas para este cliente."}
            </p>
          </Card>
        </div>

        {/* Lado Direito: Conteúdo Dinâmico */}
        <div className="lg:col-span-2 space-y-6">

          {/* ABA 1: VISÃO GERAL & PROJETOS */}
          {activeTab === "overview" && (
            <Card className="p-5 glass-card space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <h3 className="text-base font-bold text-foreground flex items-center gap-1.5"><Layers className="h-4.5 w-4.5 text-primary" /> Projetos sob Medida Associados</h3>
                <span className="text-xs font-bold text-muted-foreground bg-slate-100 px-2.5 py-0.5 rounded-full">
                  {client.projects?.length || 0} vinculados
                </span>
              </div>

              <div className="space-y-4">
                {!client.projects || client.projects.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground border-2 border-dashed border-border/60 rounded-2xl">
                    Nenhum projeto ou orçamento ativo foi lançado para este cliente ainda.
                  </div>
                ) : (
                  client.projects.map(p => (
                    <div 
                      key={p.id}
                      className="p-4 rounded-xl border border-border/60 bg-slate-50 hover:bg-slate-100/50 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                    >
                      <div className="space-y-1">
                        <strong className="text-sm font-bold text-foreground">Projeto Código: {p.id.toUpperCase()}</strong>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Atualizado recentemente</span>
                          <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> Previsto: <span className="privacy-value">{p.valor_previsto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        <span className="text-[10px] font-bold uppercase px-2.5 py-1 bg-amber-500/10 text-amber-700 rounded-full">
                          {p.status_geral.replace("_", " ")}
                        </span>
                        
                        <Link 
                          href={`/projects/${p.id}`}
                          className="text-xs font-bold bg-white hover:bg-slate-50 text-foreground border border-border rounded-lg py-1.5 px-3 flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                        >
                          Acessar Projeto <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}

          {/* ABA 2: PAGAMENTOS & FINANCEIRO */}
          {activeTab === "finance" && (
            <Card className="p-5 glass-card space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <h3 className="text-base font-bold text-foreground flex items-center gap-1.5"><CreditCard className="h-4.5 w-4.5 text-primary" /> Histórico de Faturamento e Parcelas</h3>
                <span className="text-xs font-bold text-muted-foreground bg-slate-100 px-2.5 py-0.5 rounded-full">
                  {payments.length} parcelas registradas
                </span>
              </div>

              <div className="space-y-3">
                {payments.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground border-2 border-dashed border-border/60 rounded-2xl">
                    Nenhum lançamento financeiro ou parcela foi gerada para este cliente.
                  </div>
                ) : (
                  payments.map(pay => {
                    const isPaid = pay.status === "PAGO";
                    const isLate = pay.status === "ATRASADO";
                    return (
                      <div 
                        key={pay.id}
                        className="p-4 rounded-xl border border-border/50 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50 transition-all"
                      >
                        <div className="space-y-1">
                          <strong className="text-sm font-bold text-foreground">{pay.descricao}</strong>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>Vencimento: {new Date(pay.vencimento).toLocaleDateString("pt-BR")}</span>
                            {pay.metodo && <span>Método: {pay.metodo}</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                          <div className="text-right">
                            <span className="text-xs font-medium text-muted-foreground block">Valor da Parcela</span>
                            <strong className="text-sm font-black text-foreground privacy-value">{pay.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
                          </div>

                          <div>
                            <span className={`text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full border block text-center ${isPaid ? "bg-emerald-50 text-emerald-600 border-emerald-200" : isLate ? "bg-rose-50 text-rose-600 border-rose-200 animate-pulse" : "bg-amber-50 text-amber-600 border-amber-200"}`}>
                              {pay.status}
                            </span>
                            {pay.pagoEm && (
                              <span className="text-[9px] font-semibold text-emerald-600 block mt-1 text-center">
                                Pago em: {new Date(pay.pagoEm).toLocaleDateString("pt-BR")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          )}

          {/* ABA 3: LINHA DO TEMPO & NOTAS */}
          {activeTab === "timeline" && (
            <div className="space-y-6">
              {/* Registrar anotação rápida */}
              <Card className="p-5 glass-card space-y-3">
                <h3 className="text-sm font-black text-foreground uppercase tracking-wider border-b border-border/40 pb-2">Registrar Atividade Comercial / Nota</h3>
                <form onSubmit={handleAddNote} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground block">Assunto / Título</label>
                    <Input 
                      required
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      placeholder="Ex: Visita na obra realizada, Ligação feita"
                      className="border-border bg-slate-50 text-xs py-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground block">Detalhamento</label>
                    <textarea 
                      required
                      value={newDesc}
                      onChange={e => setNewDesc(e.target.value)}
                      placeholder="Descreva o que foi conversado ou as notas da medição técnica..."
                      className="w-full h-16 bg-slate-50 border border-border rounded-lg text-xs p-2 outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={isSubmittingNote} 
                      className="text-xs font-bold gap-1.5 btn-metallic h-8 py-0"
                    >
                      <Send className="h-3 w-3" /> {isSubmittingNote ? "Registrando..." : "Publicar no Histórico"}
                    </Button>
                  </div>
                </form>
              </Card>

              {/* Timeline das atividades */}
              <Card className="p-5 glass-card space-y-4">
                <h3 className="text-sm font-black text-foreground uppercase tracking-wider border-b border-border/40 pb-2">Histórico de Eventos</h3>

                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
                  {activities.map(act => (
                    <div key={act.id} className="relative group">
                      {/* Ponto indicador da timeline */}
                      <span className="absolute -left-[22px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-primary shadow-xs transition-transform group-hover:scale-125" />

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <strong className="text-sm font-bold text-slate-800">{act.titulo}</strong>
                          <span className="text-[10px] font-semibold text-muted-foreground">
                            {new Date(act.data).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{act.descricao}</p>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary/70 bg-primary/5 px-2 py-0.5 rounded-md">
                          <User className="h-2.5 w-2.5" /> Registrado por: {act.autor}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
