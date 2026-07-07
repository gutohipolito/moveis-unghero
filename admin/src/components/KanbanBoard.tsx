"use client";

import React, { useState } from "react";
import { updateProjectStatus, createLead, updateProjectAction, markProjectContacted, markProjectAsLost, restoreProjectFromLoss, addProjectTimelineAction, updateProjectCommercialAction, type ProjectStatus, type Origin } from "@/app/actions/kanban";
import {
  COMMERCIAL_LOSS_STATUSES,
} from "@/lib/notifications";
import {
  FOLLOW_UP_ALERT_DAYS,
  FOLLOW_UP_BADGE_STYLES,
  FOLLOW_UP_CARD_STYLES,
  getDaysSinceContact,
  getFollowUpLevel,
  getFollowUpMessage,
  needsFollowUp,
} from "@/lib/followUp";
import { labelOrigin } from "@/lib/navLabels";
import { ActionDialogHost, useActionDialog } from "@/components/ActionDialogHost";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui/kpi-card";
import { SegmentControl } from "@/components/ui/segment-control";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  MapPin, 
  Phone, 
  DollarSign, 
  TrendingUp,
  UserCheck,
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
} from "lucide-react";

interface Project {
  id: string;
  valor_previsto: number;
  status_geral: string;
  ultimo_contato_em?: string | null;
  createdAt?: string | null;
  motivo_perda?: string | null;
  observacoes?: string | null;
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
  clients?: Array<{
    id: string;
    nome: string;
    email: string;
    telefone: string;
    cidade: string;
    origem: Origin;
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
  { id: "CONFERENCIA_TECNICA", title: "Conf. Técnica" },
  { id: "APROVADO", title: "Aprovados" },
  { id: "PRODUCAO", title: "Produção" },
];

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
  CONFERENCIA_TECNICA: "Conf. Técnica: Medição final no imóvel do cliente e refinamento técnico do projeto para produção.",
  APROVADO: "Aprovados: Projetos validados tecnicamente, contratos assinados e prontos para a produção.",
  PRODUCAO: "Produção: Detalhamento de planos de corte e fabricação das peças na marcenaria.",
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

export default function KanbanBoard({ initialProjects, companyId, clients = [] }: KanbanBoardProps) {
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
  const [boardView, setBoardView] = useState<"funil" | "perdas">("funil");
  const [lossModalProject, setLossModalProject] = useState<Project | null>(null);
  const [lossMotivo, setLossMotivo] = useState("");
  const [collapsedCards, setCollapsedCards] = useState<Set<string>>(new Set());
  

  const [loading, setLoading] = useState(false);
  const dialog = useActionDialog();
  const { showSuccess, showError } = dialog;
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
            telefone: data.ddd_telefone_1 || data.telefone || prev.telefone || "",
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
    setActiveModalTab("negociacao");
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
    const updated = projects.map(p => p.id === id ? { ...p, status_geral: targetStatus } : p);
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
    setCollapsedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const funnelProjects = projects.filter((p) => p.status_geral !== "PERDIDO");
  const lostProjects = projects.filter((p) => p.status_geral === "PERDIDO");
  const followUpAlerts = funnelProjects.filter(
    (p) => getFollowUpLevel(p) === "alert"
  );
  const followUpWarnings = funnelProjects.filter(
    (p) => getFollowUpLevel(p) === "warning"
  );

  const totalPipeline = funnelProjects
    .filter((p) => !["FINALIZADO", "PERDIDO"].includes(p.status_geral))
    .reduce((acc, curr) => acc + curr.valor_previsto, 0);
  const activeProjectsCount = funnelProjects.filter(
    (p) => !["FINALIZADO", "PERDIDO"].includes(p.status_geral)
  ).length;

  const renderProjectCard = (project: Project, colId?: ProjectStatus) => {
    const isDraggingThis = activeDragId === project.id;
    const followLevel = getFollowUpLevel(project);
    const followMessage = getFollowUpMessage(project);
    const canMarkLoss = COMMERCIAL_LOSS_STATUSES.includes(project.status_geral as ProjectStatus);
    const showFollowUp = needsFollowUp(project.status_geral);
    const isCollapsed = collapsedCards.has(project.id);
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
              handleMarkContacted(project);
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
              setLossModalProject(project);
              setLossMotivo("");
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
              handleRestoreLoss(project);
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
        className={`group kanban-card kanban-card-stage overflow-hidden border ${theme.cardBorder} ${theme.cardShadow} ${theme.cardHover} ${
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
              <p className="flex items-center text-xs text-muted-foreground">
                <Phone className="h-3 w-3 mr-1 opacity-80 text-primary shrink-0" />
                {project.client.telefone}
              </p>
            </div>

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

          <div
            className={`grid transition-all duration-200 ease-in-out ${
              isCollapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
            }`}
          >
            <div className="overflow-hidden">
              <div className="space-y-2 border-t border-border/70 pt-2">
                <div className="space-y-2">
                  {followMessage && (
                    <div
                      className={`flex items-center gap-1 text-[9px] font-semibold px-1.5 py-1 rounded-md border leading-tight ${FOLLOW_UP_BADGE_STYLES[followLevel as "warning" | "alert"]}`}
                    >
                      {followLevel === "alert" ? (
                        <BellRing className="h-3 w-3 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                      )}
                      <span className="truncate">{followMessage}</span>
                    </div>
                  )}

                  {showFollowUp && (
                    <p className="text-[10px] text-muted-foreground/80">
                      Último contato: há {getDaysSinceContact(project)} dia(s)
                    </p>
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

                <div className="flex items-center text-foreground font-black text-sm">
                  <DollarSign className="h-3.5 w-3.5 -mr-0.5 opacity-80 text-primary shrink-0" />
                  <span className="privacy-value truncate">
                    {formatCurrency(project.valor_previsto).replace("R$", "")}
                  </span>
                </div>
                {actionButtons}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-[var(--space-5)]">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[var(--space-3)] lg:flex lg:items-center lg:justify-between lg:gap-[var(--space-6)]">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[var(--space-3)] lg:flex lg:items-center lg:gap-[var(--space-6)]">
          <KpiCard
            label="Total em negociação"
            value={<span className="privacy-value">{formatCurrency(totalPipeline)}</span>}
            icon={TrendingUp}
            accent="primary"
            className="lg:min-w-[14rem]"
          />
          <KpiCard
            label="Projetos ativos"
            value={activeProjectsCount}
            icon={UserCheck}
            accent="success"
            valueClassName="text-[hsl(var(--success))]"
            className="lg:min-w-[10rem]"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-[var(--space-3)]">
        <SegmentControl
          value={boardView}
          onChange={setBoardView}
          aria-label="Visualização do funil"
          options={[
            { value: "funil", label: "Funil ativo" },
            { value: "perdas", label: "Perdas", badge: lostProjects.length },
          ]}
        />

        {boardView === "funil" && (followUpAlerts.length > 0 || followUpWarnings.length > 0) && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {followUpAlerts.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 text-red-800 border border-red-500/20 font-semibold">
                <BellRing className="h-3.5 w-3.5" />
                {followUpAlerts.length} sem resposta há {FOLLOW_UP_ALERT_DAYS}+ dias
              </span>
            )}
            {followUpWarnings.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-800 border border-amber-500/20 font-semibold">
                <AlertTriangle className="h-3.5 w-3.5" />
                {followUpWarnings.length} próximo(s) do limite
              </span>
            )}
          </div>
        )}
      </div>

      {boardView === "perdas" ? (
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
      <>
      <div className="kanban-scroll select-none min-h-[420px] md:min-h-[500px]">
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
              className={`kanban-column flex flex-col rounded-xl bg-slate-50/40 border border-slate-100/70 transition-all duration-[var(--motion-base)] ${
                isOver ? `ring-2 ${theme.dropRing} shadow-[var(--shadow-md)] scale-[1.01]` : ""
              }`}
            >
              {/* Cabeçalho da Coluna */}
              <div className={`p-3.5 ${theme.header} rounded-t-xl flex items-center justify-between border-b border-border/60`}>
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
                <span className="text-xs font-bold text-foreground privacy-value shrink-0 ml-2">{formatCurrency(colSum)}</span>
              </div>

              {/* Lista de Cards */}
              <div 
                className="flex-1 p-[var(--space-2)] space-y-[var(--space-2)] overflow-y-auto max-h-[55vh] md:max-h-[600px] min-h-[240px] md:min-h-[400px]"
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
      </>
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
              placeholder="Ex.: Optou por outro fornecedor, orçamento acima do esperado..."
              className="w-full p-2.5 text-xs bg-slate-50 border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none resize-none"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setLossModalProject(null);
                setLossMotivo("");
              }}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-red-600 hover:bg-red-700 text-white border-none">
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
                <div className="flex border-b border-slate-100 my-4 gap-4 text-xs font-bold">
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
                  {/* Roteiro Comercial de Abordagem */}
                  {currentProject.briefing.roteiro_sugerido && (
                    <div className="p-4 bg-[hsl(28_85%_97%)] border border-[hsl(28_85%_85%)] rounded-xl space-y-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-[hsl(28_85%_35%)]">
                        <Sparkles className="h-4 w-4 shrink-0" /> Script de Abordagem WhatsApp Sugerido
                      </div>
                      <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-medium">
                        {currentProject.briefing.roteiro_sugerido}
                      </div>
                    </div>
                  )}

                  {/* Respostas do Briefing */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-3.5">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/60 pb-1">
                        1. Ambientes & Escopo
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-slate-500 font-semibold block">Ambientes desejados:</span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {(() => {
                              try {
                                const list = JSON.parse(currentProject.briefing.ambientes);
                                return list.map((a: any, idx: number) => (
                                  <span key={idx} className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-800 font-bold">
                                    {a.nome}{a.opcao ? ` (${a.opcao})` : ""}
                                  </span>
                                ));
                              } catch (e) {
                                return <span className="text-slate-700 font-bold">{currentProject.briefing.ambientes}</span>;
                              }
                            })()}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div>
                            <span className="text-slate-500 font-semibold block">Tipo do imóvel:</span>
                            <strong className="text-slate-900">{currentProject.briefing.tipo_imovel}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500 font-semibold block">Fase da compra:</span>
                            <strong className="text-slate-900">{currentProject.briefing.fase_projeto}</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-3.5">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/60 pb-1">
                        2. Status do Imóvel & Design
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-slate-500 font-semibold block">Imóvel pronto?</span>
                            <strong className="text-slate-900">{currentProject.briefing.pronto}</strong>
                          </div>
                          {currentProject.briefing.data_chaves && (
                            <div>
                              <span className="text-slate-500 font-semibold block">Entrega das chaves:</span>
                              <strong className="text-slate-900">{currentProject.briefing.data_chaves}</strong>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div>
                            <span className="text-slate-500 font-semibold block">Já possui projeto?</span>
                            <strong className="text-slate-900">{currentProject.briefing.tem_projeto}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500 font-semibold block">Estilo preferido:</span>
                            <strong className="text-slate-900">{currentProject.briefing.estilo}</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-3.5">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/60 pb-1">
                        3. Investimento & Cronograma
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-slate-500 font-semibold block">Expectativa financeira:</span>
                            <strong className="text-slate-900">{currentProject.briefing.faixa_investimento || "Não informado"}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500 font-semibold block">Pretende iniciar:</span>
                            <strong className="text-slate-900">{currentProject.briefing.prazo_inicio}</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-3.5">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/60 pb-1">
                        4. Referências & Mídia
                      </h4>
                      <div className="space-y-2 text-xs">
                        {currentProject.briefing.pinterest_link && (
                          <div>
                            <span className="text-slate-500 font-semibold block">Painel do Pinterest:</span>
                            <a 
                              href={currentProject.briefing.pinterest_link} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-primary hover:underline font-bold inline-flex items-center gap-1"
                            >
                              Ver Pinterest <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        )}
                        {currentProject.briefing.referencia_url && (
                          <div>
                            <span className="text-slate-500 font-semibold block">Arquivo de referência / Planta:</span>
                            <a 
                              href={currentProject.briefing.referencia_url} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-emerald-600 hover:underline font-bold inline-flex items-center gap-1"
                            >
                              Baixar arquivo técnico <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        )}
                        {!currentProject.briefing.pinterest_link && !currentProject.briefing.referencia_url && (
                          <span className="text-muted-foreground italic">Nenhuma referência compartilhada pelo cliente.</span>
                        )}
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
                      className="text-xs font-bold cursor-pointer"
                    >
                      Fechar Briefing
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleEditLeadSubmit} className="space-y-4">
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
                      <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary leading-relaxed font-bold">
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
                      placeholder="Descreva detalhes específicos do cliente, preferências de acabamento e histórico comercial do fechamento..."
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

                  <div className="flex justify-end gap-3 pt-4 border-t border-border/40 mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditLeadOpen(false)}
                      disabled={loading}
                      className="text-xs font-bold cursor-pointer"
                    >
                      Fechar sem salvar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={loading} 
                      className="font-bold text-xs cursor-pointer bg-[hsl(28_85%_45%)] text-white hover:bg-[hsl(28_85%_40%)] border-none"
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
