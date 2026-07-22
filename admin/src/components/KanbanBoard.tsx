"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { updateProjectStatus, createLead, updateProjectAction, markProjectContacted, markProjectAsLost, restoreProjectFromLoss, addProjectTimelineAction, updateProjectCommercialAction, type ProjectStatus, type Origin } from "@/app/actions/kanban";
import { updateProjectDetails } from "@/app/actions/project";
import { getCrmLiveSnapshot } from "@/app/actions/liveSnapshots";
import { useLiveEntity } from "@/context/LiveSyncContext";
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
import { labelOrigin } from "@/lib/navLabels";
import {
  formatStageEntryLabel,
  shouldShowStageEntryDate,
} from "@/lib/crmStageDate";
import { ActionDialogHost, useActionDialog } from "@/components/ActionDialogHost";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SegmentControl } from "@/components/ui/segment-control";
import { Input } from "@/components/ui/input";
import { maskPhoneLastDigits } from "@/lib/phone";
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
  EyeOff,
  ChevronsDownUp,
  ChevronsUpDown,
  UserX,
} from "lucide-react";

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
}

interface KanbanBoardProps {
  initialProjects: Project[];
  companyId: string;
  initialFollowUpSla?: Partial<FollowUpSlaConfig> | null;
  colaboradores?: Array<{ id: string; name: string; cargo: string }>;
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

/** Tempo em que totais e telefone ficam visíveis após clicar no olho. */
const CRM_SENSITIVE_REVEAL_MS = 30_000;

const FUNNEL_COLUMNS: { id: ProjectStatus; title: string }[] = [
  { id: "LEAD", title: "Prospecção" },
  { id: "ORCAMENTO", title: "Orçamentos" },
  { id: "NEGOCIACAO", title: "Negociação" },
  { id: "APROVADO", title: "Aprovados" },
  { id: "CONFERENCIA_TECNICA", title: "Conf. Técnica" },
  { id: "PRODUCAO", title: "Produção" },
];

/** Avanço rápido: próxima etapa segue a ordem visual das colunas do funil. */
const FUNNEL_ORDER = FUNNEL_COLUMNS.map((c) => c.id);
function getNextFunnelStatus(current: string): ProjectStatus | null {
  const idx = FUNNEL_ORDER.indexOf(current as ProjectStatus);
  if (idx < 0 || idx >= FUNNEL_ORDER.length - 1) return null;
  return FUNNEL_ORDER[idx + 1];
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
  CONFERENCIA_TECNICA: "Conf. Técnica: visita/revisão no cliente. Ao concluir, avance para Produção — aí o projeto entra na fila da fábrica.",
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

export default function KanbanBoard({
  initialProjects,
  companyId,
  clients = [],
  colaboradores = [],
  initialFollowUpSla = null,
}: KanbanBoardProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const [isEditLeadOpen, setIsEditLeadOpen] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<"negociacao" | "briefing">("negociacao");
  
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
  const [pendingCount, setPendingCount] = useState(0);
  const [lossModalProject, setLossModalProject] = useState<Project | null>(null);
  const [lossMotivo, setLossMotivo] = useState("");
  // Cards começam minimizados; só entram neste set quando o operador expande.
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [copiedScript, setCopiedScript] = useState(false);
  // Dados sensíveis sempre começam ocultos nesta tela (não usa preferência global).
  const [valuesHidden, setValuesHidden] = useState(true);
  const revealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [followUpSla, setFollowUpSla] = useState<FollowUpSlaConfig>(() =>
    resolveFollowUpSla(initialFollowUpSla)
  );
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
    return () => {
      if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
    };
  }, []);

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

  const clearRevealTimeout = () => {
    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current);
      revealTimeoutRef.current = null;
    }
  };

  const hideSensitiveValues = () => {
    clearRevealTimeout();
    setValuesHidden(true);
  };

  const toggleSensitiveVisibility = () => {
    if (valuesHidden) {
      setValuesHidden(false);
      clearRevealTimeout();
      revealTimeoutRef.current = setTimeout(() => {
        setValuesHidden(true);
        revealTimeoutRef.current = null;
      }, CRM_SENSITIVE_REVEAL_MS);
      return;
    }
    hideSensitiveValues();
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
        const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
        const data = await res.json();
        if (data && !data.message) {
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
      email: project.client.email,
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

  const handleEditLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProjectId) return;
    setLoading(true);

    const data = {
      valor_previsto: Number(leadForm.valor_previsto) || 0,
      status_geral: editingStatusGeral,
      observacoes: editingObservacoes
    };

    const result = await updateProjectCommercialAction(editingProjectId, data);

    if (result.success) {
      setProjects(projects.map(p => {
        if (p.id === editingProjectId) {
          return {
            ...p,
            valor_previsto: data.valor_previsto,
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
      showSuccess("Alterações salvas", "Os dados comerciais do projeto foram salvos.");
    } else {
      showError("Erro ao salvar", "Não foi possível salvar as alterações comerciais.");
    }
    setLoading(false);
  };

  const handleAddTimeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProjectId || !newTimelineText.trim()) return;
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
    e.preventDefault();
    if (dragOverColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: ProjectStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    
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
    }
  };

  const handleCardClick = (project: Project) => {
    if (didDrag || activeDragId) return;
    openEditModal(project);
  };

  // Avança o projeto para a próxima etapa do funil (usado no mobile, onde não há drag & drop)
  const handleAdvanceStage = async (project: Project) => {
    const next = getNextFunnelStatus(project.status_geral);
    if (!next) return;

    const originalProjects = [...projects];
    setProjects(projects.map((p) => (p.id === project.id ? { ...p, status_geral: next, stage_entered_at: new Date().toISOString() } : p)));

    const result = await updateProjectStatus(project.id, next);
    if (!result.success) {
      setProjects(originalProjects);
      showError("Falha ao avançar", "Não foi possível mover o projeto para a próxima etapa.");
    } else {
      const nextTitle = FUNNEL_COLUMNS.find((c) => c.id === next)?.title || "próxima etapa";
      showSuccess("Projeto avançado", `${project.client.nome} → ${nextTitle}.`);
    }
  };

  const handleMarkContacted = async (project: Project) => {
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
    if (!lossModalProject) return;
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




  // Helper para formatar moeda
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(val);
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

  // Auto-move para Perdas quando o operador ativou essa opção no SLA.
  useEffect(() => {
    if (!followUpSla.autoMoveToLoss || autoLossRunningRef.current) return;

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
  }, [projects, followUpSla, showSuccess]);

  const renderProjectCard = (project: Project, colId?: ProjectStatus) => {
    const isDraggingThis = activeDragId === project.id;
    const followLevel = getFollowUpLevel(project, followUpSla);
    const followMessage = getFollowUpMessage(project, followUpSla);
    const canMarkLoss = COMMERCIAL_LOSS_STATUSES.includes(project.status_geral as ProjectStatus);
    const showFollowUp = needsFollowUp(project.status_geral);
    const isCollapsed = !expandedCards.has(project.id);
    const stageStatus = colId ?? project.status_geral;
    const theme = getStageTheme(stageStatus);

    const actionButtons = (
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
    );

    return (
      <div
        key={project.id}
        draggable={boardView === "funil" && !isMobile}
        onDragStart={(e) => handleDragStart(e, project.id)}
        onDragEnd={handleDragEnd}
        onClick={() => handleCardClick(project)}
        className={`group kanban-card kanban-card-stage overflow-hidden border ${
          project.client.tipo_pessoa === "PJ" ? "border-indigo-500/50 shadow-xs ring-1 ring-indigo-50" : theme.cardBorder
        } ${theme.cardShadow} ${theme.cardHover} ${
          boardView === "funil" ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
        } ${
          isDraggingThis ? "opacity-35 scale-[0.98] border-dashed" : ""
        } ${followLevel === "ok" ? "" : FOLLOW_UP_CARD_STYLES[followLevel]} ${
          project.status_geral === "PRODUCAO" ? "opacity-45 grayscale-[30%] bg-slate-50/70 border-slate-300" : ""
        }`}
      >
        <div className="space-y-[var(--space-2)]">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-[9px] font-semibold px-1.5 py-0.5 rounded tracking-wide uppercase border border-border bg-secondary/60 text-muted-foreground"
                >
                  {labelOrigin(project.client.origem)}
                </span>
                <span className="text-[10px] text-muted-foreground flex items-center font-medium">
                  <MapPin className="h-2.5 w-2.5 mr-0.5 shrink-0" />
                  {project.client.cidade}
                </span>
              </div>
              <h4 className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors leading-snug">
                {project.client.nome}
              </h4>
              {shouldShowStageEntryDate(project.status_geral) ? (
                <p className="flex items-center text-[11px] text-muted-foreground/90">
                  <Calendar className="h-3 w-3 mr-1 opacity-70 shrink-0" />
                  <span className="tabular-nums tracking-tight">
                    {formatStageEntryLabel(project.status_geral, project.stage_entered_at) ||
                      "Data não registrada"}
                  </span>
                </p>
              ) : (
                <p className="flex items-center text-xs text-muted-foreground">
                  <Phone className="h-3 w-3 mr-1 opacity-80 text-primary shrink-0" />
                  <span className="tabular-nums">
                    {valuesHidden
                      ? maskPhoneLastDigits(project.client.telefone, 4)
                      : project.client.telefone}
                  </span>
                </p>
              )}
            </div>

            <div className="flex items-start gap-1.5 shrink-0">
              {(project.conf_tecnica_resp1Nome || project.conf_tecnica_resp2Nome) &&
                (project.status_geral === "APROVADO" ||
                  project.status_geral === "CONFERENCIA_TECNICA" ||
                  project.status_geral === "PRODUCAO") && (
                  <div className="flex items-center -space-x-1 pt-0.5">
                    {project.conf_tecnica_resp1Nome && (
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-card bg-emerald-600 text-[9px] font-bold text-white"
                        title={`Conf. técnica: ${project.conf_tecnica_resp1Nome}`}
                      >
                        {getInitials(project.conf_tecnica_resp1Nome)}
                      </span>
                    )}
                    {project.conf_tecnica_resp2Nome && (
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-card bg-secondary text-[9px] font-bold text-muted-foreground"
                        title={`Conf. técnica: ${project.conf_tecnica_resp2Nome}`}
                      >
                        {getInitials(project.conf_tecnica_resp2Nome)}
                      </span>
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

          {followMessage ? (
            <div
              className={`flex items-center gap-1 text-[9px] font-semibold px-1.5 py-1 rounded-md border leading-tight ${FOLLOW_UP_BADGE_STYLES[followLevel as "warning" | "alert" | "loss"]}`}
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
          ) : null}

          <div
            className={`grid transition-all duration-200 ease-in-out ${
              isCollapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
            }`}
          >
            <div className="overflow-hidden">
              <div className="space-y-2 border-t border-border/70 pt-2">
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
                      <select
                        value={project.conf_tecnica_resp1_id || "none"}
                        disabled={loading || colaboradores.length === 0}
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
                        disabled={loading || colaboradores.length === 0}
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

                {/* Div Flex simples para alinhar botões sem margens negativas que quebrem as bordas */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 select-none">
                  {actionButtons}

                  <div className="flex items-center gap-2">
                    <a
                      href={`https://api.whatsapp.com/send?phone=55${project.client.telefone.replace(/\D/g, "")}`}
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

                    {/* Avançar etapa — só no mobile, onde não há drag & drop */}
                    {isMobile && boardView === "funil" && getNextFunnelStatus(project.status_geral) && (
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
                        title={`Avançar para ${FUNNEL_COLUMNS.find((c) => c.id === getNextFunnelStatus(project.status_geral))?.title || "próxima etapa"}`}
                      >
                        <ArrowRight style={{ width: "0.875rem", height: "0.875rem" }} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-[var(--space-3)] overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-[var(--space-3)]">
        <div className="flex items-center gap-2 flex-wrap">
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
          <button
            type="button"
            onClick={toggleSensitiveVisibility}
            className="inline-flex items-center justify-center p-2 rounded-xl bg-white hover:bg-slate-50 text-muted-foreground hover:text-foreground border border-border shadow-xs transition-all duration-200 cursor-pointer group"
            title={
              valuesHidden
                ? "Mostrar totais e telefone (oculta de novo em 30s)"
                : "Ocultar totais e telefone"
            }
          >
            {valuesHidden ? (
              <EyeOff className="h-4.5 w-4.5 text-primary group-hover:scale-105 transition-transform" />
            ) : (
              <Eye className="h-4.5 w-4.5 group-hover:scale-105 transition-transform" />
            )}
          </button>
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
          >
            {allCardsCollapsed ? (
              <ChevronsUpDown className="h-4.5 w-4.5 text-primary group-hover:scale-105 transition-transform" />
            ) : (
              <ChevronsDownUp className="h-4.5 w-4.5 group-hover:scale-105 transition-transform" />
            )}
          </button>
          <CrmFollowUpSlaSettings sla={followUpSla} onSave={handleSaveFollowUpSla} />
        </div>

        {boardView === "funil" &&
          (followUpLosses.length > 0 ||
            followUpAlerts.length > 0 ||
            followUpWarnings.length > 0) && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {followUpLosses.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-600/10 text-rose-900 border border-rose-600/25 font-semibold">
                <UserX className="h-3.5 w-3.5" />
                {followUpLosses.length} elegível(is) a perdas ({followUpSla.lossDays}+ dias)
              </span>
            )}
            {followUpAlerts.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 text-red-800 border border-red-500/20 font-semibold">
                <BellRing className="h-3.5 w-3.5" />
                {followUpAlerts.length} sem resposta há {followUpSla.alertDays}+ dias
              </span>
            )}
            {followUpWarnings.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-800 border border-amber-500/20 font-semibold">
                <AlertTriangle className="h-3.5 w-3.5" />
                {followUpWarnings.length} próximo(s) do limite ({followUpSla.warningDays}+ dias)
              </span>
            )}
          </div>
        )}
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
        {FUNNEL_COLUMNS.map((col) => {
          const colProjects = projects.filter((p) => p.status_geral === col.id);
          const colSum = colProjects.reduce((acc, curr) => acc + curr.valor_previsto, 0);
          const isOver = dragOverColumn === col.id;
          const theme = getStageTheme(col.id);

          return (
            <div 
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`kanban-column flex flex-col h-full rounded-2xl bg-slate-100/75 border border-slate-200/60 shadow-2xs transition-all duration-300 relative ${
                isOver ? `ring-2 ${theme.dropRing} shadow-md scale-[1.01]` : ""
              }`}
            >
              {/* Cabeçalho da Coluna */}
              <div className={`p-3.5 pb-2 ${theme.header} rounded-t-2xl flex items-center justify-between`}>
                <div className="flex items-center space-x-2 min-w-0">
                  <div className="relative group/tooltip flex items-center shrink-0">
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-primary transition-colors cursor-help" />
                    <div className="absolute bottom-full left-0 mb-2 w-64 p-2.5 bg-slate-950 text-slate-100 text-[11px] rounded-lg shadow-xl border border-slate-800 opacity-0 pointer-events-none group-hover/tooltip:opacity-100 group-hover/tooltip:pointer-events-auto transition-all duration-200 z-50 leading-relaxed font-normal normal-case translate-y-1 group-hover/tooltip:translate-y-0">
                      {COLUMN_DESCRIPTIONS[col.id]}
                      {/* Seta indicadora do balão */}
                      <div className="absolute top-full left-4 -mt-1 border-[5px] border-transparent border-t-slate-950"></div>
                    </div>
                  </div>
                  <span className="font-bold text-xs uppercase tracking-wide truncate">{col.title}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground shrink-0">
                    {colProjects.length}
                  </span>
                </div>
                {colSum > 0 && (
                  <span
                    className={`text-xs font-bold text-foreground shrink-0 ml-2 tabular-nums transition-[filter] duration-300 ${
                      valuesHidden ? "blur-[5px] select-none" : "blur-0"
                    }`}
                  >
                    {formatCurrency(colSum)}
                  </span>
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

      {/* Modal - Editar Card do Kanban */}
      <Dialog isOpen={isEditLeadOpen} onClose={() => setIsEditLeadOpen(false)} className="max-w-3xl w-full">
        {(() => {
          const currentProject = projects.find(p => p.id === editingProjectId);
          const hasBriefing = !!currentProject?.briefing;

          return (
            <>
              <div className="flex items-start justify-between mb-1">
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-gradient-gold">
                    Painel de Negociação & CRM
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Acompanhamento e registro da negociação comercial com o cliente.
                  </p>
                </div>

                {hasBriefing && currentProject.briefing && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400">Score de Qualificação:</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-black text-white ${
                      currentProject.briefing.score >= 80 
                        ? "bg-emerald-600" 
                        : currentProject.briefing.score >= 50 
                          ? "bg-amber-500" 
                          : "bg-rose-500"
                    }`}>
                      {currentProject.briefing.score} ({
                        currentProject.briefing.score >= 80 
                          ? "Quente" 
                          : currentProject.briefing.score >= 50 
                            ? "Morno" 
                            : "Frio"
                      })
                    </span>
                  </div>
                )}
              </div>

              {/* Seletor de abas se houver briefing */}
              {hasBriefing && (
                <div className="flex flex-wrap border-b border-slate-100 my-4 gap-3 sm:gap-4 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setActiveModalTab("negociacao")}
                    className={`pb-2 transition-all border-b-2 cursor-pointer ${
                      activeModalTab === "negociacao" 
                        ? "border-primary text-primary" 
                        : "border-transparent text-muted-foreground hover:text-slate-700"
                    }`}
                  >
                    Negociação Comercial
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveModalTab("briefing")}
                    className={`pb-2 transition-all border-b-2 cursor-pointer flex items-center gap-1 ${
                      activeModalTab === "briefing" 
                        ? "border-primary text-primary" 
                        : "border-transparent text-muted-foreground hover:text-slate-700"
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    Briefing de Qualificação
                  </button>
                </div>
              )}

              {activeModalTab === "briefing" && currentProject?.briefing ? (
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
                                href={`https://api.whatsapp.com/send?phone=55${currentProject.client.telefone.replace(/\D/g, "")}`}
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
              ) : (
                <form onSubmit={handleEditLeadSubmit} className="space-y-4">
                  {/* Script Comercial de Abordagem AI no topo da Negociação */}
                  {currentProject?.briefing?.roteiro_sugerido && (
                    <div className="p-4 bg-gradient-to-br from-amber-500/[0.02] to-amber-600/[0.06] border border-amber-500/20 rounded-2xl space-y-3 shadow-sm">
                      <div className="flex items-center justify-between border-b border-amber-500/10 pb-2.5 flex-wrap gap-2">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[hsl(28_85%_30%)]">
                          <Sparkles className="h-4 w-4 text-amber-500 shrink-0 animate-pulse" />
                          Roteiro Comercial Sugerido
                        </div>
                        <div className="flex items-center gap-1.5">
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
                                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {copiedScript ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            {copiedScript ? "Copiado!" : "Copiar"}
                          </button>
                          <a
                            href={`https://api.whatsapp.com/send?phone=55${currentProject.client.telefone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 border border-emerald-600 text-white text-[10px] font-bold shadow-sm active:scale-95 transition-all duration-200 cursor-pointer"
                          >
                            <Send className="h-3 w-3" />
                            WhatsApp
                          </a>
                        </div>
                      </div>
                      <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-medium bg-white/70 border border-slate-200/40 rounded-xl p-3.5 select-all">
                        {currentProject.briefing.roteiro_sugerido}
                      </div>
                    </div>
                  )}

                  {/* Visualização de Dados do Cliente - Somente Leitura */}
                  <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="col-span-2 sm:col-span-1">
                      <span className="font-semibold text-slate-400 block mb-0.5">Cliente</span>
                      <strong className="text-neutral-900 truncate block">{leadForm.nome}</strong>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-400 block mb-0.5">WhatsApp / Telefone</span>
                      <strong className="text-neutral-900 block">{leadForm.telefone}</strong>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-400 block mb-0.5">E-mail</span>
                      <strong className="text-neutral-900 truncate block">{leadForm.email}</strong>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-400 block mb-0.5">Cidade de Entrega</span>
                      <strong className="text-neutral-900 block">{leadForm.cidade}</strong>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-400 block mb-0.5">Origem do Lead</span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary uppercase mt-0.5">
                        {labelOrigin(leadForm.origem)}
                      </span>
                    </div>
                  </div>

                  {/* Dica de Venda Dinâmica por Etapa */}
                  {(() => {
                    const tips: Record<string, string> = {
                      LEAD: "💡 Qualificação Inicial: Apresente o histórico da Móveis Unghero, entenda as necessidades básicas de ambientes e agende a medição técnica.",
                      ORCAMENTO: "💡 Elaboração de Proposta: Foco em layout funcional. Tente agendar uma reunião presencial para apresentar a proposta e justificar os materiais.",
                      NEGOCIACAO: "💡 Negociação Ativa: Apresente flexibilidade nas parcelas de pagamento e reforce o compromisso de prazo para incentivar a assinatura.",
                      CONFERENCIA_TECNICA: "💡 Conferência e SLA: Revise as restrições de montagem, elevador ou acessos da obra. Fotografe os locais e confirme a planta técnica.",
                      APROVADO: "💡 Fechamento Concluído: Revise e valide todo o memorial descritivo com o cliente. O projeto está prestes a entrar na fila de corte da marcenaria.",
                      PRODUCAO: "💡 Produção em Andamento: Compartilhe o andamento das peças sendo usinadas com o cliente. O pós-venda começa mantendo o cliente seguro!"
                    };
                    const tipText = tips[editingStatusGeral] || "💡 Gestão de Projetos: Acompanhe o SLA operacional para assegurar o cumprimento de prazos contratados.";
                    return (
                      <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-800 leading-relaxed font-medium">
                        {tipText}
                      </div>
                    );
                  })()}

                  {/* Edição de Dados Comerciais */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">
                        Valor Previsto do Projeto (R$)
                      </label>
                      <Input
                        type="number"
                        required
                        value={leadForm.valor_previsto}
                        onChange={(e) => setLeadForm({ ...leadForm, valor_previsto: e.target.value })}
                        className="text-xs h-10 font-bold text-neutral-800"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">
                        Etapa do Funil Comercial
                      </label>
                      <select
                        value={editingStatusGeral}
                        onChange={(e) => setEditingStatusGeral(e.target.value as ProjectStatus)}
                        className="w-full h-10 bg-slate-50 border border-border rounded-lg text-xs font-semibold px-2.5 focus:ring-1 focus:ring-primary cursor-pointer outline-none"
                      >
                        {(() => {
                          const opts = [...STATUS_OPTIONS];
                          if (!opts.some(o => o.id === editingStatusGeral)) {
                            const allStatuses: Record<string, string> = {
                              INSTALACAO: "Instalação",
                              FINALIZADO: "Finalizados",
                              PERDIDO: "Perdido"
                            };
                            opts.push({ id: editingStatusGeral, title: allStatuses[editingStatusGeral] || editingStatusGeral });
                          }
                          return opts.map(col => (
                            <option key={col.id} value={col.id}>{col.title}</option>
                          ));
                        })()}
                      </select>
                    </div>
                  </div>

                  {/* Observações Gerais da Negociação */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Observações & Anotações da Negociação
                    </label>
                    <textarea
                      value={editingObservacoes}
                      onChange={(e) => setEditingObservacoes(e.target.value)}
                      rows={3}
                      className="w-full p-2.5 text-xs bg-slate-50 border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none font-medium resize-none leading-relaxed"
                    />
                  </div>

                  {/* Nova Seção: Linha do Tempo e Histórico de Contato */}
                  <div className="border-t border-border/40 pt-4 space-y-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                      Linha do Tempo & Histórico da Venda
                    </span>

                    {/* Novo Registro de Timeline */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTimelineText}
                        onChange={(e) => setNewTimelineText(e.target.value)}
                        placeholder="Registrar anotação de conversa ou follow-up realizado hoje..."
                        className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none font-medium"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTimeline(e);
                          }
                        }}
                      />
                      <Button 
                        type="button" 
                        onClick={handleAddTimeline} 
                        disabled={loading || !newTimelineText.trim()}
                        className="px-4 py-2 font-bold text-xs h-9"
                      >
                        Salvar Nota
                      </Button>
                    </div>

                    {/* Lista Scrollable da Timeline */}
                    <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3.5 max-h-48 overflow-y-auto space-y-3">
                      {editingProjectTimeline.length === 0 ? (
                        <p className="text-center py-4 text-[11px] text-muted-foreground">
                          Nenhum histórico de contato registrado ainda.
                        </p>
                      ) : (
                        editingProjectTimeline.map((item, idx) => (
                          <div key={item.id || idx} className="flex gap-3 text-xs leading-relaxed items-start border-l-2 border-slate-200 pl-3 ml-1.5 py-0.5">
                            <div className="min-w-0 flex-1">
                              <p className="text-neutral-800 font-medium">{item.acao}</p>
                              <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1.5 mt-0.5">
                                <span>{new Date(item.data).toLocaleString("pt-BR")}</span>
                                {item.user?.name && (
                                  <>
                                    <span>•</span>
                                    <span>Por: {item.user.name}</span>
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-4 border-t border-border/40 mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditLeadOpen(false)}
                      disabled={loading}
                      className="text-xs font-bold cursor-pointer w-full sm:w-auto"
                    >
                      Fechar sem salvar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={loading} 
                      className="font-bold text-xs cursor-pointer bg-[hsl(28_85%_45%)] text-white hover:bg-[hsl(28_85%_40%)] border-none w-full sm:w-auto"
                    >
                      {loading ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                  </div>
                </form>
              )}
            </>
          );
        })()}
      </Dialog>
      <ActionDialogHost dialog={dialog} />
    </div>
  );
}
