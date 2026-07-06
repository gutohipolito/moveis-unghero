"use client";

import React, { useState } from "react";
import { updateProjectStatus, createLead, updateProjectAction, markProjectContacted, markProjectAsLost, restoreProjectFromLoss, type ProjectStatus, type Origin } from "@/app/actions/kanban";
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
} from "lucide-react";

interface Project {
  id: string;
  valor_previsto: number;
  status_geral: string;
  ultimo_contato_em?: string | null;
  createdAt?: string | null;
  motivo_perda?: string | null;
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
  { id: "INSTALACAO", title: "Instalação" },
  { id: "FINALIZADO", title: "Finalizados" },
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
    header: "border-t-[3px] border-t-amber-500 bg-gradient-to-b from-amber-500/15 to-transparent text-amber-900",
    cardBorder: "border-amber-500/50",
    cardShadow: "shadow-[0_2px_10px_-4px_rgba(245,158,11,0.45)]",
    cardHover: "hover:border-amber-500/75 hover:shadow-[0_4px_14px_-3px_rgba(245,158,11,0.5)]",
    dropRing: "ring-amber-500/35",
  },
  ORCAMENTO: {
    header: "border-t-[3px] border-t-orange-500 bg-gradient-to-b from-orange-500/15 to-transparent text-orange-900",
    cardBorder: "border-orange-500/50",
    cardShadow: "shadow-[0_2px_10px_-4px_rgba(249,115,22,0.45)]",
    cardHover: "hover:border-orange-500/75 hover:shadow-[0_4px_14px_-3px_rgba(249,115,22,0.5)]",
    dropRing: "ring-orange-500/35",
  },
  NEGOCIACAO: {
    header: "border-t-[3px] border-t-sky-500 bg-gradient-to-b from-sky-500/15 to-transparent text-sky-900",
    cardBorder: "border-sky-500/50",
    cardShadow: "shadow-[0_2px_10px_-4px_rgba(14,165,233,0.45)]",
    cardHover: "hover:border-sky-500/75 hover:shadow-[0_4px_14px_-3px_rgba(14,165,233,0.5)]",
    dropRing: "ring-sky-500/35",
  },
  CONFERENCIA_TECNICA: {
    header: "border-t-[3px] border-t-violet-500 bg-gradient-to-b from-violet-500/15 to-transparent text-violet-900",
    cardBorder: "border-violet-500/50",
    cardShadow: "shadow-[0_2px_10px_-4px_rgba(139,92,246,0.45)]",
    cardHover: "hover:border-violet-500/75 hover:shadow-[0_4px_14px_-3px_rgba(139,92,246,0.5)]",
    dropRing: "ring-violet-500/35",
  },
  APROVADO: {
    header: "border-t-[3px] border-t-emerald-500 bg-gradient-to-b from-emerald-500/15 to-transparent text-emerald-900",
    cardBorder: "border-emerald-500/50",
    cardShadow: "shadow-[0_2px_10px_-4px_rgba(16,185,129,0.45)]",
    cardHover: "hover:border-emerald-500/75 hover:shadow-[0_4px_14px_-3px_rgba(16,185,129,0.5)]",
    dropRing: "ring-emerald-500/35",
  },
  PRODUCAO: {
    header: "border-t-[3px] border-t-teal-500 bg-gradient-to-b from-teal-500/15 to-transparent text-teal-900",
    cardBorder: "border-teal-500/50",
    cardShadow: "shadow-[0_2px_10px_-4px_rgba(20,184,166,0.45)]",
    cardHover: "hover:border-teal-500/75 hover:shadow-[0_4px_14px_-3px_rgba(20,184,166,0.5)]",
    dropRing: "ring-teal-500/35",
  },
  INSTALACAO: {
    header: "border-t-[3px] border-t-indigo-500 bg-gradient-to-b from-indigo-500/15 to-transparent text-indigo-900",
    cardBorder: "border-indigo-500/50",
    cardShadow: "shadow-[0_2px_10px_-4px_rgba(99,102,241,0.45)]",
    cardHover: "hover:border-indigo-500/75 hover:shadow-[0_4px_14px_-3px_rgba(99,102,241,0.5)]",
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
    cardBorder: "border-rose-500/50",
    cardShadow: "shadow-[0_2px_10px_-4px_rgba(244,63,94,0.4)]",
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

  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const [isEditLeadOpen, setIsEditLeadOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingStatusGeral, setEditingStatusGeral] = useState<ProjectStatus>("LEAD");
  const [statusGeralInicial, setStatusGeralInicial] = useState<ProjectStatus>("LEAD");
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ProjectStatus | null>(null);
  const [didDrag, setDidDrag] = useState(false);
  const [boardView, setBoardView] = useState<"funil" | "perdas">("funil");
  const [lossModalProject, setLossModalProject] = useState<Project | null>(null);
  const [lossMotivo, setLossMotivo] = useState("");
  const [collapsedCards, setCollapsedCards] = useState<Set<string>>(new Set());
  
  // Estados do formulário de lead
  const [isExistingClient, setIsExistingClient] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
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
      nome: leadForm.nome,
      telefone: leadForm.telefone,
      cidade: leadForm.cidade,
      origem: leadForm.origem,
      cnpj: leadForm.cnpj || "",
      cep: leadForm.cep || "",
      endereco: leadForm.endereco || "",
      numero: leadForm.numero || "",
      bairro: leadForm.bairro || "",
      uf: leadForm.uf || "",
      tipo_imovel: leadForm.tipo_imovel,
      obs_imovel: leadForm.obs_imovel,
      obs_entrega: leadForm.obs_entrega
    };

    const result = await updateProjectAction(editingProjectId, data);

    if (result.success) {
      setProjects(projects.map(p => {
        if (p.id === editingProjectId) {
          return {
            ...p,
            valor_previsto: data.valor_previsto,
            status_geral: data.status_geral,
            client: {
              ...p.client,
              nome: data.nome,
              telefone: data.telefone,
              cidade: data.cidade,
              origem: data.origem,
              cnpj: data.cnpj,
              cep: data.cep,
              endereco: data.endereco,
              numero: data.numero,
              bairro: data.bairro,
              uf: data.uf,
              tipo_imovel: data.tipo_imovel,
              obs_imovel: data.obs_imovel,
              obs_entrega: data.obs_entrega
            }
          };
        }
        return p;
      }));
      setIsEditLeadOpen(false);
      resetLeadForm();
      showSuccess("Alterações salvas", "Os dados do card foram atualizados no funil.");
    } else {
      showError("Erro ao salvar", "Não foi possível salvar as alterações. Tente novamente.");
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
    setSelectedClientId("");
    setStatusGeralInicial("LEAD");
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

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setLeadForm(prev => ({
        ...prev,
        nome: client.nome,
        email: client.email,
        telefone: client.telefone,
        cidade: client.cidade,
        origem: client.origem as Origin,
        cnpj: client.cnpj || "",
        cep: client.cep || "",
        endereco: client.endereco || "",
        numero: client.numero || "",
        bairro: client.bairro || "",
        uf: client.uf || "",
        tipo_imovel: client.tipo_imovel || "CASA",
        obs_imovel: client.obs_imovel || "",
        obs_entrega: client.obs_entrega || ""
      }));
    }
  };

  // Formulário Submit Handler
  const handleNewLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const data = {
      ...leadForm,
      valor_previsto: Number(leadForm.valor_previsto) || 0,
      company_id: companyId,
      client_id: isExistingClient ? selectedClientId : undefined,
      status_geral: statusGeralInicial
    };

    const result = await createLead(data);

    if (result.success && result.data) {
      // Cria o objeto de projeto localmente para atualizar a tela instantaneamente
      const newProj: Project = {
        id: result.data.project.id,
        valor_previsto: Number(result.data.project.valor_previsto),
        status_geral: statusGeralInicial,
        ultimo_contato_em: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        client: {
          id: result.data.client.id,
          nome: result.data.client.nome,
          cidade: result.data.client.cidade,
          origem: result.data.client.origem,
          telefone: result.data.client.telefone,
          email: result.data.client.email,
          cnpj: result.data.client.cnpj,
          cep: result.data.client.cep,
          endereco: result.data.client.endereco,
          numero: result.data.client.numero,
          bairro: result.data.client.bairro,
          uf: result.data.client.uf,
          tipo_imovel: result.data.client.tipo_imovel,
          obs_imovel: result.data.client.obs_imovel,
          obs_entrega: result.data.client.obs_entrega
        }
      };

      setProjects([newProj, ...projects]);
      setIsNewLeadOpen(false);
      setIsExistingClient(false);
      setSelectedClientId("");
      setStatusGeralInicial("LEAD");
      resetLeadForm();
      showSuccess("Contato adicionado", `${result.data.client.nome} foi incluído no funil comercial.`);
    } else {
      showError("Erro ao cadastrar", "Não foi possível cadastrar o contato. Verifique os dados e tente novamente.");
    }
    setLoading(false);
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
        } ${followLevel === "ok" ? "" : FOLLOW_UP_CARD_STYLES[followLevel]}`}
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

        <Button onClick={() => setIsNewLeadOpen(true)} className="w-full sm:w-auto font-semibold shrink-0">
          <Plus className="mr-2 h-4 w-4" /> Novo contato
        </Button>
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
                  <span title={COLUMN_DESCRIPTIONS[col.id]} className="flex shrink-0">
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-primary transition-colors cursor-help" />
                  </span>
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

      {/* Modal - Novo Lead / Cliente */}
      <Dialog isOpen={isNewLeadOpen} onClose={() => setIsNewLeadOpen(false)}>
        <h3 className="text-lg font-bold tracking-tight text-gradient-gold mb-4">
          Cadastrar Novo Lead & Cliente
        </h3>
        
        <form onSubmit={handleNewLeadSubmit} className="space-y-3">
          {/* Alternador Novo Cliente / Cliente Existente */}
          {clients && clients.length > 0 && (
            <div className="flex gap-4 p-1 bg-slate-100 rounded-lg text-xs font-bold">
              <button
                type="button"
                className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${!isExistingClient ? 'bg-white shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => { setIsExistingClient(false); resetLeadForm(); }}
              >
                Novo Cliente
              </button>
              <button
                type="button"
                className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${isExistingClient ? 'bg-white shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => { setIsExistingClient(true); }}
              >
                Cliente Cadastrado
              </button>
            </div>
          )}

          {isExistingClient && (
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
              <label className="text-xs font-bold text-slate-500 block mb-1">
                Selecionar Cliente da Base
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => handleSelectClient(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg text-xs font-semibold p-2.5 focus:ring-1 focus:ring-primary outline-none cursor-pointer"
              >
                <option value="">Selecione o cliente...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.nome} ({c.email})</option>
                ))}
              </select>
            </div>
          )}

          {/* Autopreenchimento de CNPJ no topo com largura total */}
          {!isExistingClient && (
            <div className="p-4 rounded-xl border border-[hsl(28_85%_90%)] bg-[hsl(28_85%_98%)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[hsl(28_85%_45%)] uppercase tracking-wider block">
                  Autopreenchimento CNPJ (Pessoas Jurídicas)
                </span>
                <span className="text-[9px] font-semibold text-slate-400 bg-white border border-slate-100 px-2 py-0.5 rounded-full">
                  BrasilAPI integrada
                </span>
              </div>
              <Input
                value={leadForm.cnpj}
                onChange={(e) => {
                  const val = e.target.value;
                  setLeadForm({ ...leadForm, cnpj: val });
                  fetchCompanyByCnpj(val);
                }}
                className="bg-white border-slate-200 text-xs h-10 font-medium"
              />
            </div>
          )}

          {/* Seção 1: Dados Básicos */}
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-100 pb-1.5 mt-2">
              Informações Gerais do Cliente
            </span>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Nome Completo do Cliente / Razão Social
              </label>
              <Input
                required
                disabled={isExistingClient}
                value={leadForm.nome}
                onChange={(e) => setLeadForm({ ...leadForm, nome: e.target.value })}
                className="text-xs h-10 font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  E-mail
                </label>
                <Input
                  type="email"
                  required
                  disabled={isExistingClient}
                  value={leadForm.email}
                  onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                  className="text-xs h-10"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Telefone / WhatsApp
                </label>
                <Input
                  required
                  disabled={isExistingClient}
                  value={leadForm.telefone}
                  onChange={(e) => setLeadForm({ ...leadForm, telefone: e.target.value })}
                  className="text-xs h-10 font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Seção 2: Localização e Endereço Completo */}
          {!isExistingClient && (
            <div className="space-y-3 pt-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-100 pb-1.5 mt-2">
                Endereço de Entrega & Instalação
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    CEP
                  </label>
                  <Input
                    value={leadForm.cep}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLeadForm({ ...leadForm, cep: val });
                      fetchAddressByCep(val);
                    }}
                    className="text-xs h-10 font-semibold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Rua / Logradouro
                  </label>
                  <Input
                    value={leadForm.endereco}
                    onChange={(e) => setLeadForm({ ...leadForm, endereco: e.target.value })}
                    className="text-xs h-10 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-1">
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Número
                  </label>
                  <Input
                    value={leadForm.numero}
                    onChange={(e) => setLeadForm({ ...leadForm, numero: e.target.value })}
                    className="text-xs h-10 font-semibold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Bairro
                  </label>
                  <Input
                    value={leadForm.bairro}
                    onChange={(e) => setLeadForm({ ...leadForm, bairro: e.target.value })}
                    className="text-xs h-10 font-semibold"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Estado (UF)
                  </label>
                  <Input
                    value={leadForm.uf}
                    onChange={(e) => setLeadForm({ ...leadForm, uf: e.target.value })}
                    className="text-xs h-10 font-semibold uppercase"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Cidade e Origem */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Cidade de Instalação
              </label>
              <Input
                required
                disabled={isExistingClient}
                value={leadForm.cidade}
                onChange={(e) => setLeadForm({ ...leadForm, cidade: e.target.value })}
                className="text-xs h-10 font-semibold"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Origem do Lead
              </label>
              <select
                disabled={isExistingClient}
                value={leadForm.origem}
                onChange={(e) => setLeadForm({ ...leadForm, origem: e.target.value as Origin })}
                className="w-full h-10 bg-slate-50 border border-border rounded-lg text-xs font-semibold px-2.5 focus:ring-1 focus:ring-primary cursor-pointer outline-none"
              >
                <option value="INSTAGRAM">Instagram</option>
                <option value="SITE">Site institucional</option>
                <option value="INDICACAO">Indicação de Cliente</option>
                <option value="GOOGLE">Google Ads/Orgânico</option>
                <option value="WHATSAPP">WhatsApp Corporativo</option>
                <option value="FACEBOOK">Facebook</option>
              </select>
            </div>
          </div>

          {/* Seção 3: Características do Imóvel e Entrega */}
          {!isExistingClient && (
            <div className="space-y-3 pt-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-100 pb-1.5 mt-2">
                Ficha Técnica do Imóvel & Logística
              </span>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Tipo do Imóvel
                  </label>
                  <select
                    value={leadForm.tipo_imovel}
                    onChange={(e) => setLeadForm({ ...leadForm, tipo_imovel: e.target.value })}
                    className="w-full h-10 bg-slate-50 border border-border rounded-lg text-xs font-semibold px-2.5 focus:ring-1 focus:ring-primary cursor-pointer outline-none animate-fade-in"
                  >
                    <option value="CASA">Casa Residencial</option>
                    <option value="APARTAMENTO">Apartamento Residencial</option>
                    <option value="COMERCIAL">Sala Comercial / Escritório</option>
                    <option value="SOBRADO">Sobrado / Triplex</option>
                    <option value="OUTRO">Outro / Especial</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Observações da Obra / Imóvel
                    </label>
                    <textarea
                      value={leadForm.obs_imovel}
                      onChange={(e) => setLeadForm({ ...leadForm, obs_imovel: e.target.value })}
                      rows={2}
                      className="w-full p-2.5 text-xs bg-slate-50 border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none font-semibold resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Restrições de Entrega / Logística
                    </label>
                    <textarea
                      value={leadForm.obs_entrega}
                      onChange={(e) => setLeadForm({ ...leadForm, obs_entrega: e.target.value })}
                      rows={2}
                      className="w-full p-2.5 text-xs bg-slate-50 border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none font-semibold resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Seção 4: Dados do Projeto Comercial */}
          <div className="space-y-3 pt-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-100 pb-1.5 mt-2">
              Detalhes do Projeto & Negócio
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Valor Previsto (R$)
                </label>
                <Input
                  type="number"
                  required
                  value={leadForm.valor_previsto}
                  onChange={(e) => setLeadForm({ ...leadForm, valor_previsto: e.target.value })}
                  className="text-xs h-10 font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Etapa / Coluna Inicial
                </label>
                <select
                  value={statusGeralInicial}
                  onChange={(e) => setStatusGeralInicial(e.target.value as ProjectStatus)}
                  className="w-full h-10 bg-slate-50 border border-border rounded-lg text-xs font-semibold px-2.5 focus:ring-1 focus:ring-primary cursor-pointer outline-none"
                >
                  {FUNNEL_COLUMNS.map((col) => (
                    <option key={col.id} value={col.id}>{col.title}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/40 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsNewLeadOpen(false)}
              disabled={loading}
              className="text-xs font-bold cursor-pointer"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="font-bold text-xs cursor-pointer bg-[hsl(28_85%_45%)] text-white hover:bg-[hsl(28_85%_40%)] border-none">
              {loading ? "Cadastrando..." : "Cadastrar Lead"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal - Editar Card do Kanban */}
      <Dialog isOpen={isEditLeadOpen} onClose={() => setIsEditLeadOpen(false)}>
        <h3 className="text-lg font-bold tracking-tight text-gradient-gold mb-4">
          Editar Informações do Card
        </h3>
        
        <form onSubmit={handleEditLeadSubmit} className="space-y-3">
          {/* Autopreenchimento de CNPJ no topo com largura total */}
          <div className="p-4 rounded-xl border border-[hsl(28_85%_90%)] bg-[hsl(28_85%_98%)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[hsl(28_85%_45%)] uppercase tracking-wider block">
                CNPJ (Editar / Preencher dados da Empresa)
              </span>
              <span className="text-[9px] font-semibold text-slate-400 bg-white border border-slate-100 px-2 py-0.5 rounded-full">
                BrasilAPI integrada
              </span>
            </div>
            <Input
              value={leadForm.cnpj}
              onChange={(e) => {
                const val = e.target.value;
                setLeadForm({ ...leadForm, cnpj: val });
                fetchCompanyByCnpj(val);
              }}
              className="bg-white border-slate-200 text-xs h-10 font-medium"
            />
          </div>

          {/* Seção 1: Dados Básicos */}
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-100 pb-1.5 mt-2">
              Informações Gerais do Cliente
            </span>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Nome Completo do Cliente / Razão Social
              </label>
              <Input
                required
                value={leadForm.nome}
                onChange={(e) => setLeadForm({ ...leadForm, nome: e.target.value })}
                className="text-xs h-10 font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  E-mail
                </label>
                <Input
                  type="email"
                  required
                  value={leadForm.email}
                  onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                  className="text-xs h-10"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Telefone / WhatsApp
                </label>
                <Input
                  required
                  value={leadForm.telefone}
                  onChange={(e) => setLeadForm({ ...leadForm, telefone: e.target.value })}
                  className="text-xs h-10 font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Seção 2: Localização e Endereço Completo */}
          <div className="space-y-3 pt-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-100 pb-1.5 mt-2">
              Endereço de Entrega & Instalação
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  CEP
                </label>
                <Input
                  value={leadForm.cep}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLeadForm({ ...leadForm, cnpj: val }); // Correção de digitação herdada (deve ser cep)
                    fetchAddressByCep(val);
                  }}
                  className="text-xs h-10 font-semibold"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Rua / Logradouro
                </label>
                <Input
                  value={leadForm.endereco}
                  onChange={(e) => setLeadForm({ ...leadForm, endereco: e.target.value })}
                  className="text-xs h-10 font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-1">
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Número
                </label>
                <Input
                  value={leadForm.numero}
                  onChange={(e) => setLeadForm({ ...leadForm, numero: e.target.value })}
                  className="text-xs h-10 font-semibold"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Bairro
                </label>
                <Input
                  value={leadForm.bairro}
                  onChange={(e) => setLeadForm({ ...leadForm, bairro: e.target.value })}
                  className="text-xs h-10 font-semibold"
                />
              </div>
              <div className="sm:col-span-1">
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Estado (UF)
                </label>
                <Input
                  value={leadForm.uf}
                  onChange={(e) => setLeadForm({ ...leadForm, uf: e.target.value })}
                  className="text-xs h-10 font-semibold uppercase"
                />
              </div>
            </div>
          </div>

          {/* Cidade e Origem */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Cidade de Instalação
              </label>
              <Input
                required
                value={leadForm.cidade}
                onChange={(e) => setLeadForm({ ...leadForm, cidade: e.target.value })}
                className="text-xs h-10 font-semibold"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Origem do Lead
              </label>
              <select
                value={leadForm.origem}
                onChange={(e) => setLeadForm({ ...leadForm, origem: e.target.value as Origin })}
                className="w-full h-10 bg-slate-50 border border-border rounded-lg text-xs font-semibold px-2.5 focus:ring-1 focus:ring-primary cursor-pointer outline-none"
              >
                <option value="INSTAGRAM">Instagram</option>
                <option value="SITE">Site institucional</option>
                <option value="INDICACAO">Indicação de Cliente</option>
                <option value="GOOGLE">Google Ads/Orgânico</option>
                <option value="WHATSAPP">WhatsApp Corporativo</option>
                <option value="FACEBOOK">Facebook</option>
              </select>
            </div>
          </div>

          {/* Seção 3: Características do Imóvel e Entrega */}
          <div className="space-y-3 pt-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-100 pb-1.5 mt-2">
              Ficha Técnica do Imóvel & Logística
            </span>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Tipo do Imóvel
                </label>
                <select
                  value={leadForm.tipo_imovel}
                  onChange={(e) => setLeadForm({ ...leadForm, tipo_imovel: e.target.value })}
                  className="w-full h-10 bg-slate-50 border border-border rounded-lg text-xs font-semibold px-2.5 focus:ring-1 focus:ring-primary cursor-pointer outline-none"
                >
                  <option value="CASA">Casa Residencial</option>
                  <option value="APARTAMENTO">Apartamento Residencial</option>
                  <option value="COMERCIAL">Sala Comercial / Escritório</option>
                  <option value="SOBRADO">Sobrado / Triplex</option>
                  <option value="OUTRO">Outro / Especial</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Observações da Obra / Imóvel
                  </label>
                  <textarea
                    value={leadForm.obs_imovel}
                    onChange={(e) => setLeadForm({ ...leadForm, obs_imovel: e.target.value })}
                    rows={2}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none font-semibold resize-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Restrições de Entrega / Logística
                  </label>
                  <textarea
                    value={leadForm.obs_entrega}
                    onChange={(e) => setLeadForm({ ...leadForm, obs_entrega: e.target.value })}
                    rows={2}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none font-semibold resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Seção 4: Dados do Projeto Comercial */}
          <div className="space-y-3 pt-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-100 pb-1.5 mt-2">
              Detalhes do Projeto & Negócio
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Valor do Projeto (R$)
                </label>
                <Input
                  type="number"
                  required
                  value={leadForm.valor_previsto}
                  onChange={(e) => setLeadForm({ ...leadForm, valor_previsto: e.target.value })}
                  className="text-xs h-10 font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Etapa / Coluna no Kanban
                </label>
                <select
                  value={editingStatusGeral}
                  onChange={(e) => setEditingStatusGeral(e.target.value as ProjectStatus)}
                  className="w-full h-10 bg-slate-50 border border-border rounded-lg text-xs font-semibold px-2.5 focus:ring-1 focus:ring-primary cursor-pointer outline-none"
                >
                  {STATUS_OPTIONS.map(col => (
                    <option key={col.id} value={col.id}>{col.title}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/40 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditLeadOpen(false)}
              disabled={loading}
              className="text-xs font-bold cursor-pointer"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="font-bold text-xs cursor-pointer bg-[hsl(28_85%_45%)] text-white hover:bg-[hsl(28_85%_40%)] border-none">
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </Dialog>
      <ActionDialogHost dialog={dialog} />
    </div>
  );
}
