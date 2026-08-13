"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Clock,
  FileText,
  Globe,
  ImageIcon,
  Layers,
  Mail,
  MapPin,
  Percent,
  Phone,
  Send,
  ShieldCheck,
  User,
} from "lucide-react";
import type { ParceiroDTO, PartnerActivity } from "@/app/actions/parceiros";
import {
  addParceiroActivityAction,
  updateParceiro,
  updateParceiroObservacoesAction,
} from "@/app/actions/parceiros";
import { getParceiroDetailsLiveSnapshot } from "@/app/actions/liveSnapshots";
import { useLiveEntity } from "@/context/LiveSyncContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getPartnerCommissionTotals,
} from "@/app/actions/partnerCommissions";
import PartnerCommissionsTab from "@/components/PartnerCommissionsTab";
import ParceiroComprovantesTab from "@/components/ParceiroComprovantesTab";
import ParceiroImagesTab from "@/components/parceiros/ParceiroImagesTab";
import { ActionDialogHost, useActionDialog } from "@/components/ActionDialogHost";
import { Card } from "@/components/ui/card";
import HowToAccordion from "@/components/ui/HowToAccordion";
import { PrivacyMoney } from "@/components/privacy/PrivacyMoney";
import { usePrivacy } from "@/context/PrivacyContext";
import { usePermissions } from "@/context/PermissionsContext";
import { canManageParceiros } from "@/lib/permissions";
import { useSensitiveDisplay } from "@/hooks/useSensitiveDisplay";
import {
  PARTNER_TYPE_STYLES,
  formatPartnerRegistro,
  getPartnerRoleLabel,
  labelPartnerOrigem,
} from "@/lib/partnerTypes";
import { PARTNER_QUOTE_CARD_MODE_OPTIONS } from "@/lib/partnerQuoteCard";
import { primaryPortfolioUrl } from "@/lib/portfolioUrls";
import { countPartnerImages } from "@/lib/partnerImages";

type DetailTab =
  | "overview"
  | "projects"
  | "imagens"
  | "comissoes"
  | "comprovantes"
  | "timeline"
  | "notas";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function projectStatusClass(status: string) {
  if (status === "APROVADO" || status === "FINALIZADO") {
    return "bg-emerald-50 text-emerald-700 border-emerald-100";
  }
  if (
    status === "LEAD" ||
    status === "ORCAMENTO" ||
    status === "NEGOCIACAO"
  ) {
    return "bg-blue-50 text-blue-700 border-blue-100";
  }
  if (
    status === "PRODUCAO" ||
    status === "INSTALACAO" ||
    status === "CONFERENCIA_TECNICA"
  ) {
    return "bg-amber-50/70 text-amber-700 border-amber-100";
  }
  return "bg-slate-50 text-slate-700 border-slate-200";
}

interface ParceiroDetailsClientProps {
  initialParceiro: ParceiroDTO;
  initialActivities: PartnerActivity[];
  companyId: string;
}

export default function ParceiroDetailsClient({
  initialParceiro,
  initialActivities,
}: ParceiroDetailsClientProps) {
  const searchParams = useSearchParams();
  const dialog = useActionDialog();
  const { showSuccess, showError, confirmAction } = dialog;
  const { privacyMode, privacyLocked } = usePrivacy();
  const { isOpsLimited, role, isReadOnly } = usePermissions();
  const sensitive = useSensitiveDisplay();
  const canManage = canManageParceiros(role);

  const [parceiro, setParceiro] = useState(initialParceiro);
  const [activities, setActivities] = useState<PartnerActivity[]>(initialActivities);
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState(initialParceiro.observacoes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [togglingAccess, setTogglingAccess] = useState(false);
  const [commissionTotals, setCommissionTotals] = useState<{
    pendente: number;
    pago: number;
  } | null>(null);

  const hidePartnerValues = isOpsLimited;
  const effectivePrivacyMode = isOpsLimited
    ? false
    : privacyLocked || isReadOnly || privacyMode;

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (
      tab === "overview" ||
      tab === "projects" ||
      tab === "imagens" ||
      tab === "comissoes" ||
      tab === "comprovantes" ||
      tab === "timeline" ||
      tab === "notas"
    ) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (
      isOpsLimited &&
      (activeTab === "comissoes" || activeTab === "comprovantes" || activeTab === "timeline")
    ) {
      setActiveTab("overview");
    }
  }, [isOpsLimited, activeTab]);

  const syncParceiroDetails = useCallback(async () => {
    const result = await getParceiroDetailsLiveSnapshot(parceiro.id);
    if (result.success && result.parceiro) {
      setParceiro(result.parceiro);
      if (result.activities) setActivities(result.activities);
      if (typeof result.parceiro.observacoes === "string") {
        setNotesValue(result.parceiro.observacoes);
      }
    }
  }, [parceiro.id]);

  useLiveEntity("parceiros", {
    sync: syncParceiroDetails,
    enabled: !isSubmittingNote && !savingNotes && !togglingAccess,
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await getPartnerCommissionTotals(parceiro.id);
      if (cancelled) return;
      if (res.success) {
        setCommissionTotals({ pendente: res.pendente, pago: res.pago });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [parceiro.id]);

  async function handleTogglePortalAccess() {
    if (!canManage) return;
    const next = !parceiro.ativo;
    confirmAction({
      title: next ? "Liberar portal?" : "Suspender portal?",
      message: next
        ? `${parceiro.nome} poderá entrar em /parceiro com e-mail, telefone e código por e-mail.`
        : `${parceiro.nome} deixará de acessar o portal até nova liberação.`,
      confirmLabel: next ? "Liberar acesso" : "Suspender",
      onConfirm: async () => {
        setTogglingAccess(true);
        try {
          const res = await updateParceiro(parceiro.id, { ativo: next });
          if (!res.success) {
            showError("Não foi possível atualizar", res.error || "Tente novamente.");
            return;
          }
          setParceiro((prev) => ({ ...prev, ativo: next }));
          void syncParceiroDetails();
          showSuccess(
            next ? "Portal liberado" : "Portal suspenso",
            next
              ? "O parceiro já pode solicitar o código de acesso."
              : "O login do parceiro fica bloqueado."
          );
        } finally {
          setTogglingAccess(false);
        }
      },
    });
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage || isReadOnly || !newTitle.trim() || !newDesc.trim()) return;
    setIsSubmittingNote(true);
    setNoteError(null);
    const res = await addParceiroActivityAction(parceiro.id, newTitle, newDesc);
    if (res.success) {
      setActivities((prev) => [res.activity, ...prev]);
      setNewTitle("");
      setNewDesc("");
    } else {
      setNoteError(res.error ?? "Não foi possível salvar a anotação.");
    }
    setIsSubmittingNote(false);
  }

  async function handleSaveNotes(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage || isReadOnly) return;
    setSavingNotes(true);
    setNotesError(null);
    const res = await updateParceiroObservacoesAction(parceiro.id, notesValue);
    if (!res.success) {
      setNotesError(res.error ?? "Não foi possível salvar as notas.");
      setSavingNotes(false);
      return;
    }
    setParceiro((prev) => ({ ...prev, observacoes: notesValue.trim() || null }));
    setNotesSaved(true);
    setSavingNotes(false);
  }

  const style = PARTNER_TYPE_STYLES[parceiro.tipo];
  const Icon = style.icon;
  const registroLabel = formatPartnerRegistro(
    parceiro.tipo,
    parceiro.registro_profissional
  );
  const projects = parceiro.projects ?? [];
  const projectCount = projects.length;
  const totalLinkedValue = projects.reduce(
    (sum, proj) => sum + Number(proj.valor_previsto || 0),
    0
  );
  const imagesCount = countPartnerImages(parceiro.imagens);
  const portfolio = primaryPortfolioUrl(parceiro.portfolioUrl);

  const notesPreview = (parceiro.observacoes ?? "").trim();
  const tabs: { id: DetailTab; label: string; icon: React.ReactNode; hide?: boolean }[] = [
    { id: "overview", label: "Visão geral", icon: <User className="h-3.5 w-3.5" /> },
    {
      id: "projects",
      label: `Projetos (${projectCount})`,
      icon: <Layers className="h-3.5 w-3.5" />,
    },
    {
      id: "imagens",
      label: imagesCount > 0 ? `Imagens (${imagesCount})` : "Imagens",
      icon: <ImageIcon className="h-3.5 w-3.5" />,
    },
    {
      id: "comissoes",
      label: "Comissões",
      icon: <Percent className="h-3.5 w-3.5" />,
      hide: isOpsLimited,
    },
    {
      id: "comprovantes",
      label: "Comprovantes",
      icon: <FileText className="h-3.5 w-3.5" />,
      hide: isOpsLimited,
    },
    {
      id: "timeline",
      label: "Linha do Tempo",
      icon: <Clock className="h-3.5 w-3.5" />,
      hide: isOpsLimited,
    },
    { id: "notas", label: "Notas", icon: <FileText className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/parceiros"
          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-muted-foreground transition-all flex items-center justify-center cursor-pointer"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </Link>
        <span className="text-xs font-bold text-muted-foreground">
          Voltar para Projetistas e Arquitetos
        </span>
      </div>

      <Card className="p-6 glass-card space-y-5">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
          <div className="partner-card-avatar relative flex h-20 w-auto min-w-20 max-w-36 shrink-0">
            {parceiro.fotoUrl ? (
              <img
                src={parceiro.fotoUrl}
                alt={parceiro.nome}
                className="h-full w-auto max-w-36 object-contain"
              />
            ) : (
              <div className="partner-card-avatar-fallback h-20 w-20 text-2xl rounded-[inherit]">
                {getInitials(parceiro.nome)}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1
                className={`text-2xl font-display font-bold text-foreground tracking-tight ${
                  effectivePrivacyMode ? "blur-[6px] select-none" : ""
                }`}
              >
                {parceiro.nome}
              </h1>
              {!parceiro.ativo && (
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                  Aguardando aprovação
                </span>
              )}
              {canManage && (
                <button
                  type="button"
                  disabled={togglingAccess}
                  onClick={() => handleTogglePortalAccess()}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-border bg-white hover:bg-slate-50 text-foreground transition-colors cursor-pointer disabled:opacity-50"
                >
                  {togglingAccess
                    ? "Atualizando…"
                    : parceiro.ativo
                      ? "Suspender portal"
                      : "Liberar portal"}
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="partner-card-badge text-[10px] px-2.5 py-0.5">
                <Icon className="h-3 w-3" />
                {getPartnerRoleLabel(parceiro.tipo, parceiro.nome)}
              </span>
              {parceiro.origem ? (
                <span
                  className="text-[10px] font-bold text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-100"
                  title="Origem do cadastro"
                >
                  Origem: {labelPartnerOrigem(parceiro.origem)}
                </span>
              ) : null}
              {parceiro.cidade && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-muted-foreground bg-white/80 px-2.5 py-0.5 rounded-full border border-border/60">
                  <MapPin className="h-3 w-3" />
                  {parceiro.cidade}
                </span>
              )}
              {(() => {
                const modeOpt = PARTNER_QUOTE_CARD_MODE_OPTIONS.find(
                  (o) => o.value === (parceiro.quote_card_mode ?? "HIDDEN")
                );
                if (!modeOpt) return null;
                return (
                  <span
                    className="text-[10px] font-bold text-muted-foreground bg-white/80 px-2.5 py-0.5 rounded-full border border-border/60"
                    title={modeOpt.hint}
                  >
                    Orçamento: {modeOpt.label}
                  </span>
                );
              })()}
              {registroLabel && (
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {registroLabel}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {parceiro.telefone && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  {sensitive.phone(parceiro.telefone)}
                </span>
              )}
              {parceiro.email && (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {sensitive.email(parceiro.email)}
                </span>
              )}
              {parceiro.escritorio && (
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  {parceiro.escritorio}
                </span>
              )}
              {portfolio && (
                <a
                  href={portfolio}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-primary font-bold hover:underline"
                >
                  <Globe className="h-3.5 w-3.5" />
                  Portfólio
                </a>
              )}
            </div>
          </div>

          {!hidePartnerValues && (
            <div className="grid grid-cols-2 gap-3 w-full md:w-auto md:min-w-[240px]">
              <div className="rounded-xl border border-border/60 bg-white/70 px-3 py-2.5">
                <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                  A pagar
                </p>
                <PrivacyMoney
                  value={commissionTotals?.pendente ?? 0}
                  as="p"
                  className="text-sm font-bold tabular-nums"
                />
              </div>
              <div className="rounded-xl border border-border/60 bg-white/70 px-3 py-2.5">
                <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                  Já pagas
                </p>
                <PrivacyMoney
                  value={commissionTotals?.pago ?? 0}
                  as="p"
                  className="text-sm font-bold tabular-nums"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-slate-100/80 w-fit max-w-full overflow-x-auto">
          {tabs
            .filter((t) => !t.hide)
            .map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-white text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
        </div>
      </Card>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5 space-y-3">
            <HowToAccordion title="Como usar esta ficha" tone="neutral">
              <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed">
                <li>
                  Em <strong className="text-foreground">Comissões</strong>, lance o % depois que o
                  orçamento do cliente for aprovado.
                </li>
                <li>
                  Quando pagar o parceiro, marque como paga na mesma aba.
                </li>
                <li>
                  Em <strong className="text-foreground">Comprovantes</strong>, reabra os documentos
                  já emitidos para imprimir ou enviar ao parceiro.
                </li>
                <li>
                  Na <strong className="text-foreground">Linha do Tempo</strong>, registre ligações,
                  visitas e follow-ups. Observações permanentes ficam em{" "}
                  <strong className="text-foreground">Notas</strong>.
                </li>
                <li>
                  Em <strong className="text-foreground">Imagens</strong>, organize fotos por pastas
                  (portfólio, obras, referências).
                </li>
              </ol>
            </HowToAccordion>
            {!hidePartnerValues && (
              <div className="pt-1 space-y-2">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                  Projetos no CRM
                </p>
                <p className="text-2xl font-display font-bold">{projectCount}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                  Total previsto
                </p>
                <PrivacyMoney
                  value={totalLinkedValue}
                  as="p"
                  className="text-xl font-display font-bold text-gradient-gold"
                />
              </div>
            )}
          </Card>

          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                Observações internas
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
              <p className="text-xs text-foreground/80 leading-relaxed italic bg-slate-50 border border-slate-100 rounded-xl p-3.5 line-clamp-4">
                “{notesPreview}”
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
            <button
              type="button"
              onClick={() => setActiveTab("imagens")}
              className="text-[11px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Abrir imagens por pastas
              {imagesCount > 0 ? ` (${imagesCount})` : ""} →
            </button>
          </Card>
        </div>
      )}

      {activeTab === "projects" && (
        <Card className="p-5 space-y-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">Projetos vinculados no CRM</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Clique no projeto para abrir o card no CRM e acompanhar o andamento.
            </p>
          </div>
          {projects.length === 0 ? (
            <div className="py-10 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
              Nenhum projeto vinculado a este parceiro ainda.
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map((proj) => (
                <Link
                  key={proj.id}
                  href={`/crm?project=${proj.id}`}
                  className="flex items-center justify-between p-3 rounded-xl border border-border/60 hover:border-border bg-card hover:bg-slate-50/80 transition-all text-xs"
                >
                  <div className="min-w-0 pr-3">
                    <p className="font-bold text-foreground truncate">{proj.client.nome}</p>
                    {!hidePartnerValues && (
                      <p className="text-[10px] text-muted-foreground font-bold mt-0.5 privacy-value">
                        {Number(proj.valor_previsto || 0).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${projectStatusClass(
                      proj.status_geral
                    )}`}
                  >
                    {proj.status_geral}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === "imagens" && (
        <ParceiroImagesTab
          partnerId={parceiro.id}
          imagensRaw={parceiro.imagens}
          canManage={canManage && !isReadOnly}
          onImagensChange={(imagens) =>
            setParceiro((prev) => ({ ...prev, imagens }))
          }
          showError={showError}
          confirmAction={confirmAction}
        />
      )}

      {activeTab === "comissoes" && !isOpsLimited && (
        <PartnerCommissionsTab
          initialPartnerId={parceiro.id}
          lockPartnerId
          canManage={canManage}
          showSuccess={showSuccess}
          showError={showError}
          confirmAction={confirmAction}
        />
      )}

      {activeTab === "comprovantes" && !isOpsLimited && (
        <ParceiroComprovantesTab partnerId={parceiro.id} />
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
            {canManage && !isReadOnly ? (
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
            ) : (
              <p className="text-xs text-muted-foreground">
                Seu cargo só visualiza o histórico deste parceiro.
              </p>
            )}
          </Card>

          <Card className="p-5 glass-card space-y-4">
            <h3 className="text-sm font-black text-foreground uppercase tracking-wider border-b border-border/40 pb-2">
              Histórico de atividades
            </h3>
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum evento registrado no histórico deste parceiro.
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
            Preferências, contexto e combinados com o parceiro. Para eventos com data e autor,
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
              disabled={!canManage || isReadOnly}
              className="w-full min-h-40 bg-slate-50 border border-border rounded-xl text-sm p-3 outline-none focus:ring-1 focus:ring-primary leading-relaxed whitespace-pre-line disabled:opacity-70"
            />
            {notesError && (
              <p className="text-xs text-red-600 font-medium">{notesError}</p>
            )}
            {canManage && !isReadOnly && (
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={
                    savingNotes || notesValue === (parceiro.observacoes ?? "")
                  }
                  className="text-xs font-bold gap-1.5 btn-metallic"
                >
                  <Send className="h-3.5 w-3.5" />{" "}
                  {savingNotes ? "Salvando..." : "Salvar notas"}
                </Button>
              </div>
            )}
          </form>
        </Card>
      )}

      <ActionDialogHost dialog={dialog} />
    </div>
  );
}
