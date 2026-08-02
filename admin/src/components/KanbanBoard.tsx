"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { updateProjectStatus, createLead, updateProjectAction, markProjectContacted, markProjectAsLost, restoreProjectFromLoss, addProjectTimelineAction, updateProjectCommercialAction, type ProjectStatus, type Origin } from "@/app/actions/kanban";
import { updateProjectDetails } from "@/app/actions/project";
import { getCrmLiveSnapshot } from "@/app/actions/liveSnapshots";
import { useLiveEntity } from "@/context/LiveSyncContext"
import { usePermissions } from "@/context/PermissionsContext";
import { canMoveCrmCards } from "@/lib/permissions";
import { PrivacyMoney } from "@/components/privacy/PrivacyMoney";
import KanbanNegotiationPanel from "@/components/KanbanNegotiationPanel";
import KanbanOpsPanel from "@/components/KanbanOpsPanel";
import { useSensitiveDisplay } from "@/hooks/useSensitiveDisplay";
import { OPS_FUNNEL_COLUMNS } from "@/lib/crmOpsAccess";
import { hasRealClientEmail } from "@/lib/clientMatch";
import {
  COMMERCIAL_LOSS_STATUSES,
} from "@/lib/notifications";
import {
  FOLLOW_UP_BADGE_STYLES,
  FOLLOW_UP_CARD_STYLES,
  getDaysSinceContact,
  getFollowUpLevel,
  getFollowUpMessage,
  needsFollowUp,
  type FollowUpSlaConfig,
} from "@/lib/followUp";
import {
  CRM_FOLLOW_UP_SLA_PREF_KEY,
  loadFollowUpSlaLocal,
  resolveFollowUpSla,
  saveFollowUpSlaLocal,
} from "@/lib/crmFollowUpPrefs";
import { updateUserPreference } from "@/app/actions/preferences";
import CrmFollowUpSlaSettings from "@/components/CrmFollowUpSlaSettings";
import CommercialPendingPanel from "@/components/CommercialPendingPanel";
import KanbanCardQuoteViews from "@/components/KanbanCardQuoteViews";
import HoverTooltip from "@/components/ui/HoverTooltip";
import { labelOrigin } from "@/lib/navLabels";
import { formatQuoteViewLabel, toQuoteViewStats } from "@/lib/quoteViewTracking";
import {
  formatStageEntryLabel,
  shouldShowStageEntryDate,
} from "@/lib/crmStageDate";
import { ActionDialogHost, useActionDialog } from "@/components/ActionDialogHost";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SegmentControl } from "@/components/ui/segment-control";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/PageHeader";
import { TooltipBody } from "@/components/ui/InfoTooltip";
import {
  getCommercialPendingQuotes,
} from "@/app/actions/quotes";
import {
  Plus, 
  MapPin, 
  Phone,
  Calendar,
  AlertTriangle,
  BellRing,
  RotateCcw,
  XCircle,
  X,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Send,
  ArrowRight,
  Eye,
  ChevronsDownUp,
  ChevronsUpDown,
  UserX,
  Receipt,
} from "lucide-react";
import { createPortal } from "react-dom";
import ReceiptIssueDialog, {
  type ReceiptIssuePrefill,
} from "@/components/finance/ReceiptIssueDialog";
import ConfTecnicaWhatsAppDialog, {
  type ConfTecnicaWhatsAppTarget,
} from "@/components/ConfTecnicaWhatsAppDialog";

/** Etapas em que o lembrete de recibo aparece após aprovação. */
const RECEIPT_REMINDER_STATUSES = new Set([
  "APROVADO",
  "CONFERENCIA_TECNICA",
  "PRODUCAO",
  "INSTALACAO",
]);

interface Project {
  id: string;
  valor_previsto: number;
  status_geral: string;
  ultimo_contato_em?: string | null;
  createdAt?: string | null;
  motivo_perda?: string | null;
  observacoes?: string | null;
  stage_entered_at?: string | null;
  conf_tecnica_resp1_id?: string | null;
  conf_tecnica_resp1Nome?: string | null;
  conf_tecnica_resp2_id?: string | null;
  conf_tecnica_resp2Nome?: string | null;
  /** true quando já existe recibo vinculado a este projeto. */
  hasPaymentReceipt?: boolean;
  timeline?: Array<{
    id: string;
    acao: string;
    data: string;
    user: {
      name: string;
    };
  }>;
  client: {
    id: string;
    nome: string;
    cidade: string;
    origem: string;
    telefone: string;
    email: string;
    tipo_pessoa?: string | null;
    cnpj?: string | null;
    cep?: string | null;
    endereco?: string | null;
    numero?: string | null;
    bairro?: string | null;
    uf?: string | null;
    tipo_imovel?: string | null;
    obs_imovel?: string | null;
    obs_entrega?: string | null;
  };
  briefing?: {
    id: string;
    ambientes: string;
    tipo_imovel: string;
    fase_projeto: string;
    pronto: string;
    data_chaves?: string | null;
    tem_projeto: string;
    estilo: string;
    faixa_investimento?: string | null;
    prazo_inicio: string;
    pinterest_link?: string | null;
    referencia_url?: string | null;
    origem_lead: string;
    utm_source?: string | null;
    utm_medium?: string | null;
    utm_campaign?: string | null;
    gclid?: string | null;
    fbclid?: string | null;
    ip?: string | null;
    user_agent?: string | null;
    dispositivo?: string | null;
    os?: string | null;
    resolution?: string | null;
    idioma?: string | null;
    tempo_preenchimento?: number | null;
    score: number;
    roteiro_sugerido?: string | null;
    createdAt?: string | null;
  } | null;
  quoteShare?: {
    sharedAt: string | null;
    viewCount: number;
    firstViewedAt: string | null;
    lastViewedAt: string | null;
    neverOpened: boolean;
    lastDevice?: string | null;
    lastOs?: string | null;
    lastDeviceLabel?: string | null;
  } | null;
}

interface KanbanBoardProps {
  initialProjects: Project[];
  companyId: string;
  initialFollowUpSla?: Partial<FollowUpSlaConfig> | null;
  colaboradores?: Array<{ id: string; name: string; cargo: string; image?: string | null }>;
  clients?: Array<{
    id: string;
    nome: string;
    email: string;
    telefone: string;
    cidade: string;
    origem: Origin;
    tipo_pessoa?: string | null;
    cnpj?: string | null;
    cep?: string | null;
    endereco?: string | null;
    numero?: string | null;
    bairro?: string | null;
    uf?: string | null;
    tipo_imovel?: string | null;
    obs_imovel?: string | null;
    obs_entrega?: string | null;
  }>;
}

const FUNNEL_COLUMNS: { id: ProjectStatus; title: string }[] = [
  { id: "LEAD", title: "Prospecção" },
  { id: "ORCAMENTO", title: "Orçamentos" },
  { id: "NEGOCIACAO", title: "Negociação" },
  { id: "APROVADO", title: "Aprovados" },
  { id: "CONFERENCIA_TECNICA", title: "Conf. Técnica" },
  { id: "PRODUCAO", title: "Produção" },
];

/** Avanço rápido: próxima etapa segue a ordem visual das colunas do funil. */
function getNextFunnelStatus(
  current: string,
  columns: { id: ProjectStatus }[] = FUNNEL_COLUMNS
): ProjectStatus | null {
  const order = columns.map((c) => c.id);
  const idx = order.indexOf(current as ProjectStatus);
  if (idx < 0 || idx >= order.length - 1) return null;
  return order[idx + 1];
}

/** Tema visual por etapa — cabeçalho colorido; cards filhos só com borda e sombra. */
const STAGE_THEME: Record<
  string,
  {
    header: string;
    cardBorder: string;
    cardShadow: string;
    cardHover: string;
    dropRing: string;
  }
> = {
  LEAD: {
    header: "border-t-[3px] border-t-blue-500 bg-gradient-to-b from-blue-500/15 to-transparent text-blue-900",
    cardBorder: "border-blue-500/45",
    cardShadow: "shadow-[0_2px_10px_-4px_rgba(59,130,246,0.3)]",
    cardHover: "hover:border-blue-500/75 hover:shadow-[0_4px_14px_-3px_rgba(59,130,246,0.4)]",
    dropRing: "ring-blue-500/35",
  },
  ORCAMENTO: {
    header: "border-t-[3px] border-t-amber-500 bg-gradient-to-b from-amber-500/15 to-transparent text-amber-900",
    cardBorder: "border-amber-500/45",
    cardShadow: "shadow-[0_2px_10px_-4px_rgba(245,158,11,0.35)]",
    cardHover: "hover:border-amber-500/75 hover:shadow-[0_4px_14px_-3px_rgba(245,158,11,0.45)]",
    dropRing: "ring-amber-500/35",
  },
  NEGOCIACAO: {
    header: "border-t-[3px] border-t-orange-500 bg-gradient-to-b from-orange-500/15 to-transparent text-orange-900",
    cardBorder: "border-orange-500/45",
    cardShadow: "shadow-[0_2px_10px_-4px_rgba(249,115,22,0.35)]",
    cardHover: "hover:border-orange-500/75 hover:shadow-[0_4px_14px_-3px_rgba(249,115,22,0.45)]",
    dropRing: "ring-orange-500/35",
  },
  CONFERENCIA_TECNICA: {
    header: "border-t-[3px] border-t-purple-500 bg-gradient-to-b from-purple-500/15 to-transparent text-purple-900",
    cardBorder: "border-purple-500/45",
    cardShadow: "shadow-[0_2px_10px_-4px_rgba(168,85,247,0.35)]",
    cardHover: "hover:border-purple-500/75 hover:shadow-[0_4px_14px_-3px_rgba(168,85,247,0.45)]",
    dropRing: "ring-purple-500/35",
  },
  APROVADO: {
    header: "border-t-[3px] border-t-emerald-500 bg-gradient-to-b from-emerald-500/15 to-transparent text-emerald-900",
    cardBorder: "border-emerald-500/45",
    cardShadow: "shadow-[0_2px_10px_-4px_rgba(16,185,129,0.35)]",
    cardHover: "hover:border-emerald-500/75 hover:shadow-[0_4px_14px_-3px_rgba(16,185,129,0.45)]",
    dropRing: "ring-emerald-500/35",
  },
  PRODUCAO: {
    header: "border-t-[3px] border-t-cyan-500 bg-gradient-to-b from-cyan-500/15 to-transparent text-cyan-900",
    cardBorder: "border-cyan-500/45",
    cardShadow: "shadow-[0_2px_10px_-4px_rgba(6,182,212,0.35)]",
    cardHover: "hover:border-cyan-500/75 hover:shadow-[0_4px_14px_-3px_rgba(6,182,212,0.45)]",
    dropRing: "ring-cyan-500/35",
  },
  INSTALACAO: {
    header: "border-t-[3px] border-t-indigo-500 bg-gradient-to-b from-indigo-500/15 to-transparent text-indigo-900",
    cardBorder: "border-indigo-500/45",
    cardShadow: "shadow-[0_2px_10px_-4px_rgba(99,102,241,0.35)]",
    cardHover: "hover:border-indigo-500/75 hover:shadow-[0_4px_14px_-3px_rgba(99,102,241,0.45)]",
    dropRing: "ring-indigo-500/35",
  },
  FINALIZADO: {
    header: "border-t-[3px] border-t-slate-500 bg-gradient-to-b from-slate-500/15 to-transparent text-slate-800",
    cardBorder: "border-slate-500/45",
    cardShadow: "shadow-[0_2px_10px_-4px_rgba(100,116,139,0.35)]",
    cardHover: "hover:border-slate-500/65 hover:shadow-[0_4px_14px_-3px_rgba(100,116,139,0.4)]",
    dropRing: "ring-slate-500/35",
  },
  PERDIDO: {
    header: "border-t-[3px] border-t-rose-500 bg-gradient-to-b from-rose-500/15 to-transparent text-rose-900",
    cardBorder: "border-rose-500/45",
    cardShadow: "shadow-[0_2px_10px_-4px_rgba(244,63,94,0.35)]",
    cardHover: "hover:border-rose-500/75 hover:shadow-[0_4px_14px_-3px_rgba(244,63,94,0.45)]",
    dropRing: "ring-rose-500/35",
  },
};

function getStageTheme(status: string) {
  return STAGE_THEME[status] ?? STAGE_THEME.LEAD;
}

const STATUS_OPTIONS = [
  ...FUNNEL_COLUMNS,
  { id: "PERDIDO" as ProjectStatus, title: "Perdido" },
];

const COLUMN_DESCRIPTIONS: Record<string, string> = {
  LEAD: "Prospecção: Cadastro e qualificação de novos contatos interessados em móveis sob medida.",
  ORCAMENTO: "Orçamentos: Levantamento de necessidades do cliente e formulação de propostas comerciais.",
  NEGOCIACAO: "Negociação: Apresentação da proposta, rodadas de negociação e termos do contrato comercial.",
  APROVADO: "Aprovados: orçamento aprovado. Atribua até 2 responsáveis pela conferência técnica no cliente antes de avançar.",
  CONFERENCIA_TECNICA: "Conf. Técnica: visita/revisão no cliente. Ao entrar, o sistema oferece mensagem no WhatsApp pedindo datas. Ao concluir, avance para Produção — aí o projeto entra na fila da fábrica.",
  PRODUCAO: "Produção: projeto liberado para o chão de fábrica. O card fica atenuado e a fila de produção assume.",
  INSTALACAO: "Instalação: Logística de transporte e montagem dos móveis no endereço do cliente.",
  FINALIZADO: "Finalizados: Conferência final pós-instalação, termo de encerramento assinado e entrega final realizada.",
};



  const getProductionProgress = (projId: string, status: string) => {
    if (status === "FINALIZADO") return "Entregue e Finalizado 100%";
    if (status === "INSTALACAO") return "Montagem na Obra (Ajustes Finais)";
    
    const lastChar = projId.charAt(projId.length - 1);
    if (lastChar === "1" || lastChar === "5") return "Fábrica: Fila de Produção";
    if (lastChar === "2" || lastChar === "6") return "Fábrica: Corte / Usinagem (60%)";
    return "Fábrica: Montagem Interna (80%)";
  };

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function PersonAvatar({
  name,
  image,
  title,
  tone = "primary",
}: {
  name: string;
  image?: string | null;
  title: string;
  tone?: "primary" | "secondary";
}) {
  const toneClass =
    tone === "primary"
      ? "bg-emerald-600 text-white"
      : "bg-secondary text-muted-foreground";

  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={name}
        title={title}
        className="h-6 w-6 rounded-full object-cover ring-2 ring-card"
      />
    );
  }

  return (
    <span
      className={`flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-card text-[9px] font-bold ${toneClass}`}
      title={title}
    >
      {getInitials(name)}
    </span>
  );
}

type BoardView = "funil" | "perdas" | "pendencias";

/** Mobile: Funil ativo sempre visível + dropdown com Pendências/Perdas. */
function BoardViewMobileSwitch({
  value,
  onChange,
  pendingCount,
  lostCount,
}: {
  value: BoardView;
  onChange: (v: BoardView) => void;
  pendingCount: number;
  lostCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const menuWidth = 240;
      const pad = 8;
      const left = Math.max(
        pad,
        Math.min(rect.left, window.innerWidth - menuWidth - pad)
      );
      setPos({ top: rect.bottom + 6, left });
    };
    place();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
    };
  }, [open]);

  const secondaryOptions: {
    value: Exclude<BoardView, "funil">;
    label: string;
    badge: number;
  }[] = [
    {
      value: "pendencias",
      label: "Pendências comerciais",
      badge: pendingCount,
    },
    { value: "perdas", label: "Perdas", badge: lostCount },
  ];

  const currentSecondary = secondaryOptions.find((o) => o.value === value);
  const moreBadge = pendingCount + lostCount;
  const triggerLabel = currentSecondary?.label ?? "Mais";

  const menu = open ? (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Outras visualizações"
      className="fixed z-[9999] w-[240px] rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl"
      style={{ top: pos.top, left: pos.left }}
    >
      {secondaryOptions.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="menuitem"
            className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium transition-colors ${
              active
                ? "bg-slate-100 text-slate-900"
                : "text-slate-700 hover:bg-slate-50"
            }`}
            onClick={() => {
              onChange(opt.value);
              setOpen(false);
            }}
          >
            <span>{opt.label}</span>
            {opt.badge > 0 ? (
              <span className="segment-control-badge">{opt.badge}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <div className="segment-control w-full max-w-full" role="tablist" aria-label="Visualização do funil">
      <button
        type="button"
        role="tab"
        aria-selected={value === "funil"}
        onClick={() => onChange("funil")}
        className={`segment-control-item flex-1 ${
          value === "funil" ? "segment-control-item-active" : ""
        }`}
      >
        Funil ativo
      </button>
      <button
        ref={triggerRef}
        type="button"
        role="tab"
        aria-selected={value !== "funil"}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`segment-control-item gap-1.5 max-w-[55%] ${
          value !== "funil" ? "segment-control-item-active" : ""
        }`}
      >
        <span className="truncate">{triggerLabel}</span>
        {value === "funil" && moreBadge > 0 ? (
          <span className="segment-control-badge">{moreBadge}</span>
        ) : currentSecondary && currentSecondary.badge > 0 ? (
          <span className="segment-control-badge">{currentSecondary.badge}</span>
        ) : null}
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 opacity-70 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {mounted && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}

export default function KanbanBoard({
  initialProjects,
  companyId,
  clients = [],
  colaboradores = [],
  initialFollowUpSla = null,
}: KanbanBoardProps) {
  const { isReadOnly, isOpsLimited, role } = usePermissions();
  const isFactoryRole = role === "PRODUCAO";
  const canMoveCards = canMoveCrmCards(role);
  const hideClientContact = isOpsLimited;
  const funnelColumns = isOpsLimited ? OPS_FUNNEL_COLUMNS : FUNNEL_COLUMNS;
  const sensitive = useSensitiveDisplay();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const [isEditLeadOpen, setIsEditLeadOpen] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<"negociacao" | "briefing">("negociacao");
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptProject, setReceiptProject] = useState<Project | null>(null);
  const [receiptPrefill, setReceiptPrefill] = useState<ReceiptIssuePrefill | null>(null);
  
  // Estados comerciais e de timeline
  const [editingObservacoes, setEditingObservacoes] = useState("");
  const [newTimelineText, setNewTimelineText] = useState("");
  const [editingProjectTimeline, setEditingProjectTimeline] = useState<any[]>([]);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingStatusGeral, setEditingStatusGeral] = useState<ProjectStatus>("LEAD");
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ProjectStatus | null>(null);
  const [didDrag, setDidDrag] = useState(false);
  const [boardView, setBoardView] = useState<"funil" | "perdas" | "pendencias">("funil");
  useEffect(() => {
    if (isOpsLimited && boardView !== "funil") {
      setBoardView("funil");
    }
  }, [isOpsLimited, boardView]);
  const [pendingCount, setPendingCount] = useState(0);
  const [lossModalProject, setLossModalProject] = useState<Project | null>(null);
  const [lossMotivo, setLossMotivo] = useState("");
  const [confTecnicaWhatsApp, setConfTecnicaWhatsApp] =
    useState<ConfTecnicaWhatsAppTarget | null>(null);
  // Cards começam minimizados; só entram neste set quando o operador expande.
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [cardInnerTab, setCardInnerTab] = useState<Record<string, "geral" | "aberturas">>({});
  const [copiedScript, setCopiedScript] = useState(false);
  const [followUpSla, setFollowUpSla] = useState<FollowUpSlaConfig>(() =>
    resolveFollowUpSla(initialFollowUpSla)
  );
  const [bannersExpanded, setBannersExpanded] = useState(false);
  const autoLossRunningRef = useRef(false);
  

  const [loading, setLoading] = useState(false);

  const syncCrm = useCallback(async () => {
    const result = await getCrmLiveSnapshot(companyId);
    if (result.success && result.projects) {
      setProjects(result.projects as Project[]);
    }
  }, [companyId]);

  useLiveEntity("crm", {
    sync: syncCrm,
    enabled: !activeDragId && !loading && !isEditLeadOpen && !lossModalProject,
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await getCommercialPendingQuotes();
      if (!cancelled && res.success) {
        setPendingCount(res.data.length);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projects, boardView]);

  useEffect(() => {
    if (boardView !== "funil") setBannersExpanded(false);
  }, [boardView]);

  useEffect(() => {
    const local = loadFollowUpSlaLocal();
    // Preferência salva no servidor tem prioridade; local cobre 1ª visita sem prop.
    if (initialFollowUpSla) {
      setFollowUpSla(resolveFollowUpSla(initialFollowUpSla));
    } else {
      setFollowUpSla(local);
    }
  }, [initialFollowUpSla]);

  const handleSaveFollowUpSla = (next: FollowUpSlaConfig) => {
    setFollowUpSla(next);
    saveFollowUpSlaLocal(next);
    void updateUserPreference(CRM_FOLLOW_UP_SLA_PREF_KEY, next);
  };

  const dialog = useActionDialog();
  const { showSuccess, showError, confirmAction } = dialog;
  const [leadForm, setLeadForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    cidade: "",
    origem: "INSTAGRAM" as Origin,
    valor_previsto: "",
    cnpj: "",
    cep: "",
    endereco: "",
    numero: "",
    bairro: "",
    uf: "",
    tipo_imovel: "CASA",
    obs_imovel: "",
    obs_entrega: ""
  });

  // Funções de autocompletar via API
  const fetchAddressByCep = async (cepValue: string) => {
    const cleanCep = cepValue.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setLeadForm(prev => ({
            ...prev,
            cep: cepValue,
            endereco: data.logradouro || "",
            bairro: data.bairro || "",
            cidade: data.localidade || "",
            uf: data.uf || ""
          }));
        }
      } catch (err) {
        console.error("Erro ao buscar CEP:", err);
      }
    }
  };

  const fetchCompanyByCnpj = async (cnpjValue: string) => {
    const cleanCnpj = cnpjValue.replace(/\D/g, "");
    if (cleanCnpj.length === 14) {
      setLoading(true);
      try {
        const { fetchCnpjCompany } = await import("@/lib/cnpjClient");
        const result = await fetchCnpjCompany(cleanCnpj);
        if (result.ok) {
          const data = result.data;
          setLeadForm(prev => ({
            ...prev,
            cnpj: cnpjValue,
            nome: data.nome_fantasia || data.razao_social || "",
            email: data.email || prev.email || "",
            cep: data.cep || prev.cep || "",
            endereco: data.logradouro || prev.endereco || "",
            numero: data.numero || prev.numero || "",
            bairro: data.bairro || prev.bairro || "",
            cidade: data.municipio || prev.cidade || "",
            uf: data.uf || prev.uf || ""
          }));
          
          if (data.cep) {
            fetchAddressByCep(data.cep);
          }
        }
      } catch (err) {
        console.error("Erro ao buscar CNPJ:", err);
      }
      setLoading(false);
    }
  };

  const openEditModal = (project: Project) => {
    setEditingProjectId(project.id);
    setEditingStatusGeral(project.status_geral as ProjectStatus);
    setEditingObservacoes(project.observacoes || "");
    setEditingProjectTimeline(project.timeline || []);
    setActiveModalTab(project.briefing ? "briefing" : "negociacao");
    setLeadForm({
      nome: project.client.nome,
      email: hasRealClientEmail(project.client.email) ? project.client.email : "",
      telefone: project.client.telefone,
      cidade: project.client.cidade,
      origem: project.client.origem as Origin,
      valor_previsto: project.valor_previsto.toString(),
      cnpj: project.client.cnpj || "",
      cep: project.client.cep || "",
      endereco: project.client.endereco || "",
      numero: project.client.numero || "",
      bairro: project.client.bairro || "",
      uf: project.client.uf || "",
      tipo_imovel: project.client.tipo_imovel || "CASA",
      obs_imovel: project.client.obs_imovel || "",
      obs_entrega: project.client.obs_entrega || ""
    });
    setIsEditLeadOpen(true);
  };

  const promptConfTecnicaWhatsApp = (project: Project) => {
    setConfTecnicaWhatsApp({
      projectId: project.id,
      clientName: project.client.nome,
      clientPhone: project.client.telefone || "",
      responsaveis: [
        project.conf_tecnica_resp1Nome,
        project.conf_tecnica_resp2Nome,
      ].filter((name): name is string => Boolean(name)),
    });
  };

  const handleEditLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || isFactoryRole || !editingProjectId) return;
    setLoading(true);

    const data = {
      valor_previsto: Number(leadForm.valor_previsto) || 0,
      status_geral: editingStatusGeral,
      observacoes: editingObservacoes
    };

    const previous = projects.find((p) => p.id === editingProjectId);
    const enteringConfTecnica =
      data.status_geral === "CONFERENCIA_TECNICA" &&
      previous?.status_geral !== "CONFERENCIA_TECNICA";

    const result = await updateProjectCommercialAction(editingProjectId, data);

    if (result.success) {
      setProjects(projects.map(p => {
        if (p.id === editingProjectId) {
          return {
            ...p,
            valor_previsto: isOpsLimited ? p.valor_previsto : data.valor_previsto,
            status_geral: data.status_geral,
            observacoes: data.observacoes,
            stage_entered_at:
              data.status_geral !== p.status_geral
                ? new Date().toISOString()
                : p.stage_entered_at,
          };
        }
        return p;
      }));
      setIsEditLeadOpen(false);
      resetLeadForm();
      showSuccess(
        "Alterações salvas",
        isOpsLimited
          ? "Os dados operacionais do projeto foram salvos."
          : "Os dados comerciais do projeto foram salvos."
      );
      if (enteringConfTecnica && previous) {
        promptConfTecnicaWhatsApp({
          ...previous,
          client: {
            ...previous.client,
            nome: leadForm.nome || previous.client.nome,
            telefone: leadForm.telefone || previous.client.telefone,
          },
        });
      }
    } else {
      showError("Erro ao salvar", result.error || "Não foi possível salvar as alterações.");
    }
    setLoading(false);
  };

  const handleAddTimeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || !editingProjectId || !newTimelineText.trim()) return;
    setLoading(true);

    const result = await addProjectTimelineAction(editingProjectId, newTimelineText);
    if (result.success && result.timelineItem) {
      const updatedTimeline = [result.timelineItem, ...editingProjectTimeline];
      setEditingProjectTimeline(updatedTimeline);
      
      setProjects(projects.map(p => {
        if (p.id === editingProjectId) {
          return {
            ...p,
            timeline: updatedTimeline
          };
        }
        return p;
      }));

      setNewTimelineText("");
      showSuccess("Histórico registrado", "A anotação foi adicionada à linha do tempo.");
    } else {
      showError("Erro", "Não foi possível salvar o histórico.");
    }
    setLoading(false);
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (isReadOnly) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("text/plain", id);
    setActiveDragId(id);
    setDidDrag(false);
  };

  const handleDragEnd = () => {
    setActiveDragId(null);
    setDragOverColumn(null);
    window.setTimeout(() => setDidDrag(false), 0);
  };

  const handleDragOver = (e: React.DragEvent, columnId: ProjectStatus) => {
    if (isReadOnly) return;
    e.preventDefault();
    if (dragOverColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: ProjectStatus) => {
    e.preventDefault();
    if (isReadOnly) return;
    const id = e.dataTransfer.getData("text/plain");
    const movedProject = projects.find((p) => p.id === id);
    const enteringConfTecnica =
      targetStatus === "CONFERENCIA_TECNICA" &&
      movedProject?.status_geral !== "CONFERENCIA_TECNICA";
    
    // - Atualiza o estado local imediatamente (Optimistic Update)
    const originalProjects = [...projects];
    const updated = projects.map(p => p.id === id ? { ...p, status_geral: targetStatus, stage_entered_at: new Date().toISOString() } : p);
    setProjects(updated);
    
    // Reseta drag over feedback
    setDragOverColumn(null);
    setActiveDragId(null);
    setDidDrag(true);

    // Persiste no banco de dados via Server Action
    const result = await updateProjectStatus(id, targetStatus);
    if (!result.success) {
      // Reverte se der erro
      setProjects(originalProjects);
      showError("Falha ao mover", "Não foi possível mover o projeto. Tente novamente.");
    } else if (enteringConfTecnica && movedProject) {
      promptConfTecnicaWhatsApp(movedProject);
    }
  };

  const handleCardClick = (project: Project) => {
    if (didDrag || activeDragId) return;
    openEditModal(project);
  };

  // Avança o projeto para a próxima etapa do funil (usado no mobile, onde não há drag & drop)
  const handleAdvanceStage = async (project: Project) => {
    if (!canMoveCards) return;
    const next = getNextFunnelStatus(project.status_geral, funnelColumns);
    if (!next) return;
    const enteringConfTecnica = next === "CONFERENCIA_TECNICA";

    const originalProjects = [...projects];
    setProjects(projects.map((p) => (p.id === project.id ? { ...p, status_geral: next, stage_entered_at: new Date().toISOString() } : p)));

    const result = await updateProjectStatus(project.id, next);
    if (!result.success) {
      setProjects(originalProjects);
      showError("Falha ao avançar", result.error || "Não foi possível mover o projeto para a próxima etapa.");
    } else {
      const nextTitle = funnelColumns.find((c) => c.id === next)?.title || "próxima etapa";
      showSuccess("Projeto avançado", `${project.client.nome} → ${nextTitle}.`);
      if (enteringConfTecnica) {
        promptConfTecnicaWhatsApp(project);
      }
    }
  };

  const handleMarkContacted = async (project: Project) => {
    if (isReadOnly) return;
    const now = new Date().toISOString();
    setProjects(
      projects.map((p) =>
        p.id === project.id ? { ...p, ultimo_contato_em: now } : p
      )
    );
    const result = await markProjectContacted(project.id);
    if (result.success) {
      showSuccess("Contato registrado", `Follow-up de ${project.client.nome} atualizado para hoje.`);
    } else {
      showError("Erro", "Não foi possível registrar o contato.");
    }
  };

  const handleConfirmLoss = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || !lossModalProject) return;
    setLoading(true);

    const result = await markProjectAsLost(lossModalProject.id, lossMotivo);
    if (result.success) {
      setProjects(
        projects.map((p) =>
          p.id === lossModalProject.id
            ? { ...p, status_geral: "PERDIDO", motivo_perda: lossMotivo || null }
            : p
        )
      );
      setLossModalProject(null);
      setLossMotivo("");
      showSuccess("Lead marcado como perda", `${lossModalProject.client.nome} foi movido para Perdas.`);
    } else {
      showError("Erro", "Não foi possível registrar a perda.");
    }
    setLoading(false);
  };

  const handleRestoreLoss = async (project: Project) => {
    if (isReadOnly) return;
    setLoading(true);
    const result = await restoreProjectFromLoss(project.id, "LEAD");
    if (result.success) {
      const now = new Date().toISOString();
      setProjects(
        projects.map((p) =>
          p.id === project.id
            ? { ...p, status_geral: "LEAD", motivo_perda: null, ultimo_contato_em: now }
            : p
        )
      );
      showSuccess("Lead reativado", `${project.client.nome} voltou para Prospecção.`);
      setBoardView("funil");
    } else {
      showError("Erro", "Não foi possível reativar o lead.");
    }
    setLoading(false);
  };

  // resetLeadForm
  const resetLeadForm = () => {
    setEditingProjectId(null);
    setLeadForm({
      nome: "",
      email: "",
      telefone: "",
      cidade: "",
      origem: "INSTAGRAM" as Origin,
      valor_previsto: "",
      cnpj: "",
      cep: "",
      endereco: "",
      numero: "",
      bairro: "",
      uf: "",
      tipo_imovel: "CASA",
      obs_imovel: "",
      obs_entrega: ""
    });
  };




  const toggleCardCollapse = (id: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const funnelProjects = projects.filter((p) => p.status_geral !== "PERDIDO");
  const lostProjects = projects.filter((p) => p.status_geral === "PERDIDO");
  const visibleBoardProjects = boardView === "funil" ? funnelProjects : lostProjects;
  const allCardsCollapsed =
    visibleBoardProjects.length === 0 ||
    visibleBoardProjects.every((p) => !expandedCards.has(p.id));

  const toggleAllCardsCollapse = () => {
    if (allCardsCollapsed) {
      setExpandedCards(new Set(visibleBoardProjects.map((p) => p.id)));
      return;
    }
    setExpandedCards(new Set());
  };

  const followUpLosses = funnelProjects.filter(
    (p) => getFollowUpLevel(p, followUpSla) === "loss"
  );
  const followUpAlerts = funnelProjects.filter(
    (p) => getFollowUpLevel(p, followUpSla) === "alert"
  );
  const followUpWarnings = funnelProjects.filter(
    (p) => getFollowUpLevel(p, followUpSla) === "warning"
  );
  const followUpBannerCount =
    followUpLosses.length + followUpAlerts.length + followUpWarnings.length;

  // Auto-move para Perdas quando o operador ativou essa opção no SLA.
  useEffect(() => {
    if (isReadOnly || !followUpSla.autoMoveToLoss || autoLossRunningRef.current) return;

    const candidates = projects.filter(
      (p) =>
        p.status_geral !== "PERDIDO" && getFollowUpLevel(p, followUpSla) === "loss"
    );
    if (candidates.length === 0) return;

    autoLossRunningRef.current = true;
    let cancelled = false;

    void (async () => {
      try {
        const movedIds: string[] = [];
        for (const project of candidates) {
          const days = getDaysSinceContact(project);
          const motivo = `Sem retorno há ${days} dias (SLA)`;
          const result = await markProjectAsLost(project.id, motivo);
          if (cancelled) return;
          if (result.success) movedIds.push(project.id);
        }

        if (cancelled || movedIds.length === 0) return;

        setProjects((prev) =>
          prev.map((p) =>
            movedIds.includes(p.id)
              ? {
                  ...p,
                  status_geral: "PERDIDO",
                  motivo_perda: `Sem retorno há ${getDaysSinceContact(p)} dias (SLA)`,
                }
              : p
          )
        );
        showSuccess(
          "SLA de perdas aplicado",
          `${movedIds.length} lead(s) movido(s) automaticamente para Perdas.`
        );
      } finally {
        if (!cancelled) autoLossRunningRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
      autoLossRunningRef.current = false;
    };
  }, [projects, followUpSla, showSuccess, isReadOnly]);

  const openReceiptForProject = (project: Project) => {
    setReceiptProject(project);
    setReceiptPrefill({
      projectId: project.id,
      valor: Number(project.valor_previsto) || undefined,
      referente: "Pagamento referente a móveis sob medida",
      quitacao: "PARCIAL",
    });
    setReceiptOpen(true);
  };

  const renderProjectCard = (project: Project, colId?: ProjectStatus) => {
    const isDraggingThis = activeDragId === project.id;
    const followLevel = getFollowUpLevel(project, followUpSla);
    const followMessage = getFollowUpMessage(project, followUpSla);
    const canMarkLoss =
      !isOpsLimited &&
      COMMERCIAL_LOSS_STATUSES.includes(project.status_geral as ProjectStatus);
    const showFollowUp = needsFollowUp(project.status_geral);
    const isCollapsed = !expandedCards.has(project.id);
    const stageStatus = colId ?? project.status_geral;
    const theme = getStageTheme(stageStatus);
    const quoteShareLabel = formatQuoteViewLabel(
      toQuoteViewStats({
        pdf_shared_at: project.quoteShare?.sharedAt,
        pdf_view_count: project.quoteShare?.viewCount,
        pdf_first_viewed_at: project.quoteShare?.firstViewedAt,
        pdf_last_viewed_at: project.quoteShare?.lastViewedAt,
        pdf_last_device: project.quoteShare?.lastDevice,
        pdf_last_os: project.quoteShare?.lastOs,
      })
    );
    const showQuoteShareBadge =
      !isOpsLimited &&
      Boolean(quoteShareLabel) &&
      ["LEAD", "ORCAMENTO", "NEGOCIACAO"].includes(project.status_geral);
    const hasQuoteShareTab = !isOpsLimited && Boolean(project.quoteShare?.sharedAt);
    const needsReceiptReminder =
      !isOpsLimited &&
      !project.hasPaymentReceipt &&
      RECEIPT_REMINDER_STATUSES.has(project.status_geral);
    const innerTab = cardInnerTab[project.id] ?? "geral";

    const actionButtons = !isReadOnly && !isFactoryRole ? (
      <div className="kanban-card-actions">
        {showFollowUp && boardView === "funil" && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              confirmAction({
                title: "Registrar Contato",
                message: "Deseja confirmar que um novo contato de follow-up foi realizado hoje com este lead?",
                confirmLabel: "Confirmar",
                cancelLabel: "Cancelar",
                onConfirm: () => handleMarkContacted(project)
              });
            }}
            className="kanban-card-action bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
            title="Registrar que houve contato hoje"
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </button>
        )}
        {canMarkLoss && boardView === "funil" && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              confirmAction({
                title: "Descartar Lead",
                message: "Tem certeza que deseja marcar este projeto comercial como perdido/descartado?",
                confirmLabel: "Sim, descartar",
                cancelLabel: "Cancelar",
                onConfirm: () => {
                  setLossModalProject(project);
                  setLossMotivo("");
                }
              });
            }}
            className="kanban-card-action bg-red-500/10 text-red-700 border border-red-500/20"
            title="Marcar como perda"
          >
            <XCircle className="h-3.5 w-3.5" />
          </button>
        )}
        {project.status_geral === "PERDIDO" && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              confirmAction({
                title: "Reativar Lead",
                message: "Deseja restaurar este lead descartado de volta para o funil comercial ativo?",
                confirmLabel: "Reativar",
                cancelLabel: "Cancelar",
                onConfirm: () => handleRestoreLoss(project)
              });
            }}
            className="kanban-card-action bg-cyan-500/10 text-cyan-700 border border-cyan-500/20"
            title="Reativar lead"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    ) : null;

    const canDragCard =
      canMoveCards && boardView === "funil" && !isMobile;

    return (
      <div
        key={project.id}
        draggable={canDragCard}
        onDragStart={(e) => handleDragStart(e, project.id)}
        onDragEnd={handleDragEnd}
        onClick={() => handleCardClick(project)}
        className={`group kanban-card kanban-card-stage overflow-hidden border ${
          !isFactoryRole && project.client.tipo_pessoa === "PJ" ? "border-indigo-500/50 shadow-xs ring-1 ring-indigo-50" : theme.cardBorder
        } ${theme.cardShadow} ${theme.cardHover} ${
          canDragCard
            ? "cursor-grab active:cursor-grabbing"
            : "cursor-pointer"
        } ${
          isDraggingThis ? "opacity-35 scale-[0.98] border-dashed" : ""
        } ${followLevel === "ok" || isOpsLimited ? "" : FOLLOW_UP_CARD_STYLES[followLevel]} ${
          project.status_geral === "PRODUCAO" ? "opacity-45 grayscale-[30%] bg-slate-50/70 border-slate-300" : ""
        }`}
      >
        <div className="space-y-[var(--space-2)]">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                {!isOpsLimited && (
                  <span
                    className="text-[9px] font-semibold px-1.5 py-0.5 rounded tracking-wide uppercase border border-border bg-secondary/60 text-muted-foreground"
                  >
                    {labelOrigin(project.client.origem)}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground flex items-center font-medium">
                  <MapPin className="h-2.5 w-2.5 mr-0.5 shrink-0" />
                  {project.client.cidade}
                </span>
              </div>
              <h4 className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors leading-snug">
                {project.client.nome}
              </h4>
              {shouldShowStageEntryDate(project.status_geral) ? (
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground/90 min-w-0">
                  <Calendar className="h-3 w-3 opacity-70 shrink-0" />
                  <span
                    className="tabular-nums tracking-tight whitespace-nowrap truncate"
                    title={
                      formatStageEntryLabel(project.status_geral, project.stage_entered_at) ||
                      "Data não registrada"
                    }
                  >
                    {formatStageEntryLabel(project.status_geral, project.stage_entered_at) ||
                      "Data não registrada"}
                  </span>
                </p>
              ) : !hideClientContact ? (
                <p className="flex items-center gap-1 text-xs text-muted-foreground min-w-0">
                  <Phone className="h-3 w-3 opacity-80 text-primary shrink-0" />
                  <span className="tabular-nums whitespace-nowrap truncate">
                    {sensitive.phone(project.client.telefone)}
                  </span>
                </p>
              ) : null}
            </div>

            <div className="flex items-start gap-1.5 shrink-0">
              {(project.conf_tecnica_resp1Nome || project.conf_tecnica_resp2Nome) &&
                (project.status_geral === "APROVADO" ||
                  project.status_geral === "CONFERENCIA_TECNICA" ||
                  project.status_geral === "PRODUCAO") && (
                  <div className="flex items-center -space-x-1 pt-0.5">
                    {project.conf_tecnica_resp1Nome && (
                      <PersonAvatar
                        name={project.conf_tecnica_resp1Nome}
                        image={
                          colaboradores.find((c) => c.id === project.conf_tecnica_resp1_id)
                            ?.image
                        }
                        title={`Conf. técnica: ${project.conf_tecnica_resp1Nome}`}
                        tone="primary"
                      />
                    )}
                    {project.conf_tecnica_resp2Nome && (
                      <PersonAvatar
                        name={project.conf_tecnica_resp2Nome}
                        image={
                          colaboradores.find((c) => c.id === project.conf_tecnica_resp2_id)
                            ?.image
                        }
                        title={`Conf. técnica: ${project.conf_tecnica_resp2Nome}`}
                        tone="secondary"
                      />
                    )}
                  </div>
                )}
              <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                toggleCardCollapse(project.id);
              }}
              className="p-1.5 rounded-md bg-secondary hover:bg-secondary/80 text-muted-foreground border border-border transition-all cursor-pointer shrink-0 opacity-70 group-hover:opacity-100"
              title={isCollapsed ? "Expandir card" : "Recolher card"}
            >
              {isCollapsed ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronUp className="h-3.5 w-3.5" />
              )}
            </button>
            </div>
          </div>

          {followMessage && !isOpsLimited ? (
            <HoverTooltip
              content={
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Follow-up
                  </p>
                  <p>{followMessage}</p>
                </div>
              }
            >
              <div
                className={`flex w-full min-w-0 items-center gap-1 text-[9px] font-semibold px-1.5 py-1 rounded-md border leading-tight ${FOLLOW_UP_BADGE_STYLES[followLevel as "warning" | "alert" | "loss"]}`}
              >
                {followLevel === "loss" ? (
                  <UserX className="h-3 w-3 shrink-0" />
                ) : followLevel === "alert" ? (
                  <BellRing className="h-3 w-3 shrink-0" />
                ) : (
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                )}
                <span className="truncate">{followMessage}</span>
              </div>
            </HoverTooltip>
          ) : null}

          {showQuoteShareBadge && quoteShareLabel ? (
            <HoverTooltip
              content={
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Link da proposta
                  </p>
                  <p>{quoteShareLabel}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {project.quoteShare?.neverOpened
                      ? "O link foi enviado, mas o cliente ainda não abriu."
                      : project.quoteShare?.lastDeviceLabel
                        ? `Último dispositivo: ${project.quoteShare.lastDeviceLabel}`
                        : "Histórico completo na aba Aberturas do card."}
                  </p>
                </div>
              }
            >
              <div
                className={`flex w-full min-w-0 items-center gap-1 text-[9px] font-semibold px-1.5 py-1 rounded-md border leading-tight ${
                  project.quoteShare?.neverOpened
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : "bg-sky-50 text-sky-800 border-sky-200"
                }`}
              >
                <Eye className="h-3 w-3 shrink-0" />
                <span className="truncate">{quoteShareLabel}</span>
              </div>
            </HoverTooltip>
          ) : null}

          {needsReceiptReminder ? (
            <HoverTooltip
              content={
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Recibo pendente
                  </p>
                  <p>
                    Proposta aprovada — emita o recibo e informe a forma de
                    pagamento. O aviso some após a emissão.
                  </p>
                </div>
              }
            >
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isReadOnly) return;
                  openReceiptForProject(project);
                }}
                disabled={isReadOnly}
                className="flex w-full min-w-0 items-center gap-1 text-[9px] font-bold px-1.5 py-1 rounded-md border leading-tight bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Receipt className="h-3 w-3 shrink-0" />
                <span className="truncate">Gerar recibo · informar pagamento</span>
              </button>
            </HoverTooltip>
          ) : null}

          <div
            className={`grid transition-all duration-200 ease-in-out ${
              isCollapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
            }`}
          >
            <div className="overflow-hidden">
              <div className="space-y-2 border-t border-border/70 pt-2">
                {hasQuoteShareTab ? (
                  <div
                    className="inline-flex w-full items-center gap-0.5 rounded-lg bg-slate-100/90 p-0.5 border border-slate-200/70"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setCardInnerTab((prev) => ({ ...prev, [project.id]: "geral" }))
                      }
                      className={`flex-1 rounded-md px-2 py-1 text-[9px] font-bold transition-colors ${
                        innerTab === "geral"
                          ? "bg-white text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Geral
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCardInnerTab((prev) => ({ ...prev, [project.id]: "aberturas" }))
                      }
                      className={`flex-1 rounded-md px-2 py-1 text-[9px] font-bold transition-colors inline-flex items-center justify-center gap-1 ${
                        innerTab === "aberturas"
                          ? "bg-white text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Eye className="h-3 w-3" />
                      Aberturas
                      {project.quoteShare?.viewCount ? (
                        <span className="tabular-nums opacity-70">
                          ({project.quoteShare.viewCount})
                        </span>
                      ) : null}
                    </button>
                  </div>
                ) : null}

                {innerTab === "aberturas" && hasQuoteShareTab ? (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <KanbanCardQuoteViews
                      projectId={project.id}
                      active={!isCollapsed && innerTab === "aberturas"}
                    />
                  </div>
                ) : (
                <div className="space-y-2">
                  {showFollowUp ? (
                    <p className="text-[10px] text-muted-foreground/80">
                      Último contato: há {getDaysSinceContact(project)} dia(s)
                    </p>
                  ) : null}

                  {(project.status_geral === "APROVADO" ||
                    project.status_geral === "CONFERENCIA_TECNICA") && (
                    <div
                      className="space-y-1.5"
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <span className="text-[9px] font-semibold uppercase tracking-wide block text-emerald-800">
                        Conf. Técnica — responsáveis
                      </span>
                      {isFactoryRole ? (
                        <p className="text-[10px] font-semibold text-slate-700 bg-white border border-emerald-200 rounded-lg px-2 py-1.5">
                          {[project.conf_tecnica_resp1Nome, project.conf_tecnica_resp2Nome]
                            .filter(Boolean)
                            .join(" · ") || "Nenhum responsável atribuído"}
                        </p>
                      ) : (
                        <>
                      <select
                        value={project.conf_tecnica_resp1_id || "none"}
                        disabled={isReadOnly || loading || colaboradores.length === 0}
                        onChange={async (e) => {
                          const nextId = e.target.value;
                          const prev = project.conf_tecnica_resp1_id || null;
                          const nome =
                            nextId === "none"
                              ? null
                              : colaboradores.find((c) => c.id === nextId)?.name || null;
                          setProjects((list) =>
                            list.map((p) =>
                              p.id === project.id
                                ? {
                                    ...p,
                                    conf_tecnica_resp1_id: nextId === "none" ? null : nextId,
                                    conf_tecnica_resp1Nome: nome,
                                  }
                                : p
                            )
                          );
                          const res = await updateProjectDetails(project.id, {
                            conf_tecnica_resp1_id: nextId,
                          });
                          if (!res.success) {
                            setProjects((list) =>
                              list.map((p) =>
                                p.id === project.id
                                  ? {
                                      ...p,
                                      conf_tecnica_resp1_id: prev,
                                      conf_tecnica_resp1Nome: project.conf_tecnica_resp1Nome || null,
                                    }
                                  : p
                              )
                            );
                            showError("Erro", res.error || "Não foi possível salvar o responsável.");
                          }
                        }}
                        className="w-full h-8 rounded-lg border border-emerald-200 bg-white text-[10px] font-semibold text-slate-700 px-2 cursor-pointer outline-none"
                      >
                        <option value="none">Responsável 1…</option>
                        {colaboradores.map((c) => (
                          <option
                            key={c.id}
                            value={c.id}
                            disabled={c.id === project.conf_tecnica_resp2_id}
                          >
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={project.conf_tecnica_resp2_id || "none"}
                        disabled={isReadOnly || loading || colaboradores.length === 0}
                        onChange={async (e) => {
                          const nextId = e.target.value;
                          const prev = project.conf_tecnica_resp2_id || null;
                          const nome =
                            nextId === "none"
                              ? null
                              : colaboradores.find((c) => c.id === nextId)?.name || null;
                          setProjects((list) =>
                            list.map((p) =>
                              p.id === project.id
                                ? {
                                    ...p,
                                    conf_tecnica_resp2_id: nextId === "none" ? null : nextId,
                                    conf_tecnica_resp2Nome: nome,
                                  }
                                : p
                            )
                          );
                          const res = await updateProjectDetails(project.id, {
                            conf_tecnica_resp2_id: nextId,
                          });
                          if (!res.success) {
                            setProjects((list) =>
                              list.map((p) =>
                                p.id === project.id
                                  ? {
                                      ...p,
                                      conf_tecnica_resp2_id: prev,
                                      conf_tecnica_resp2Nome: project.conf_tecnica_resp2Nome || null,
                                    }
                                  : p
                              )
                            );
                            showError("Erro", res.error || "Não foi possível salvar o responsável.");
                          }
                        }}
                        className="w-full h-8 rounded-lg border border-emerald-200 bg-white text-[10px] font-semibold text-slate-700 px-2 cursor-pointer outline-none"
                      >
                        <option value="none">Responsável 2 (opcional)…</option>
                        {colaboradores.map((c) => (
                          <option
                            key={c.id}
                            value={c.id}
                            disabled={c.id === project.conf_tecnica_resp1_id}
                          >
                            {c.name}
                          </option>
                        ))}
                      </select>
                        </>
                      )}
                    </div>
                  )}

                  {(project.status_geral === "PRODUCAO" ||
                    project.status_geral === "INSTALACAO" ||
                    project.status_geral === "FINALIZADO") && (
                    <div>
                      <span className="text-[9px] font-semibold uppercase tracking-wide block mb-1 text-muted-foreground">
                        Fábrica & Montagem
                      </span>
                      <div className="text-[10px] text-muted-foreground bg-white border border-border py-1.5 px-2 rounded-lg font-medium">
                        {getProductionProgress(project.id, project.status_geral)}
                      </div>
                    </div>
                  )}

                  {project.status_geral === "PERDIDO" && project.motivo_perda && (
                    <div>
                      <span className="text-[9px] font-semibold uppercase tracking-wide block mb-1 text-muted-foreground">
                        Motivo da perda
                      </span>
                      <p className="text-[10px] text-muted-foreground bg-white border border-border rounded-lg p-2">
                        {project.motivo_perda}
                      </p>
                    </div>
                  )}
                </div>
                )}

                {/* Div Flex simples para alinhar botões sem margens negativas que quebrem as bordas */}
                {!isFactoryRole && (
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 select-none">
                  {actionButtons}

                  <div className="flex items-center gap-2">
                      {!hideClientContact && (
                      <a
                        href={sensitive.whatsappHref(project.client.telefone) || undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        className="kanban-card-action bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all cursor-pointer rounded"
                        style={{
                          minWidth: "1.625rem",
                          minHeight: "1.625rem",
                          padding: "0.25rem",
                        }}
                        title="Iniciar conversa no WhatsApp"
                      >
                        <svg
                          className="fill-current"
                          style={{ width: "0.875rem", height: "0.875rem" }}
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.965C16.59 1.978 14.12 .952 11.5 .952c-5.442 0-9.866 4.372-9.87 9.799-.001 1.702.451 3.361 1.307 4.8l-.988 3.606 3.698-.951zM17.5 14.77c-.3-.15-1.785-.88-2.067-.98-.28-.1-.49-.15-.69.15-.2.3-.78 1-.96 1.2-.18.2-.36.22-.66.07-.3-.15-1.27-.47-2.42-1.49-.89-.8-1.5-1.78-1.67-2.08-.18-.3-.02-.46.13-.61.14-.13.3-.35.45-.5.15-.15.2-.25.3-.4.1-.15.05-.3-.02-.46-.07-.15-.69-1.67-.95-2.29-.25-.62-.51-.53-.69-.53-.18 0-.38-.02-.58-.02-.2 0-.53.07-.8.38-.28.3-1.06 1.04-1.06 2.53 0 1.49 1.08 2.93 1.23 3.13.15.2 2.13 3.25 5.16 4.56.72.3 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.09 1.79-.73 2.04-1.43.25-.7.25-1.3.17-1.43-.08-.13-.28-.21-.58-.36z"/>
                        </svg>
                      </a>
                      )}

                    {/* Avançar etapa — só no mobile, onde não há drag & drop */}
                    {canMoveCards &&
                      isMobile &&
                      boardView === "funil" &&
                      getNextFunnelStatus(project.status_geral, funnelColumns) && (
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAdvanceStage(project);
                        }}
                        className="kanban-card-action bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all cursor-pointer rounded flex items-center justify-center"
                        style={{
                          minWidth: "1.625rem",
                          minHeight: "1.625rem",
                          padding: "0.25rem",
                        }}
                        title={`Avançar para ${funnelColumns.find((c) => c.id === getNextFunnelStatus(project.status_geral, funnelColumns))?.title || "próxima etapa"}`}
                      >
                        <ArrowRight style={{ width: "0.875rem", height: "0.875rem" }} />
                      </button>
                    )}
                  </div>
                </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-[var(--space-3)] overflow-hidden">
      <div className="shrink-0 print:hidden">
        <PageHeader
          title="Funil Comercial"
          description={
            isFactoryRole
              ? undefined
              : "Gerencie as etapas de negociação e fabricação dos móveis sob medida. Projetista e Fábrica veem a partir de Aprovados."
          }
          help={
            isFactoryRole ? undefined : (
              <TooltipBody
                title="Funil de vendas"
                items={[
                  "Arraste os cards entre as colunas para avançar cada negócio de etapa.",
                  "Em Aprovados, atribua até 2 responsáveis pela conferência técnica no cliente antes de avançar.",
                  "Ao mover para Conf. Técnica, o sistema oferece mensagem no WhatsApp pedindo datas da visita.",
                  "Só ao entrar em Produção o projeto aparece na fila do chão de fábrica.",
                  "Projetista e Fábrica: colunas a partir de Aprovados, sem valores comerciais.",
                  "No mobile, use o botão de avançar dentro do card.",
                  "Totais e telefone começam ocultos; use os olhos do topo para revelar (voltam a ocultar em 30s).",
                  "Na engrenagem, configure os prazos de aviso, alerta e perdas do follow-up.",
                ]}
              />
            )
          }
        >
          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={toggleAllCardsCollapse}
              disabled={visibleBoardProjects.length === 0}
              className="inline-flex items-center justify-center p-2 rounded-xl bg-white hover:bg-slate-50 text-muted-foreground hover:text-foreground border border-border shadow-xs transition-all duration-200 cursor-pointer group disabled:opacity-40 disabled:pointer-events-none"
              title={
                allCardsCollapsed
                  ? "Expandir todos os cards"
                  : "Minimizar todos os cards"
              }
              aria-label={
                allCardsCollapsed
                  ? "Expandir todos os cards"
                  : "Minimizar todos os cards"
              }
            >
              {allCardsCollapsed ? (
                <ChevronsUpDown className="h-4.5 w-4.5 text-primary group-hover:scale-105 transition-transform" />
              ) : (
                <ChevronsDownUp className="h-4.5 w-4.5 group-hover:scale-105 transition-transform" />
              )}
            </button>
            {!isReadOnly && !isOpsLimited ? (
              <CrmFollowUpSlaSettings
                sla={followUpSla}
                onSave={handleSaveFollowUpSla}
              />
            ) : null}
          </div>
        </PageHeader>
      </div>

      <div className="flex flex-col gap-3.5 sm:gap-4 shrink-0 mb-2 sm:mb-3">
        {!isOpsLimited ? (
          <>
            <div className="md:hidden">
              <BoardViewMobileSwitch
                value={boardView}
                onChange={setBoardView}
                pendingCount={pendingCount}
                lostCount={lostProjects.length}
              />
            </div>
            <div className="hidden md:block">
              <SegmentControl
                value={boardView}
                onChange={setBoardView}
                aria-label="Visualização do funil"
                options={[
                  { value: "funil", label: "Funil ativo" },
                  {
                    value: "pendencias",
                    label: "Pendências comerciais",
                    badge: pendingCount,
                  },
                  { value: "perdas", label: "Perdas", badge: lostProjects.length },
                ]}
              />
            </div>
          </>
        ) : null}

        {boardView === "funil" &&
          !isOpsLimited &&
          followUpBannerCount > 0 &&
          (!bannersExpanded ? (
            <button
              type="button"
              onClick={() => setBannersExpanded(true)}
              className="self-start inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-lg border border-border/60 bg-white/80 hover:bg-slate-50 transition-colors"
            >
              <BellRing className="h-3.5 w-3.5" />
              Mostrar {followUpBannerCount} aviso
              {followUpBannerCount === 1 ? "" : "s"} de follow-up
            </button>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="flex flex-1 items-center gap-2 overflow-x-auto overscroll-x-contain pb-0.5 -mx-0.5 px-0.5 scrollbar-none text-xs min-w-0"
                role="status"
                aria-label="Avisos de follow-up"
              >
                {followUpLosses.length > 0 && (
                  <span className="inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-600/10 text-rose-900 border border-rose-600/25 font-semibold whitespace-nowrap">
                    <UserX className="h-3.5 w-3.5" />
                    {followUpLosses.length} elegível(is) a perdas ({followUpSla.lossDays}+ dias)
                  </span>
                )}
                {followUpAlerts.length > 0 && (
                  <span className="inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 text-red-800 border border-red-500/20 font-semibold whitespace-nowrap">
                    <BellRing className="h-3.5 w-3.5" />
                    {followUpAlerts.length} sem resposta há {followUpSla.alertDays}+ dias
                  </span>
                )}
                {followUpWarnings.length > 0 && (
                  <span className="inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-800 border border-amber-500/20 font-semibold whitespace-nowrap">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {followUpWarnings.length} próximo(s) do limite ({followUpSla.warningDays}+ dias)
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setBannersExpanded(false)}
                className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border/60 bg-white text-muted-foreground hover:text-foreground hover:bg-slate-50 transition-colors"
                title="Ocultar avisos"
                aria-label="Ocultar avisos de follow-up"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
      </div>

      {boardView === "pendencias" ? (
        <div className="flex-1 min-h-0 overflow-y-auto pb-4">
          <CommercialPendingPanel
            onNotify={(type, title, message) => {
              if (type === "success") showSuccess(title, message);
              else showError(title, message);
              void getCommercialPendingQuotes().then((res) => {
                if (res.success) setPendingCount(res.data.length);
              });
              void syncCrm();
            }}
          />
        </div>
      ) : boardView === "perdas" ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Leads que não converteram. Você pode reativá-los para o funil quando fizer sentido retomar a negociação.
          </p>
          {lostProjects.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state-title">Nenhuma perda registrada</p>
              <p className="empty-state-desc">Leads marcados como perda aparecerão aqui.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {lostProjects.map((project) => renderProjectCard(project, "PERDIDO"))}
            </div>
          )}
        </div>
      ) : (
      <div className="flex-1 min-h-0 overflow-x-auto pb-4 custom-scrollbar select-none">
        <div className="flex gap-4 items-stretch h-full min-w-max pb-2 print:flex-col print:h-auto print:min-w-0 print:gap-6">
        {funnelColumns.map((col) => {
          const colProjects = projects.filter((p) => p.status_geral === col.id);
          const colSum = colProjects.reduce((acc, curr) => acc + curr.valor_previsto, 0);
          const isOver = dragOverColumn === col.id;
          const theme = getStageTheme(col.id);

          return (
            <div 
              key={col.id}
              onDragOver={(e) => {
                if (!canMoveCards) return;
                handleDragOver(e, col.id);
              }}
              onDrop={(e) => {
                if (!canMoveCards) return;
                handleDrop(e, col.id);
              }}
              className={`kanban-column flex flex-col h-full rounded-2xl bg-slate-100/75 border border-slate-200/60 shadow-2xs transition-all duration-300 relative ${
                isOver ? `ring-2 ${theme.dropRing} shadow-md scale-[1.01]` : ""
              }`}
            >
              {/* Cabeçalho da Coluna */}
              <div className={`p-3.5 pb-2 ${theme.header} rounded-t-2xl flex items-center justify-between`}>
                <div className="flex items-center space-x-2 min-w-0">
                  {!isFactoryRole && (
                    <div className="relative group/tooltip flex items-center shrink-0">
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-primary transition-colors cursor-help" />
                      <div className="absolute bottom-full left-0 mb-2 w-64 p-2.5 bg-slate-950 text-slate-100 text-[11px] rounded-lg shadow-xl border border-slate-800 opacity-0 pointer-events-none group-hover/tooltip:opacity-100 group-hover/tooltip:pointer-events-auto transition-all duration-200 z-50 leading-relaxed font-normal normal-case translate-y-1 group-hover/tooltip:translate-y-0">
                        {COLUMN_DESCRIPTIONS[col.id]}
                        <div className="absolute top-full left-4 -mt-1 border-[5px] border-transparent border-t-slate-950"></div>
                      </div>
                    </div>
                  )}
                  <span className="font-bold text-xs uppercase tracking-wide truncate">{col.title}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground shrink-0">
                    {colProjects.length}
                  </span>
                </div>
                {!isOpsLimited && colSum > 0 && (
                  <PrivacyMoney value={colSum} className="text-xs font-bold text-foreground shrink-0 ml-2" />
                )}
              </div>

              {/* Lista de Cards */}
              <div 
                className="flex-1 p-2.5 space-y-2.5 overflow-y-auto custom-scrollbar min-h-0"
                onDragLeave={() => setDragOverColumn(null)}
              >
                {colProjects.length === 0 ? (
                  <div className="h-full flex items-center justify-center border border-dashed border-border rounded-xl p-6 text-center text-xs text-muted-foreground/60">
                    Nenhum projeto nesta etapa
                  </div>
                ) : (
                  colProjects.map((project) => renderProjectCard(project, col.id))
                )}
              </div>
            </div>
          );
        })}
        </div>
      </div>
      )}

      {/* Modal - Marcar perda */}
      <Dialog
        isOpen={!!lossModalProject}
        onClose={() => {
          if (loading) return;
          setLossModalProject(null);
          setLossMotivo("");
        }}
      >
        <h3 className="text-lg font-bold tracking-tight text-foreground mb-2">
          Registrar perda
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          {lossModalProject
            ? `O lead ${lossModalProject.client.nome} será movido para Perdas.`
            : ""}
        </p>
        <form onSubmit={handleConfirmLoss} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Motivo (opcional)
            </label>
            <textarea
              value={lossMotivo}
              onChange={(e) => setLossMotivo(e.target.value)}
              rows={3}
              className="w-full p-2.5 text-xs bg-slate-50 border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none resize-none"
            />
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setLossModalProject(null);
                setLossMotivo("");
              }}
              disabled={loading}
              className="w-full sm:w-auto text-xs font-bold"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-red-600 hover:bg-red-700 text-white border-none w-full sm:w-auto text-xs font-bold">
              {loading ? "Salvando..." : "Confirmar perda"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal - Card do Kanban / Negociação */}
      <Dialog
        isOpen={isEditLeadOpen}
        onClose={() => setIsEditLeadOpen(false)}
        className={`${
          isOpsLimited ? "max-w-lg" : "max-w-2xl"
        } w-full overflow-hidden shadow-2xl kanban-lead-dialog`}
        bodyClassName={
          isMobile
            ? "modal-panel-body-fill"
            : "p-0 overflow-y-auto max-h-[min(88svh,920px)]"
        }
        fullscreen={isMobile}
      >
        {(() => {
          const currentProject = projects.find((p) => p.id === editingProjectId);
          if (!currentProject) return null;
          const hasBriefing = !isOpsLimited && !!currentProject.briefing;
          const canMarkLoss =
            !isOpsLimited &&
            COMMERCIAL_LOSS_STATUSES.includes(
              currentProject.status_geral as ProjectStatus
            );

          return (
            <div className="flex flex-col flex-1 min-h-0 h-full">
              {hasBriefing ? (
                <div className="flex border-b border-slate-200/80 bg-white sticky top-0 z-20 shrink-0 pr-12">
                  <button
                    type="button"
                    onClick={() => setActiveModalTab("negociacao")}
                    className={`flex-1 py-3 text-xs font-bold transition-colors cursor-pointer ${
                      activeModalTab === "negociacao"
                        ? "text-amber-900 border-b-2 border-amber-600 bg-amber-50/40"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Negociação
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveModalTab("briefing")}
                    className={`flex-1 py-3 text-xs font-bold transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                      activeModalTab === "briefing"
                        ? "text-amber-900 border-b-2 border-amber-600 bg-amber-50/40"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    Briefing
                  </button>
                </div>
              ) : null}

              {activeModalTab === "briefing" && currentProject.briefing ? (
                <div className="p-5 sm:p-6 bg-[#f8f7f5] flex-1 min-h-0 overflow-y-auto overscroll-contain">
<div className="space-y-5 animate-in fade-in duration-200">
                  {/* Grid de duas colunas assimétricas para UX Copilot */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    
                    {/* Coluna da Esquerda: Inteligência de Perfil & Script AI (lg:col-span-5) */}
                    <div className="lg:col-span-5 space-y-4">
                      {/* Cartão de Perfil AI Diagnostics */}
                      <div className="bg-gradient-to-br from-amber-500/[0.03] to-amber-600/[0.08] border border-amber-500/20 rounded-2xl p-4.5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">
                              Unghero AI Diagnostics
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 text-[9px] font-black uppercase">
                            Perfil Qualificado
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 pt-1">
                          <div className="bg-white/80 border border-slate-100 rounded-xl p-2.5 text-center space-y-0.5 shadow-sm">
                            <span className="text-[9px] text-slate-400 font-semibold block uppercase tracking-wider">Afinidade</span>
                            <strong className="text-base text-slate-800 font-black">
                              {currentProject.briefing.tem_projeto === "Sim" ? "95%" : "80%"}
                            </strong>
                          </div>
                          <div className="bg-white/80 border border-slate-100 rounded-xl p-2.5 text-center space-y-0.5 shadow-sm">
                            <span className="text-[9px] text-slate-400 font-semibold block uppercase tracking-wider">Temperatura</span>
                            <strong className={`text-base font-black ${
                              currentProject.briefing.prazo_inicio === "Imediato" || currentProject.briefing.prazo_inicio === "Menos de 3 meses"
                                ? "text-orange-600"
                                : "text-emerald-600"
                            }`}>
                              {currentProject.briefing.prazo_inicio === "Imediato" || currentProject.briefing.prazo_inicio === "Menos de 3 meses"
                                ? "Quente 🔥"
                                : "Morno ⚡"}
                            </strong>
                          </div>
                        </div>

                        <div className="space-y-2 text-xs pt-0.5">
                          <div className="flex justify-between items-center bg-white/40 px-2.5 py-1.5 rounded-lg border border-slate-200/20">
                            <span className="text-slate-500 font-medium">Estilo Principal:</span>
                            <strong className="text-slate-800 font-bold">{currentProject.briefing.estilo || "Não especificado"}</strong>
                          </div>
                          <div className="flex justify-between items-center bg-white/40 px-2.5 py-1.5 rounded-lg border border-slate-200/20">
                            <span className="text-slate-500 font-medium">Investimento:</span>
                            <strong className="text-slate-800 font-bold">{currentProject.briefing.faixa_investimento || "Não informado"}</strong>
                          </div>
                          <div className="flex justify-between items-center bg-white/40 px-2.5 py-1.5 rounded-lg border border-slate-200/20">
                            <span className="text-slate-500 font-medium">Início Pretendido:</span>
                            <strong className="text-slate-800 font-bold">{currentProject.briefing.prazo_inicio || "Não especificado"}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Script de Abordagem AI */}
                      {currentProject.briefing.roteiro_sugerido && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 space-y-3.5 shadow-sm">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 flex-wrap gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                              </span>
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                Roteiro de Abordagem
                              </span>
                            </div>

                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  if (currentProject.briefing?.roteiro_sugerido) {
                                    navigator.clipboard.writeText(currentProject.briefing.roteiro_sugerido);
                                    setCopiedScript(true);
                                    setTimeout(() => setCopiedScript(false), 2000);
                                  }
                                }}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-all duration-200 cursor-pointer ${
                                  copiedScript
                                    ? "bg-emerald-500 border-emerald-600 text-white shadow-sm"
                                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 active:scale-95"
                                }`}
                              >
                                {copiedScript ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                {copiedScript ? "Copiado!" : "Copiar"}
                              </button>

                              <a
                                href={sensitive.whatsappHref(currentProject.client.telefone) || undefined}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 border border-emerald-600 text-white text-[10px] font-bold shadow-sm active:scale-95 transition-all duration-200 cursor-pointer"
                              >
                                <Send className="h-3 w-3" />
                                WhatsApp
                              </a>
                            </div>
                          </div>

                          <div className="relative bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs font-medium">
                            <div className="absolute top-2.5 left-3.5 text-[8px] font-black text-emerald-600 uppercase tracking-wider">
                              Abordagem WhatsApp:
                            </div>
                            <div className="pt-4 text-slate-700 leading-relaxed whitespace-pre-line select-all font-semibold">
                              {currentProject.briefing.roteiro_sugerido}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Coluna da Direita: Ficha Técnica do Briefing (lg:col-span-7) */}
                    <div className="lg:col-span-7 space-y-4">
                      
                      <div className="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm space-y-3.5">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                          📋 1. Ambientes & Escopo
                        </h4>
                        <div className="space-y-3 text-xs">
                          <div>
                            <span className="text-slate-500 font-semibold block mb-1">Ambientes desejados:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {(() => {
                                try {
                                  const list = JSON.parse(currentProject.briefing.ambientes);
                                  return list.map((a: any, idx: number) => (
                                    <span key={idx} className="px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-bold text-[11px]">
                                      {a.nome}{a.opcao ? ` (${a.opcao})` : ""}
                                    </span>
                                  ));
                                } catch (e) {
                                  return <span className="text-slate-800 font-bold">{currentProject.briefing.ambientes}</span>;
                                }
                              })()}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-50">
                            <div>
                              <span className="text-slate-500 font-semibold block">Tipo do imóvel:</span>
                              <strong className="text-slate-900 text-[12px]">{currentProject.briefing.tipo_imovel}</strong>
                            </div>
                            <div>
                              <span className="text-slate-500 font-semibold block">Fase da compra:</span>
                              <strong className="text-slate-900 text-[12px]">{currentProject.briefing.fase_projeto}</strong>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm space-y-3.5">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                          🏠 2. Status do Imóvel & Design
                        </h4>
                        <div className="space-y-3 text-xs">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className="text-slate-500 font-semibold block">Imóvel pronto?</span>
                              <strong className="text-slate-900 text-[12px]">{currentProject.briefing.pronto}</strong>
                            </div>
                            {currentProject.briefing.data_chaves && (
                              <div>
                                <span className="text-slate-500 font-semibold block">Entrega das chaves:</span>
                                <strong className="text-slate-900 text-[12px]">{currentProject.briefing.data_chaves}</strong>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-50">
                            <div>
                              <span className="text-slate-500 font-semibold block">Já possui projeto?</span>
                              <strong className="text-slate-900 text-[12px]">{currentProject.briefing.tem_projeto}</strong>
                            </div>
                            <div>
                              <span className="text-slate-500 font-semibold block">Estilo preferido:</span>
                              <strong className="text-slate-900 text-[12px]">{currentProject.briefing.estilo}</strong>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm space-y-3.5">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                          ⏳ 3. Investimento & Cronograma
                        </h4>
                        <div className="space-y-3 text-xs">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className="text-slate-500 font-semibold block">Expectativa financeira:</span>
                              <strong className="text-slate-900 text-[12px]">{currentProject.briefing.faixa_investimento || "Não informado"}</strong>
                            </div>
                            <div>
                              <span className="text-slate-500 font-semibold block">Pretende iniciar:</span>
                              <strong className="text-slate-900 text-[12px]">{currentProject.briefing.prazo_inicio}</strong>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm space-y-3.5">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                          🔗 4. Referências & Mídia
                        </h4>
                        <div className="space-y-3 text-xs">
                          {currentProject.briefing.pinterest_link && (
                            <div>
                              <span className="text-slate-500 font-semibold block mb-0.5">Painel do Pinterest:</span>
                              <a 
                                href={currentProject.briefing.pinterest_link} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-primary hover:underline font-bold inline-flex items-center gap-1 text-[12px]"
                              >
                                Ver Pinterest <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          )}
                          {currentProject.briefing.referencia_url && (
                            <div>
                              <span className="text-slate-500 font-semibold block mb-0.5">Arquivo de referência / Planta:</span>
                              <a 
                                href={currentProject.briefing.referencia_url} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-emerald-600 hover:underline font-bold inline-flex items-center gap-1 text-[12px]"
                              >
                                Baixar arquivo técnico <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          )}
                          {!currentProject.briefing.pinterest_link && !currentProject.briefing.referencia_url && (
                            <span className="text-muted-foreground italic block">Nenhuma referência compartilhada pelo cliente.</span>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Metadados Técnicos de Origem */}
                  <details className="group border border-slate-100 rounded-xl bg-slate-50/20 overflow-hidden transition-all">
                    <summary className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer list-none flex justify-between items-center group-open:bg-slate-50/60 select-none">
                      🔍 Detalhes Técnicos de Auditoria (UTMs & Dispositivo)
                      <span className="transition-transform group-open:rotate-180">▼</span>
                    </summary>
                    <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] font-medium text-slate-700 leading-relaxed border-t border-slate-100">
                      <div>
                        <span className="text-slate-400 block font-semibold">Dispositivo:</span>
                        <strong>{currentProject.briefing.dispositivo || "Desktop"}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold">Sistema Operacional:</span>
                        <strong>{currentProject.briefing.os || "Desconhecido"}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold">Resolução da Tela:</span>
                        <strong>{currentProject.briefing.resolution || "Não informada"}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold">Idioma:</span>
                        <strong>{currentProject.briefing.idioma || "Não informado"}</strong>
                      </div>
                      {currentProject.briefing.utm_source && (
                        <div>
                          <span className="text-slate-400 block font-semibold">UTM Source:</span>
                          <strong>{currentProject.briefing.utm_source}</strong>
                        </div>
                      )}
                      {currentProject.briefing.utm_medium && (
                        <div>
                          <span className="text-slate-400 block font-semibold">UTM Medium:</span>
                          <strong>{currentProject.briefing.utm_medium}</strong>
                        </div>
                      )}
                      {currentProject.briefing.utm_campaign && (
                        <div>
                          <span className="text-slate-400 block font-semibold">UTM Campaign:</span>
                          <strong>{currentProject.briefing.utm_campaign}</strong>
                        </div>
                      )}
                      {currentProject.briefing.tempo_preenchimento && (
                        <div>
                          <span className="text-slate-400 block font-semibold">Tempo de preenchimento:</span>
                          <strong>{currentProject.briefing.tempo_preenchimento} segundos</strong>
                        </div>
                      )}
                    </div>
                  </details>

                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditLeadOpen(false)}
                      className="text-xs font-bold cursor-pointer w-full sm:w-auto"
                    >
                      Fechar Briefing
                    </Button>
                  </div>
                </div>
                </div>
              ) : isOpsLimited ? (
                <KanbanOpsPanel
                  project={currentProject}
                  leadForm={leadForm}
                  editingStatusGeral={editingStatusGeral}
                  setEditingStatusGeral={setEditingStatusGeral}
                  editingObservacoes={editingObservacoes}
                  setEditingObservacoes={setEditingObservacoes}
                  onSubmit={handleEditLeadSubmit}
                  onClose={() => setIsEditLeadOpen(false)}
                  loading={loading}
                  isReadOnly={isReadOnly}
                  isFactoryRole={isFactoryRole}
                  hideClientContact={hideClientContact}
                  displayPhone={sensitive.phone(leadForm.telefone)}
                  displayEmail={sensitive.email(leadForm.email)}
                  whatsappHref={
                    hideClientContact
                      ? null
                      : sensitive.whatsappHref(currentProject.client.telefone)
                  }
                  reserveCloseSpace={!hasBriefing}
                />
              ) : (
                <KanbanNegotiationPanel
                  project={currentProject}
                  leadForm={leadForm}
                  setLeadForm={setLeadForm}
                  editingStatusGeral={editingStatusGeral}
                  setEditingStatusGeral={setEditingStatusGeral}
                  editingObservacoes={editingObservacoes}
                  setEditingObservacoes={setEditingObservacoes}
                  timeline={editingProjectTimeline}
                  newTimelineText={newTimelineText}
                  setNewTimelineText={setNewTimelineText}
                  onAddTimeline={handleAddTimeline}
                  onSubmit={handleEditLeadSubmit}
                  onClose={() => setIsEditLeadOpen(false)}
                  onMarkContacted={() => handleMarkContacted(currentProject)}
                  onMarkLost={
                    canMarkLoss && !isReadOnly
                      ? () => {
                          setLossModalProject(currentProject);
                          setLossMotivo("");
                          setIsEditLeadOpen(false);
                        }
                      : undefined
                  }
                  followUpSla={followUpSla}
                  loading={loading}
                  isReadOnly={isReadOnly}
                  displayPhone={sensitive.phone(leadForm.telefone)}
                  displayEmail={sensitive.email(leadForm.email)}
                  whatsappHref={sensitive.whatsappHref(currentProject.client.telefone)}
                  reserveCloseSpace={!hasBriefing}
                />
              )}
            </div>
          );
        })()}
      </Dialog>

      <ActionDialogHost dialog={dialog} />

      <ConfTecnicaWhatsAppDialog
        target={confTecnicaWhatsApp}
        onClose={() => setConfTecnicaWhatsApp(null)}
      />

      {receiptProject ? (
        <ReceiptIssueDialog
          open={receiptOpen}
          onClose={() => {
            setReceiptOpen(false);
            setReceiptProject(null);
            setReceiptPrefill(null);
          }}
          clientId={receiptProject.client.id}
          clientName={receiptProject.client.nome}
          projects={[
            {
              id: receiptProject.id,
              label: `${receiptProject.client.nome} · ${receiptProject.status_geral}`,
            },
          ]}
          prefill={receiptPrefill}
          onIssued={() => {
            const projectId = receiptProject.id;
            setProjects((prev) =>
              prev.map((p) =>
                p.id === projectId ? { ...p, hasPaymentReceipt: true } : p
              )
            );
            setReceiptOpen(false);
            setReceiptProject(null);
            setReceiptPrefill(null);
            showSuccess(
              "Recibo emitido",
              "Lembrete removido do card. Você pode abrir o PDF na ficha do cliente."
            );
          }}
        />
      ) : null}
    </div>
  );
}
