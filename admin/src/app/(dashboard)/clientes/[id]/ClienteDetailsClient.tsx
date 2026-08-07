"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import {
  type Activity,
  type Payment,
  addActivityAction,
  updateClientAction,
  updateClientObservacoesAction,
} from "@/app/actions/cliente";
import { getClientDetailsLiveSnapshot } from "@/app/actions/liveSnapshots";
import { useLiveEntity } from "@/context/LiveSyncContext";
import { resolveClientDocument } from "@/lib/clientDocument";
import { usePrivacy } from "@/context/PrivacyContext";
import { useSensitiveDisplay } from "@/hooks/useSensitiveDisplay";
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
  Pencil,
  Home,
  Truck,
} from "lucide-react";
import ClienteDocumentsTab from "@/components/clientes/ClienteDocumentsTab";
import ClienteFinanceTab from "@/components/clientes/ClienteFinanceTab";
import ClienteProjectsTab, { type ClientProjectSummary } from "@/components/clientes/ClienteProjectsTab";
import ClienteContactsSection from "@/components/clientes/ClienteContactsSection";
import { ClientConsentChip } from "@/components/clientes/ClientConsentCard";
import ClienteEditWideForm from "@/components/clientes/ClienteEditWideForm";
import { ActionDialogHost, useActionDialog } from "@/components/ActionDialogHost";
import {
  resolveClientConsent,
  stripConsentFromObservacoes,
} from "@/lib/clientConsent";
import type { ClientAttachmentDTO } from "@/lib/clientAttachments";
import { usePermissions } from "@/context/PermissionsContext";
import { canManageClients } from "@/lib/permissions";
import type { Origin } from "@/app/actions/kanban";
import type { ClientWizardData } from "../ClientWizard";

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
  partner_id?: string | null;
  partnerNome?: string | null;
  partnerTipo?: string | null;
  cep?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  uf?: string;
  tipo_imovel?: string;
  obs_imovel?: string;
  obs_entrega?: string;
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
  FORMULARIO: "Formulário de Qualificação",
};

const STATUS_LABELS: Record<string, string> = {
  LEAD: "Lead Inicial",
  EM_CONTATO: "Em Contato",
  NEGOCIACAO: "Em Negociação",
  APROVADO: "Cliente Aprovado",
  INATIVO: "Inativo",
};

/** Chips do header — mesmo tamanho/radius para não competirem entre si. */
const META_CHIP =
  "inline-flex items-center h-8 px-2.5 rounded-[var(--radius-sm)] border text-[11px] font-bold whitespace-nowrap";

const STATUS_COLORS: Record<string, string> = {
  LEAD: "bg-amber-50 text-amber-800 border-amber-200/80",
  EM_CONTATO: "bg-cyan-50 text-cyan-800 border-cyan-200/80",
  NEGOCIACAO: "bg-blue-50 text-blue-800 border-blue-200/80",
  APROVADO: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
  INATIVO: "bg-rose-50 text-rose-800 border-rose-200/80",
};

const TIPO_IMOVEL_LABELS: Record<string, string> = {
  CASA: "Casa Residencial",
  APARTAMENTO: "Apartamento",
  COMERCIAL: "Comercial / Escritório",
  SOBRADO: "Sobrado / Triplex",
  OUTRO: "Outro",
};

function formatCepDisplay(cep: string | undefined) {
  const digits = (cep || "").replace(/\D/g, "").slice(0, 8);
  if (digits.length !== 8) return cep?.trim() || "";
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function buildAddressLines(client: ClientDetails) {
  const streetParts = [client.endereco?.trim(), client.numero?.trim()].filter(Boolean);
  const street = streetParts.join(", ");
  const locality = [client.bairro?.trim(), client.cidade?.trim(), client.uf?.trim()]
    .filter(Boolean)
    .join(" · ");
  const cep = formatCepDisplay(client.cep);
  return { street, locality, cep };
}

function clientToWizardData(client: ClientDetails): Partial<ClientWizardData> {
  const doc = resolveClientDocument(client);
  return {
    tipo_pessoa: doc.tipo_pessoa,
    documento: doc.documento,
    nome: client.nome,
    email: hasRealClientEmail(client.email) ? client.email : "",
    telefone: client.telefone,
    cep: client.cep || "",
    endereco: client.endereco || "",
    numero: client.numero || "",
    bairro: client.bairro || "",
    cidade: client.cidade,
    uf: client.uf || "",
    tipo_imovel: client.tipo_imovel || "CASA",
    origem: (client.origem as Origin) || "INSTAGRAM",
    status: client.status,
    observacoes: doc.observacoes,
    obs_imovel: client.obs_imovel || "",
    obs_entrega: client.obs_entrega || "",
  };
}

export default function ClienteDetailsClient({
  initialClient,
  initialActivities,
  initialPayments,
  initialAttachments,
  companyId,
}: ClienteDetailsClientProps) {
  const [client, setClient] = useState<ClientDetails>(initialClient);
  const [projects, setProjects] = useState<ClientProjectSummary[]>(
    initialClient.projects ?? []
  );
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [attachments, setAttachments] = useState<ClientAttachmentDTO[]>(initialAttachments);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<
    "overview" | "projects" | "finance" | "timeline" | "documents" | "notas"
  >("overview");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (
      tab === "finance" ||
      tab === "projects" ||
      tab === "documents" ||
      tab === "timeline" ||
      tab === "overview" ||
      tab === "notas"
    ) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

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
      if (typeof result.client.observacoes === "string") {
        setNotesValue(stripConsentFromObservacoes(result.client.observacoes));
      }
    }
  }, [client.id]);

  useLiveEntity("clients", {
    sync: syncClientDetails,
    enabled: !isSubmittingNote && !editSaving && !isEditOpen,
  });

  const dialog = useActionDialog();
  const { showSuccess, showError, confirmAction } = dialog;
  const docInfo = resolveClientDocument(client);
  const { sensitiveHidden } = usePrivacy();
  const sensitive = useSensitiveDisplay();
  const { isOpsLimited, role } = usePermissions();
  const isFactoryRole = role === "PRODUCAO";
  const canManage = canManageClients(role);
  const hideClientContact = isOpsLimited;

  useEffect(() => {
    if (!isOpsLimited) return;
    if (activeTab === "finance" || activeTab === "timeline") {
      setActiveTab("overview");
    }
  }, [isOpsLimited, activeTab]);

  const greeting = `Olá ${getFirstName(client.nome)}, tudo bem? Aqui é da Móveis Unghero. 😊`;
  const whatsappUrl =
    hideClientContact || sensitive.hide
      ? null
      : buildWhatsAppUrl(client.telefone, greeting);

  const notesPreview = stripConsentFromObservacoes(client.observacoes ?? "").trim();
  const addressLines = buildAddressLines(client);
  const hasAddress =
    Boolean(addressLines.street) ||
    Boolean(addressLines.locality) ||
    Boolean(addressLines.cep);
  const imovelLabel = client.tipo_imovel
    ? TIPO_IMOVEL_LABELS[client.tipo_imovel] || client.tipo_imovel
    : "";

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

  const submitUpdate = async (form: ClientWizardData) => {
    setEditSaving(true);
    const data = {
      nome: form.nome,
      email: form.email,
      telefone: form.telefone,
      cidade: form.cidade,
      origem: form.origem,
      status: form.status,
      observacoes: form.observacoes,
      tipo_pessoa: form.tipo_pessoa,
      cpf: form.tipo_pessoa === "PF" ? form.documento : undefined,
      cnpj: form.tipo_pessoa === "PJ" ? form.documento : undefined,
      cep: form.cep,
      endereco: form.endereco,
      numero: form.numero,
      bairro: form.bairro,
      uf: form.uf,
      tipo_imovel: form.tipo_imovel,
      obs_imovel: form.obs_imovel,
      obs_entrega: form.obs_entrega,
    };
    const res = await updateClientAction(client.id, data);
    if (res.success) {
      setClient((prev) => ({
        ...prev,
        ...data,
        cpf: data.cpf ?? "",
        cnpj: data.cnpj ?? "",
      }));
      setNotesValue(stripConsentFromObservacoes(form.observacoes ?? ""));
      setIsEditOpen(false);
      showSuccess("Cliente atualizado", `As informações de ${form.nome} foram salvas.`);
      await syncClientDetails();
      setEditSaving(false);
      return { success: true };
    }
    const errMsg =
      res.error || "Ocorreu um erro ao atualizar o cliente. Tente novamente.";
    showError("Não foi possível salvar", errMsg);
    setEditSaving(false);
    return { success: false, error: errMsg };
  };

  const profileCard = (
      <Card className={`p-5 sm:p-6 glass-card ${isFactoryRole ? "space-y-0" : "space-y-4"}`}>
        <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <h1 className="text-2xl font-black text-foreground tracking-tight">{client.nome}</h1>

            {!isOpsLimited && docInfo.documento ? (
              <p className="text-xs font-semibold text-slate-500 select-none">
                {docInfo.tipo_pessoa === "PF" ? "CPF" : "CNPJ"}:{" "}
                {sensitiveHidden ? maskDocument(docInfo.documento) : docInfo.documento}
              </p>
            ) : null}

            {canManage ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground font-medium">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                  {ORIGIN_LABELS[client.origem] || client.origem}
                </span>
                {client.partnerNome ? (
                  <span className="inline-flex items-center gap-1.5 min-w-0">
                    <User className="h-3.5 w-3.5 text-primary shrink-0" />
                    {client.partner_id ? (
                      <Link
                        href={`/parceiros/${client.partner_id}`}
                        className="text-primary hover:underline font-semibold truncate"
                      >
                        {client.partnerNome}
                      </Link>
                    ) : (
                      <span className="truncate">{client.partnerNome}</span>
                    )}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto lg:justify-end">
            {!isFactoryRole ? (
              <>
                <span
                  className={`${META_CHIP} ${
                    STATUS_COLORS[client.status] || "bg-slate-50 text-slate-700 border-slate-200"
                  }`}
                >
                  {STATUS_LABELS[client.status] || client.status}
                </span>
                <span className={`${META_CHIP} bg-slate-50 text-slate-700 border-slate-200`}>
                  {docInfo.tipo_pessoa === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}
                </span>
              </>
            ) : null}

            {!isOpsLimited ? (
              <ClientConsentChip
                consent={resolveClientConsent({
                  lgpd_aceite: client.lgpd_aceite,
                  lgpd_aceite_em: client.lgpd_aceite_em,
                  marketing_aceite: client.marketing_aceite,
                  observacoes: client.observacoes,
                })}
              />
            ) : null}

            {!hideClientContact ? (
              whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white rounded-[var(--radius-sm)] h-8 px-3.5 inline-flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </a>
              ) : (
                <span
                  className={`${META_CHIP} bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed`}
                  title="Revele os dados sensíveis (olho) para abrir o WhatsApp"
                >
                  <MessageCircle className="h-3.5 w-3.5 mr-1" /> WhatsApp
                </span>
              )
            ) : null}

            {canManage ? (
              <Button
                type="button"
                variant="outline"
                className="text-xs font-bold gap-1.5 h-8 px-3.5 rounded-[var(--radius-sm)]"
                onClick={() => setIsEditOpen(true)}
              >
                <Pencil className="h-3.5 w-3.5" /> Editar
              </Button>
            ) : null}
          </div>
        </div>

        {!isFactoryRole ? (
          <>
            {!hideClientContact ? (
              <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border/40 pt-3 text-sm">
                <div className="inline-flex items-center gap-2 min-w-0">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {sensitiveHidden ? (
                    <span className="font-semibold text-foreground select-none tracking-wide">
                      {maskPhone(client.telefone)}
                    </span>
                  ) : whatsappUrl ? (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-emerald-700 hover:underline"
                    >
                      {formatPhoneDisplay(client.telefone)}
                    </a>
                  ) : (
                    <span className="font-semibold text-foreground">
                      {formatPhoneDisplay(client.telefone) || "—"}
                    </span>
                  )}
                </div>
                <div className="inline-flex items-center gap-2 min-w-0">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {sensitiveHidden ? (
                    <span className="font-semibold text-foreground select-none break-all">
                      {hasRealClientEmail(client.email)
                        ? maskEmail(client.email)
                        : formatClientEmailDisplay(client.email)}
                    </span>
                  ) : hasRealClientEmail(client.email) ? (
                    <a
                      href={`mailto:${client.email}`}
                      className="font-semibold text-primary hover:underline break-all"
                    >
                      {formatClientEmailDisplay(client.email)}
                    </a>
                  ) : (
                    <span className="font-semibold text-muted-foreground break-all">
                      {formatClientEmailDisplay(client.email)}
                    </span>
                  )}
                </div>
              </div>
            ) : null}

            <div className="border-t border-border/40 pt-3 space-y-2">
              <div className="flex items-start gap-2 text-sm">
                <Home className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Tipo de imóvel
                  </p>
                  <p className="font-semibold text-foreground">
                    {imovelLabel || "Não informado"}
                  </p>
                  {client.obs_imovel?.trim() ? (
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {client.obs_imovel.trim()}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Endereço
                  </p>
                  {hasAddress ? (
                    <div className="space-y-0.5">
                      {addressLines.street ? (
                        <p className="font-semibold text-foreground">{addressLines.street}</p>
                      ) : null}
                      <p className="text-muted-foreground text-xs">
                        {[addressLines.locality, addressLines.cep ? `CEP ${addressLines.cep}` : ""]
                          .filter(Boolean)
                          .join(" · ") || client.cidade || "—"}
                      </p>
                    </div>
                  ) : (
                    <p className="font-semibold text-foreground">
                      {client.cidade || "Não informado"}
                      {canManage ? (
                        <span className="text-xs font-medium text-muted-foreground ml-1">
                          — complete em Editar
                        </span>
                      ) : null}
                    </p>
                  )}
                </div>
              </div>

              {client.obs_entrega?.trim() ? (
                <div className="flex items-start gap-2 text-sm">
                  <Truck className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      Entrega
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {client.obs_entrega.trim()}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </Card>
  );

  const tabsBlock = (
      <div className="space-y-6">
        <div>
          <div className="relative sm:hidden">
            <select
              value={activeTab}
              onChange={(e) =>
                setActiveTab(
                  e.target.value as
                    | "overview"
                    | "projects"
                    | "finance"
                    | "timeline"
                    | "documents"
                    | "notas"
                )
              }
              className="w-full appearance-none bg-slate-800 border border-slate-700 rounded-[var(--radius-md)] py-3 pl-4 pr-10 text-sm font-bold text-slate-100 shadow-sm outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            >
              <option value="overview">Visão Geral</option>
              <option value="projects">Projetos ({projects.length})</option>
              <option value="documents">Fotos do cliente ({attachments.length})</option>
              {!isOpsLimited && <option value="finance">Financeiro</option>}
              {!isOpsLimited && (
                <option value="timeline">Linha do Tempo (atividades)</option>
              )}
              <option value="notas">Notas (observações)</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          </div>

          <div className="hidden sm:block sm:overflow-x-auto sm:-mx-1 sm:px-1">
            <div className="flex gap-1 p-1 bg-slate-800 border border-slate-700/80 rounded-[var(--radius-md)] w-max min-w-full md:w-fit">
              {(
                [
                  { id: "overview" as const, label: "Visão Geral", icon: User, count: null },
                  {
                    id: "projects" as const,
                    label: "Projetos",
                    icon: Layers,
                    count: projects.length,
                  },
                  {
                    id: "documents" as const,
                    label: "Fotos do cliente",
                    icon: ImageIcon,
                    count: attachments.length,
                  },
                  ...(!isOpsLimited
                    ? [
                        {
                          id: "finance" as const,
                          label: "Financeiro",
                          icon: CreditCard,
                          count: null as number | null,
                        },
                        {
                          id: "timeline" as const,
                          label: "Linha do Tempo",
                          icon: Clock,
                          count: null as number | null,
                        },
                      ]
                    : []),
                  { id: "notas" as const, label: "Notas", icon: FileText, count: null },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-[var(--radius-sm)] text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      active
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-300 hover:text-white hover:bg-slate-700/70"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {tab.label}
                    {tab.count != null ? (
                      <span className="text-[10px] opacity-70 tabular-nums">({tab.count})</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {activeTab === "overview" && (
            <>
              {docInfo.tipo_pessoa === "PJ" && !isOpsLimited && (
                <ClienteContactsSection
                  clientId={client.id}
                  canManage={canManage}
                  showSuccess={showSuccess}
                  showError={showError}
                  confirmAction={confirmAction}
                />
              )}

              <Card className="p-5 glass-card space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-primary" /> Observações
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab("notas")}
                    className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                  >
                    Abrir notas
                  </button>
                </div>
                {notesPreview ? (
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line line-clamp-4">
                    {notesPreview}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Sem observações permanentes. Eventos com data ficam na Linha do Tempo.
                  </p>
                )}
                {!isOpsLimited && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("timeline")}
                    className="text-[11px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Ver histórico de atividades →
                  </button>
                )}
              </Card>
            </>
          )}

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
              hideValues={isOpsLimited}
            />
          )}

          {activeTab === "finance" && !isOpsLimited && (
            <ClienteFinanceTab
              clientId={client.id}
              clientName={client.nome}
              projects={projects}
              payments={payments}
              onPaymentsChange={setPayments}
              onGoToProjects={() => setActiveTab("projects")}
            />
          )}

          {activeTab === "documents" && (
            <ClienteDocumentsTab
              clientId={client.id}
              attachments={attachments}
              onAttachmentsChange={setAttachments}
            />
          )}

          {activeTab === "timeline" && !isOpsLimited && (
            <div className="space-y-6">
              <Card className="p-5 glass-card space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/40 pb-2">
                  <div>
                    <h3 className="text-sm font-black text-foreground uppercase tracking-wider">
                      Registrar atividade
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Histórico comercial com data e autor. Observações permanentes ficam em{" "}
                      <button
                        type="button"
                        onClick={() => setActiveTab("notas")}
                        className="font-bold text-primary hover:underline cursor-pointer"
                      >
                        Notas
                      </button>
                      .
                    </p>
                  </div>
                </div>
                <form onSubmit={handleAddNote} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground block">
                      Assunto / Título
                    </label>
                    <Input
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="border-border bg-slate-50 text-xs py-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground block">
                      Detalhamento
                    </label>
                    <textarea
                      required
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
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
                      <Send className="h-3 w-3" />{" "}
                      {isSubmittingNote ? "Registrando..." : "Publicar no Histórico"}
                    </Button>
                  </div>
                </form>
              </Card>

              <Card className="p-5 glass-card space-y-4">
                <h3 className="text-sm font-black text-foreground uppercase tracking-wider border-b border-border/40 pb-2">
                  Histórico de atividades
                </h3>

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
                              <p className="text-xs text-slate-600 leading-relaxed">
                                {act.descricao}
                              </p>
                            ) : null}
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                                isRegistration
                                  ? "text-emerald-700 bg-emerald-50"
                                  : "text-primary/70 bg-primary/5"
                              }`}
                            >
                              {isRegistration ? (
                                <ShieldCheck className="h-2.5 w-2.5" />
                              ) : (
                                <User className="h-2.5 w-2.5" />
                              )}
                              {isRegistration
                                ? "Registro automático"
                                : `Registrado por: ${act.autor}`}
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

          {activeTab === "notas" && (
            <Card className="p-5 glass-card space-y-3">
              <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-2">
                <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-primary" /> Observações permanentes
                </h3>
                {notesSaved && (
                  <span className="text-[11px] font-bold text-emerald-600">Salvo ✓</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Preferências, restrições e contexto do cliente. Para eventos com data e autor,
                use a{" "}
                {!isOpsLimited ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab("timeline")}
                    className="font-bold text-primary hover:underline cursor-pointer"
                  >
                    Linha do Tempo
                  </button>
                ) : (
                  "Linha do Tempo"
                )}
                .
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
                    <Send className="h-3.5 w-3.5" />{" "}
                    {savingNotes ? "Salvando..." : "Salvar notas"}
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </div>
      </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/clientes"
          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-muted-foreground transition-all flex items-center justify-center cursor-pointer"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </Link>
        <span className="text-xs font-bold text-muted-foreground">Voltar para a lista</span>
      </div>

      {profileCard}
      {tabsBlock}

      <Dialog
        isOpen={isEditOpen}
        onClose={() => {
          if (editSaving) return;
          setIsEditOpen(false);
        }}
        className="w-[min(96vw,56rem)] max-w-[56rem]"
        bodyClassName="max-h-[min(78vh,36rem)] overflow-y-auto"
      >
        <ClienteEditWideForm
          key={`edit-modal-${client.id}-${isEditOpen ? "open" : "closed"}`}
          initial={clientToWizardData(client)}
          saving={editSaving}
          onCancel={() => setIsEditOpen(false)}
          onSubmit={submitUpdate}
        />
      </Dialog>

      <ActionDialogHost dialog={dialog} />
    </div>
  );
}
