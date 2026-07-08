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
import { resolveClientDocument } from "@/lib/clientDocument";
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
  ShieldCheck,
  ImageIcon,
} from "lucide-react";
import ClienteDocumentsTab from "@/components/clientes/ClienteDocumentsTab";
import type { ClientAttachmentDTO } from "@/lib/clientAttachments";

interface ProjectSummary {
  id: string;
  status_geral: string;
  valor_previsto: number;
  quotes?: { id: string; valor_final: number }[];
}

interface ClientDetails {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cidade: string;
  origem: string;
  status: string;
  tipo_pessoa?: "PF" | "PJ";
  cpf?: string;
  cnpj?: string;
  observacoes: string;
  projects?: ProjectSummary[];
}

interface ClienteDetailsClientProps {
  initialClient: ClientDetails;
  initialActivities: Activity[];
  initialPayments: Payment[];
  initialAttachments: ClientAttachmentDTO[];
  companyId: string;
}

const ORIGIN_LABELS: Record<string, string> = {
  SITE: "Site Institucional",
  INSTAGRAM: "Instagram",
  INDICACAO: "Indicação",
  GOOGLE: "Busca Google",
  WHATSAPP: "WhatsApp Comercial",
  FACEBOOK: "Campanha Facebook",
  FORMULARIO: "Formulário de Qualificação"
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
  initialAttachments,
  companyId 
}: ClienteDetailsClientProps) {
  const [client] = useState<ClientDetails>(initialClient);
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [payments] = useState<Payment[]>(initialPayments);
  const [attachments, setAttachments] = useState<ClientAttachmentDTO[]>(initialAttachments);
  
  // Abas: overview, finance, timeline, documents
  const [activeTab, setActiveTab] = useState<"overview" | "finance" | "timeline" | "documents">("overview");

  // Notas da Timeline
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const docInfo = resolveClientDocument(client);

  // Link formatado para WhatsApp
  const numLimpo = client.telefone.replace(/\D/g, "");
  const whatsappUrl = `https://wa.me/55${numLimpo}?text=Olá%20${encodeURIComponent(client.nome)},%20tudo%20bem?%20Gostaríamos%20de%20falar%20sobre%20o%20seu%20projeto%20de%20móveis%20planejados...`;

  // Adicionar Anotação na Timeline
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDesc) return;

    setIsSubmittingNote(true);
    setNoteError(null);
    const res = await addActivityAction(client.id, newTitle, newDesc);
    if (res.success && res.activity) {
      setActivities([res.activity, ...activities]);
      setNewTitle("");
      setNewDesc("");
    } else if (!res.success) {
      setNoteError(res.error ?? "Não foi possível salvar a anotação.");
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
              <span className={`text-[10px] font-black tracking-wider px-2 py-0.5 rounded-md ${docInfo.tipo_pessoa === "PF" ? "bg-indigo-50 text-indigo-600 border border-indigo-200" : "bg-purple-50 text-purple-600 border border-purple-200"}`}>
                {docInfo.tipo_pessoa === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}
              </span>
            </div>

            {docInfo.documento && (
              <span className="text-xs font-semibold text-slate-500 block mt-0.5 privacy-value">
                {docInfo.tipo_pessoa === "PF" ? "CPF" : "CNPJ"}: {docInfo.documento}
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
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="flex gap-1.5 p-1 bg-slate-100/80 border border-slate-200/50 rounded-xl w-max min-w-full sm:w-fit">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${activeTab === "overview" ? "bg-white text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Layers className="h-4 w-4 shrink-0" /> Visão Geral
        </button>
        <button
          onClick={() => setActiveTab("documents")}
          className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${activeTab === "documents" ? "bg-white text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
        >
          <ImageIcon className="h-4 w-4 shrink-0" /> Fotos & Docs
          <span className="text-[10px] opacity-70 tabular-nums">({attachments.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("finance")}
          className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${activeTab === "finance" ? "bg-white text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
        >
          <CreditCard className="h-4 w-4 shrink-0" /> Financeiro
        </button>
        <button
          onClick={() => setActiveTab("timeline")}
          className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${activeTab === "timeline" ? "bg-white text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Clock className="h-4 w-4 shrink-0" /> Linha do Tempo
        </button>
        </div>
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
              {docInfo.observacoes || "Sem observações iniciais registradas para este cliente."}
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
                  client.projects.map(p => {
                    const isFormLead = client.origem === "FORMULARIO";
                    const hasNoQuote = !p.quotes || p.quotes.length === 0;
                    const isBlocked = isFormLead && hasNoQuote;

                    return (
                      <div 
                        key={p.id}
                        className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                          isBlocked 
                            ? "border-rose-200 bg-rose-50/20 hover:bg-rose-50/40" 
                            : "border-border/60 bg-slate-50 hover:bg-slate-100/50"
                        }`}
                      >
                        <div className="space-y-1">
                          <strong className="text-sm font-bold text-foreground flex items-center gap-1.5">
                            Projeto Código: {p.id.toUpperCase()}
                            {isBlocked && (
                              <span className="text-[10px] font-black text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5">
                                🔒 Bloqueado
                              </span>
                            )}
                          </strong>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Atualizado recentemente</span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3.5 w-3.5" /> 
                              {isBlocked ? (
                                <span className="text-rose-600 font-bold">Orçamento pendente (sem valor)</span>
                              ) : (
                                <>Previsto: <span className="privacy-value">{p.valor_previsto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></>
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                          <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                            isBlocked
                              ? "bg-rose-500/10 text-rose-700"
                              : "bg-amber-500/10 text-amber-700"
                          }`}>
                            {isBlocked ? "Aguardando Orçamento" : p.status_geral.replace("_", " ")}
                          </span>
                          
                          <Link 
                            href={isBlocked ? `/projects/${p.id}?createQuote=true` : `/projects/${p.id}`}
                            className={`text-xs font-bold border rounded-lg py-1.5 px-3 flex items-center gap-1 shadow-xs transition-all cursor-pointer ${
                              isBlocked
                                ? "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600 shadow-emerald-500/10"
                                : "bg-white hover:bg-slate-50 text-foreground border-border"
                            }`}
                          >
                            {isBlocked ? "Criar Orçamento" : "Acessar Projeto"} 
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    );
                  })
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

          {/* ABA: FOTOS & DOCUMENTOS */}
          {activeTab === "documents" && (
            <ClienteDocumentsTab
              clientId={client.id}
              attachments={attachments}
              onAttachmentsChange={setAttachments}
            />
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
                      placeholder="Assunto da interação ou reunião"
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

                  {noteError && (
                    <p className="text-xs text-red-600 font-medium">{noteError}</p>
                  )}

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
                  {activities.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhum evento registrado no histórico deste cliente.
                    </p>
                  ) : (
                    activities.map((act) => {
                      const isRegistration = act.tipo === "cadastro";
                      return (
                    <div key={act.id} className="relative group">
                      {/* Ponto indicador da timeline */}
                      <span
                        className={`absolute -left-[22px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white shadow-xs transition-transform group-hover:scale-125 ${
                          isRegistration ? "bg-emerald-500" : "bg-primary"
                        }`}
                      />

                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-3">
                          <strong className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                            {isRegistration ? (
                              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                            ) : null}
                            {act.titulo}
                          </strong>
                          <span className="text-[10px] font-semibold text-muted-foreground shrink-0 tabular-nums">
                            {new Date(act.data).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {act.descricao ? (
                          <p className="text-xs text-slate-600 leading-relaxed">{act.descricao}</p>
                        ) : null}
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                          isRegistration
                            ? "text-emerald-700 bg-emerald-50"
                            : "text-primary/70 bg-primary/5"
                        }`}>
                          {isRegistration ? (
                            <ShieldCheck className="h-2.5 w-2.5" />
                          ) : (
                            <User className="h-2.5 w-2.5" />
                          )}
                          {isRegistration ? "Registro automático" : `Registrado por: ${act.autor}`}
                        </span>
                      </div>
                    </div>
                      );
                    })
                  )}
                </div>
              </Card>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
