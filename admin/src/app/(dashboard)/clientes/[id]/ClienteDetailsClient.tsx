"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import SensitiveToggle from "@/components/SensitiveToggle";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  type Activity, 
  type Payment, 
  addActivityAction,
  updateClientObservacoesAction 
} from "@/app/actions/cliente";
import { getClientDetailsLiveSnapshot } from "@/app/actions/liveSnapshots";
import { useLiveEntity } from "@/context/LiveSyncContext";
import { resolveClientDocument } from "@/lib/clientDocument";
import { usePrivacy } from "@/context/PrivacyContext";
import { maskPhone, maskEmail, maskDocument } from "@/lib/maskSensitive";
import { formatClientEmailDisplay, hasRealClientEmail } from "@/lib/clientMatch";
import { buildWhatsAppUrl, getFirstName } from "@/lib/google-review";
import { formatPhoneDisplay } from "@/lib/phone";
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  MessageCircle, 
  Clock, 
  User, 
  CreditCard, 
  Layers,
  Send,
  ShieldCheck,
  ImageIcon,
  ChevronDown,
} from "lucide-react";
import ClienteDocumentsTab from "@/components/clientes/ClienteDocumentsTab";
import ClienteFinanceTab from "@/components/clientes/ClienteFinanceTab";
import ClienteProjectsTab, { type ClientProjectSummary } from "@/components/clientes/ClienteProjectsTab";
import ClientConsentCard from "@/components/clientes/ClientConsentCard";
import {
  resolveClientConsent,
  stripConsentFromObservacoes,
} from "@/lib/clientConsent";
import type { ClientAttachmentDTO } from "@/lib/clientAttachments";

interface ProjectSummary extends ClientProjectSummary {}

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
  lgpd_aceite?: boolean;
  lgpd_aceite_em?: string | null;
  marketing_aceite?: boolean;
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
  const [client, setClient] = useState<ClientDetails>(initialClient);
  const [projects, setProjects] = useState<ClientProjectSummary[]>(
    initialClient.projects ?? []
  );
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [attachments, setAttachments] = useState<ClientAttachmentDTO[]>(initialAttachments);
  
  // Abas: overview, projects, documents, finance, timeline
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"overview" | "projects" | "finance" | "timeline" | "documents" | "notas">("overview");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "finance" || tab === "projects" || tab === "documents" || tab === "timeline" || tab === "overview" || tab === "notas") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Notas da Timeline
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  // Aba Notas — observações editáveis (sem o bloco legado de LGPD)
  const [notesValue, setNotesValue] = useState(
    stripConsentFromObservacoes(initialClient.observacoes ?? "")
  );
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);

  const syncClientDetails = useCallback(async () => {
    const result = await getClientDetailsLiveSnapshot(client.id);
    if (result.success && result.client) {
      setClient(result.client as ClientDetails);
      if (result.activities) setActivities(result.activities);
      if (result.payments) setPayments(result.payments);
      if (result.attachments) setAttachments(result.attachments);
      if (result.client.projects) {
        setProjects(result.client.projects as ClientProjectSummary[]);
      }
    }
  }, [client.id]);

  useLiveEntity("clients", {
    sync: syncClientDetails,
    enabled: !isSubmittingNote,
  });

  const docInfo = resolveClientDocument(client);
  const { sensitiveHidden } = usePrivacy();

  // Link formatado para WhatsApp com saudação
  const greeting = `Olá ${getFirstName(client.nome)}, tudo bem? Aqui é da Móveis Unghero. 😊`;
  const whatsappUrl =
    buildWhatsAppUrl(client.telefone, greeting) ||
    `https://wa.me/?text=${encodeURIComponent(greeting)}`;

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

  // Salvar Observações / Notas do cliente
  const handleSaveNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingNotes(true);
    setNotesError(null);
    setNotesSaved(false);
    const res = await updateClientObservacoesAction(client.id, notesValue);
    if (res.success) {
      setClient((prev) => ({ ...prev, observacoes: res.observacoes ?? "" }));
      setNotesValue(stripConsentFromObservacoes(res.observacoes ?? ""));
      setNotesSaved(true);
      window.setTimeout(() => setNotesSaved(false), 2500);
    } else {
      setNotesError(res.error ?? "Não foi possível salvar as notas.");
    }
    setSavingNotes(false);
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

      {/* ─── PERFIL DO CLIENTE — HEADER (com contato integrado) ─── */}
      <Card className="p-6 glass-card space-y-5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black text-foreground tracking-tight">{client.nome}</h1>
              <SensitiveToggle />
              <span className={`text-[10px] font-black tracking-wider px-2 py-0.5 rounded-md ${docInfo.tipo_pessoa === "PF" ? "bg-indigo-50 text-indigo-600 border border-indigo-200" : "bg-purple-50 text-purple-600 border border-purple-200"}`}>
                {docInfo.tipo_pessoa === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}
              </span>
            </div>

            {docInfo.documento && (
              <span className="text-xs font-semibold text-slate-500 block mt-0.5 select-none">
                {docInfo.tipo_pessoa === "PF" ? "CPF" : "CNPJ"}: {sensitiveHidden ? maskDocument(docInfo.documento) : docInfo.documento}
              </span>
            )}

            <div className="flex flex-wrap items-center gap-4 mt-2.5 text-xs text-muted-foreground font-medium">
              <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-primary" /> Origem: {ORIGIN_LABELS[client.origem] || client.origem}</span>
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
        </div>

        {/* Informações de contato integradas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-border/40 pt-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-500 shrink-0">
              <Phone className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-muted-foreground uppercase block">Telefone / WhatsApp</span>
              {sensitiveHidden ? (
                <span className="text-sm font-semibold text-foreground select-none tracking-wide">{maskPhone(client.telefone)}</span>
              ) : (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 hover:underline">{formatPhoneDisplay(client.telefone)}</a>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-500 shrink-0">
              <Mail className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-muted-foreground uppercase block">E-mail Cadastrado</span>
              {sensitiveHidden ? (
                <span className="text-sm font-semibold text-foreground select-none break-all">
                  {hasRealClientEmail(client.email)
                    ? maskEmail(client.email)
                    : formatClientEmailDisplay(client.email)}
                </span>
              ) : hasRealClientEmail(client.email) ? (
                <a
                  href={`mailto:${client.email}`}
                  className="text-sm font-semibold text-primary hover:underline break-all"
                >
                  {formatClientEmailDisplay(client.email)}
                </a>
              ) : (
                <span className="text-sm font-semibold text-muted-foreground break-all">
                  {formatClientEmailDisplay(client.email)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-500 shrink-0">
              <MapPin className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-muted-foreground uppercase block">Cidade de Atendimento</span>
              <span className="text-sm font-semibold text-foreground">{client.cidade}</span>
            </div>
          </div>
        </div>

        <ClientConsentCard
          className="mt-4"
          consent={resolveClientConsent({
            lgpd_aceite: client.lgpd_aceite,
            lgpd_aceite_em: client.lgpd_aceite_em,
            marketing_aceite: client.marketing_aceite,
            observacoes: client.observacoes,
          })}
        />
      </Card>

      {/* ─── CONTEÚDO ─── */}
      {/* Seletor de abas full-width e, abaixo, cada aba ocupando toda a largura. */}
      <div className="space-y-6">

        {/* ─── SELETOR DE ABAS ─── */}
        <div>
          {/* Mobile: dropdown de seção */}
          <div className="relative sm:hidden">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as "overview" | "projects" | "finance" | "timeline" | "documents")}
              className="w-full appearance-none bg-white border border-border rounded-xl py-3 pl-4 pr-10 text-sm font-bold text-foreground shadow-sm outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            >
              <option value="overview">Visão Geral</option>
              <option value="projects">Projetos ({projects.length})</option>
              <option value="documents">Fotos &amp; Docs ({attachments.length})</option>
              <option value="finance">Financeiro</option>
              <option value="timeline">Linha do Tempo</option>
              <option value="notas">Notas</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>

          {/* Desktop/tablet: faixa de abas */}
          <div className="hidden sm:block sm:overflow-x-auto sm:-mx-1 sm:px-1">
            <div className="flex gap-1.5 p-1 bg-slate-100/80 border border-slate-200/50 rounded-xl w-max min-w-full md:w-fit">
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${activeTab === "overview" ? "bg-white text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
              >
                <User className="h-4 w-4 shrink-0" /> Visão Geral
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("projects")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${activeTab === "projects" ? "bg-white text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Layers className="h-4 w-4 shrink-0" /> Projetos
                <span className="text-[10px] opacity-70 tabular-nums">({projects.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("documents")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${activeTab === "documents" ? "bg-white text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
              >
                <ImageIcon className="h-4 w-4 shrink-0" /> Fotos & Docs
                <span className="text-[10px] opacity-70 tabular-nums">({attachments.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("finance")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${activeTab === "finance" ? "bg-white text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
              >
                <CreditCard className="h-4 w-4 shrink-0" /> Financeiro
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("timeline")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${activeTab === "timeline" ? "bg-white text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Clock className="h-4 w-4 shrink-0" /> Linha do Tempo
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("notas")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${activeTab === "notas" ? "bg-white text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
              >
                <FileText className="h-4 w-4 shrink-0" /> Notas
              </button>
            </div>
          </div>
        </div>

        {/* Conteúdo Dinâmico (largura total) */}
        <div className="space-y-6">

          {/* ABA: VISÃO GERAL — resumo rápido */}
          {activeTab === "overview" && (
            <Card className="p-5 glass-card space-y-4">
              <h3 className="text-base font-bold text-foreground">Resumo do cliente</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-border/60 bg-slate-50 p-3">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Projetos</p>
                  <p className="text-xl font-black text-foreground mt-1">{projects.length}</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-slate-50 p-3">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Anexos</p>
                  <p className="text-xl font-black text-foreground mt-1">{attachments.length}</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-slate-50 p-3">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Parcelas</p>
                  <p className="text-xl font-black text-foreground mt-1">{payments.length}</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-slate-50 p-3">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Eventos</p>
                  <p className="text-xl font-black text-foreground mt-1">{activities.length}</p>
                </div>
              </div>
              {(projects.length ?? 0) > 0 ? (
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="text-xs font-bold gap-1.5"
                    onClick={() => setActiveTab("projects")}
                  >
                    <Layers className="h-4 w-4" /> Ver todos os projetos
                  </Button>
                </div>
              ) : null}
            </Card>
          )}

          {/* ABA: PROJETOS */}
          {activeTab === "projects" && (
            <ClienteProjectsTab
              clientId={client.id}
              clientName={client.nome}
              clientEmail={client.email}
              clientTelefone={client.telefone}
              clientCidade={client.cidade}
              clientOrigem={client.origem}
              companyId={companyId}
              projects={projects}
              onProjectsChange={setProjects}
            />
          )}

          {activeTab === "finance" && (
            <ClienteFinanceTab
              clientId={client.id}
              clientName={client.nome}
              projects={projects}
              payments={payments}
              onPaymentsChange={setPayments}
              onGoToProjects={() => setActiveTab("projects")}
            />
          )}

          {/* ABA: FOTOS & DOCUMENTOS */}
          {activeTab === "documents" && (
            <ClienteDocumentsTab
              clientId={client.id}
              attachments={attachments}
              onAttachmentsChange={setAttachments}
              projects={projects.map((p) => ({ id: p.id, status_geral: p.status_geral }))}
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
                      className="border-border bg-slate-50 text-xs py-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground block">Detalhamento</label>
                    <textarea 
                      required
                      value={newDesc}
                      onChange={e => setNewDesc(e.target.value)}
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

          {/* ABA: NOTAS / OBSERVAÇÕES */}
          {activeTab === "notas" && (
            <Card className="p-5 glass-card space-y-3">
              <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-2">
                <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-primary" /> Observações / Notas
                </h3>
                {notesSaved && (
                  <span className="text-[11px] font-bold text-emerald-600">Salvo ✓</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Anotações livres e permanentes sobre o cliente (preferências, restrições, contexto). Para registrar eventos com data e autor, use a Linha do Tempo.
              </p>
              <form onSubmit={handleSaveNotes} className="space-y-3">
                <textarea
                  value={notesValue}
                  onChange={(e) => {
                    setNotesValue(e.target.value);
                    setNotesSaved(false);
                  }}
                  className="w-full min-h-40 bg-slate-50 border border-border rounded-xl text-sm p-3 outline-none focus:ring-1 focus:ring-primary leading-relaxed whitespace-pre-line"
                />
                {notesError && (
                  <p className="text-xs text-red-600 font-medium">{notesError}</p>
                )}
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={
                      savingNotes ||
                      notesValue === stripConsentFromObservacoes(client.observacoes ?? "")
                    }
                    className="text-xs font-bold gap-1.5 btn-metallic"
                  >
                    <Send className="h-3.5 w-3.5" /> {savingNotes ? "Salvando..." : "Salvar notas"}
                  </Button>
                </div>
              </form>
            </Card>
          )}

        </div>

      </div>

    </div>
  );
}
