"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { 
  updateProjectGeneralStatus, 
  addEnvironment, 
  addTimelineEvent, 
  toggleFileApproval, 
  uploadProjectFile,
  updateProjectDetails,
  type EnvironmentType,
  type EnvironmentStatus,
  type FileType
} from "@/app/actions/project";
import { deleteQuote, getQuoteForEdit } from "@/app/actions/quotes";
import { getProjectDetailsAction } from "@/app/actions/project";
import { getProjectLiveSnapshot } from "@/app/actions/liveSnapshots";
import { useLiveEntity } from "@/context/LiveSyncContext";
import { isSafeInternalPath, navigateApp } from "@/lib/navigateApp";
import { payInstallment, createTask, toggleTaskStatus } from "@/app/actions/operations";
import { markNotaFiscalEmitida } from "@/app/actions/productionSla";
import dynamic from "next/dynamic";
import type { QuoteBuilderEditingQuote } from "@/components/QuoteBuilder";
import type { ReceiptIssuePrefill } from "@/components/finance/ReceiptIssueDialog";
import type { ConfTecnicaWhatsAppTarget } from "@/components/ConfTecnicaWhatsAppDialog";
import type { EnvironmentGalleryTarget } from "@/components/EnvironmentGalleryModal";
import {
  summarizeQuoteItems,
  quoteCommercialLabel,
  isQuoteCommerciallyExpired,
} from "@/lib/quoteApproval";
import { formatQuoteCodigo } from "@/lib/quoteCodigo";
import SlaRadar from "@/components/SlaRadar";
import { canManageEnvironmentAttachments, EMPTY_ENVIRONMENT_ATTACHMENT_SUMMARY, sortEnvironmentsForOperator } from "@/lib/factoryEnvironment";
import EnvironmentProjectCard from "@/components/environments/EnvironmentProjectCard";
import EnvironmentProjectListRow from "@/components/environments/EnvironmentProjectListRow";
import {
  ENVIRONMENT_GRID_COL_CLASS,
  readEnvironmentViewPrefs,
  writeEnvironmentViewPrefs,
  type EnvironmentGridCols,
  type EnvironmentViewMode,
} from "@/lib/environmentProjectView";
import type { ProjectSlaView } from "@/lib/productionSla";
import { ActionDialogHost, useActionDialog } from "@/components/ActionDialogHost";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { usePermissions } from "@/context/PermissionsContext";
import { useTabletLayout } from "@/hooks/useTabletLayout";
import { useProjectChatFocus } from "@/context/ProjectChatContext";
import { PrivacyMoney } from "@/components/privacy/PrivacyMoney";
import { useSensitiveDisplay } from "@/hooks/useSensitiveDisplay";
import { formatDateBR, toISODateBR } from "@/lib/brazilDate";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { labelPaymentMethod } from "@/lib/paymentMethods";
import {
  formatQuoteViewLabel,
  toQuoteViewStats,
} from "@/lib/quoteViewTracking";

const QuoteBuilder = dynamic(() => import("@/components/QuoteBuilder"), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl border border-border/40 bg-card/40 p-8 text-sm text-muted-foreground animate-pulse">
      Carregando construtor de orçamento…
    </div>
  ),
});
const QuoteApprovalDialog = dynamic(() => import("@/components/quotes/QuoteApprovalDialog"), {
  ssr: false,
});
const InstallmentLaunchDialog = dynamic(
  () => import("@/components/finance/InstallmentLaunchDialog"),
  { ssr: false }
);
const ReceiptIssueDialog = dynamic(
  () => import("@/components/finance/ReceiptIssueDialog"),
  { ssr: false }
);
const ConfTecnicaWhatsAppDialog = dynamic(
  () => import("@/components/ConfTecnicaWhatsAppDialog"),
  { ssr: false }
);
const SlaVerificationModal = dynamic(() => import("@/components/SlaVerificationModal"), {
  ssr: false,
});
const EnvironmentGalleryModal = dynamic(
  () => import("@/components/EnvironmentGalleryModal"),
  { ssr: false }
);
import {
  ArrowLeft,
  User, 
  TrendingUp, 
  Plus, 
  Layers, 
  Clock, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Eye, 
  Upload, 
  ArrowRight,
  ShieldCheck,
  Send,
  DollarSign,
  Trash2,
  Handshake,
  Box,
  Wand2,
  Calendar,
  ChevronDown,
  Receipt,
  Images,
  Paperclip,
  MessageSquare,
  LayoutGrid,
  List,
} from "lucide-react";
import type {
  PartnerProjectFileDTO,
  PartnerProjectNoteDTO,
} from "@/lib/partnerPortal";

interface Environment {
  id: string;
  nome: string;
  tipo: string;
  status: string;
  attachmentCount: number;
  coverUrl: string | null;
  coverPdfUrl: string | null;
  categories: import("@prisma/client").EnvironmentAttachmentCategory[];
  hasArchProject: boolean;
  hasFactoryProject: boolean;
  hasFactoryProjectImages: boolean;
}

interface ProjectFile {
  id: string;
  tipo: string;
  url: string;
  versao: number;
  aprovado_producao: boolean;
  nome_arquivo: string;
}

interface TimelineEvent {
  id: string;
  acao: string;
  data: string;
  interno_sotamente: boolean;
  user: {
    name: string;
  };
}

interface Quote {
  id: string;
  versao: number;
  codigo?: string | null;
  template_tipo?: string | null;
  subtotal: number;
  desconto: number;
  valor_final: number;
  validade: string;
  observacoes: string;
  aprovado_em: string | null;
  pdf_shared_at?: string | null;
  pdf_view_count?: number;
  pdf_first_viewed_at?: string | null;
  pdf_last_viewed_at?: string | null;
  pdf_last_device?: string | null;
  pdf_last_os?: string | null;
  items?: Array<{
    id: string;
    descricao: string;
    quantidade: number;
    tipo_custo?: string;
    valor_unitario: number;
    valor_total: number;
    status?: string | null;
    aprovado_em?: string | null;
    subitens?: string[];
    showcase_product_id?: string | null;
  }>;
}

interface Installment {
  id: string;
  valor: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status: string;
  tipo: string;
  metodo_pagamento?: string;
  numero_parcela?: number | null;
  total_parcelas?: number | null;
}

interface Task {
  id: string;
  titulo: string;
  descricao: string;
  responsavel: string;
  data: string;
  status: string;
  tipo: string;
}

interface Project {
  id: string;
  valor_previsto: number;
  status_geral: string;
  client: {
    id: string;
    nome: string;
    cidade?: string;
    origem?: string;
    telefone?: string;
    email?: string;
    observacoes?: string | null;
    lgpd_aceite?: boolean;
    lgpd_aceite_em?: string | Date | null;
    marketing_aceite?: boolean;
  };
  environments: Environment[];
  files: ProjectFile[];
  timeline: TimelineEvent[];
  quotes: Quote[];
  tasks: Task[];
  installments: Installment[];
  
  // Controle Operacional do Projeto
  data_entrega_prevista?: string | null;
  responsavel_id?: string | null;
  responsavelNome?: string | null;
  conf_tecnica_resp1_id?: string | null;
  conf_tecnica_resp1Nome?: string | null;
  conf_tecnica_resp2_id?: string | null;
  conf_tecnica_resp2Nome?: string | null;
  partner_id?: string | null;
  partner?: {
    nome: string;
    tipo: string;
  } | null;
  observacoes?: string | null;
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
    score?: number | null;
    roteiro_sugerido?: string | null;
    createdAt: string;
  } | null;
}

interface ColaboradorSelect {
  id: string;
  name: string;
  cargo: string;
}

interface ProjectDetailsProps {
  initialProject: Project;
  companyId: string;
  colaboradores: ColaboradorSelect[];
  isMock: boolean;
  initialSla?: ProjectSlaView | null;
  embedded?: boolean;
  backHref?: string;
  backLabel?: string;
  onClose?: () => void;
  initialOpenCreateQuote?: boolean;
  partnerContributions?: {
    notes: PartnerProjectNoteDTO[];
    files: PartnerProjectFileDTO[];
  };
}

const ENVIRONMENT_STATUSES: { value: EnvironmentStatus; label: string; bg: string }[] = [
  { value: "AGUARDANDO_MEDICAO", label: "Aguardando Medição", bg: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  { value: "EM_DETALHAMENTO", label: "Em Detalhamento", bg: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  { value: "PRONTO_PRODUCAO", label: "Pronto para Produção", bg: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  { value: "EM_CORTE", label: "Em Corte / Usinagem", bg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
  { value: "MONTAGEM_FABRICA", label: "Montagem na Fábrica", bg: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  { value: "PRONTO_ENTREGA", label: "Pronto para Entrega", bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  { value: "EM_INSTALACAO", label: "Em Instalação", bg: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
  { value: "FINALIZADO", label: "Finalizado", bg: "bg-slate-500/10 text-slate-400 border-slate-500/20" }
];

const FILE_TYPES: { value: FileType; label: string }[] = [
  { value: "MEDICAO", label: "Medição Técnica" },
  { value: "RENDER", label: "Render 3D" },
  { value: "CONTRATO", label: "Contrato Assinado" },
  { value: "FOTO", label: "Foto do Local / Instalação" },
  { value: "PROJETO_TECNICO", label: "Projeto Técnico (CAD/SketchUp)" }
];

export default function ProjectDetails({ initialProject, companyId, colaboradores, isMock, initialSla = null, embedded = false, backHref = "/crm", backLabel = "Voltar para o CRM Kanban", onClose, initialOpenCreateQuote = false, partnerContributions }: ProjectDetailsProps) {
  const { isAdmin, isOpsLimited, role } = usePermissions();
  const { isTablet } = useTabletLayout();
  const isFactoryRole = role === "PRODUCAO";
  const canManageEnvGallery = canManageEnvironmentAttachments(role);
  const canManageProjectFiles = canManageEnvGallery;
  const sensitive = useSensitiveDisplay();
  const [project, setProject] = useState<Project>(initialProject);
  const [environmentFilter, setEnvironmentFilter] = useState<
    "all" | "with_files" | "production_ready" | "empty"
  >("all");
  const [environmentViewMode, setEnvironmentViewMode] = useState<EnvironmentViewMode>("grid");
  const [environmentGridCols, setEnvironmentGridCols] = useState<EnvironmentGridCols>(4);
  const sortedEnvironments = useMemo(
    () => sortEnvironmentsForOperator(project.environments),
    [project.environments]
  );
  const filteredEnvironments = useMemo(() => {
    if (environmentFilter === "all") return sortedEnvironments;
    if (environmentFilter === "with_files") {
      return sortedEnvironments.filter((env) => env.attachmentCount > 0);
    }
    if (environmentFilter === "production_ready") {
      return sortedEnvironments.filter(
        (env) => env.hasFactoryProject || env.hasArchProject
      );
    }
    return sortedEnvironments.filter((env) => env.attachmentCount === 0);
  }, [sortedEnvironments, environmentFilter]);
  const environmentStats = useMemo(() => {
    const withFiles = project.environments.filter((env) => env.attachmentCount > 0).length;
    const withFactory = project.environments.filter((env) => env.hasFactoryProject).length;
    const withArch = project.environments.filter((env) => env.hasArchProject).length;
    const productionReady = project.environments.filter(
      (env) => env.hasFactoryProject || env.hasArchProject
    ).length;
    const empty = project.environments.filter((env) => env.attachmentCount === 0).length;
    return { withFiles, withFactory, withArch, productionReady, empty };
  }, [project.environments]);
  useProjectChatFocus({ projectId: project.id, clientName: project.client.nome });
  const isFormLead = !isOpsLimited && project.client.origem === "FORMULARIO";
  const hasNoQuote = !project.quotes || project.quotes.length === 0;
  const isBlocked = isFormLead && hasNoQuote;
  const [sla, setSla] = useState<ProjectSlaView | null>(initialSla);
  const [slaModalOpen, setSlaModalOpen] = useState(false);
  const dialog = useActionDialog();
  const { showSuccess, showError, confirmAction } = dialog;
  const [isAddEnvOpen, setIsAddEnvOpen] = useState(false);
  const [confTecnicaWhatsApp, setConfTecnicaWhatsApp] =
    useState<ConfTecnicaWhatsAppTarget | null>(null);
  const searchParams = useSearchParams();
  const backFromUrl = searchParams?.get("back");
  const resolvedBackHref = isSafeInternalPath(backFromUrl)
    ? backFromUrl
    : isFactoryRole
      ? "/factory"
      : backHref;
  const resolvedBackLabel =
    isSafeInternalPath(backFromUrl) && backFromUrl.startsWith("/clientes/")
      ? "Voltar ao cliente"
      : isSafeInternalPath(backFromUrl) && backFromUrl.startsWith("/factory")
        ? "Voltar ao chão de fábrica"
        : isFactoryRole
          ? "Voltar ao chão de fábrica"
          : backLabel;

  const defaultTab = (() => {
    const fromUrl = searchParams?.get("tab");
    if (isOpsLimited) {
      return ["environments", "tasks", "files"].includes(fromUrl ?? "")
        ? fromUrl!
        : "environments";
    }
    if (
      fromUrl &&
      ["environments", "quotes", "briefing", "finances", "tasks", "files", "timeline"].includes(fromUrl)
    ) {
      return fromUrl;
    }
    const status = initialProject.status_geral;
    if (status === "LEAD" || status === "ORCAMENTO" || status === "NEGOCIACAO") {
      return (initialProject.quotes?.length ?? 0) > 0 ? "quotes" : "briefing";
    }
    if (status === "APROVADO" || status === "CONFERENCIA_TECNICA") {
      return (initialProject.environments?.length ?? 0) > 0 ? "environments" : "quotes";
    }
    if (status === "PRODUCAO" || status === "INSTALACAO") return "environments";
    if (status === "FINALIZADO") return "finances";
    return "quotes";
  })();

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [isCreatingQuote, setIsCreatingQuote] = useState(false);
  const [editingQuote, setEditingQuote] = useState<QuoteBuilderEditingQuote | null>(null);
  const [loadingEditQuote, setLoadingEditQuote] = useState(false);

  useEffect(() => {
    if (
      !isOpsLimited &&
      (initialOpenCreateQuote ||
        searchParams?.get("createQuote") === "true" ||
        searchParams?.get("createQuote") === "1")
    ) {
      setIsCreatingQuote(true);
    }
    const fromUrl = searchParams?.get("tab");
    if (isOpsLimited) {
      return;
    }
    if (
      fromUrl &&
      ["environments", "quotes", "briefing", "finances", "tasks", "files", "timeline"].includes(fromUrl)
    ) {
      setActiveTab(fromUrl);
    }
  }, [searchParams, initialOpenCreateQuote, isOpsLimited]);

  useEffect(() => {
    const editQuoteId = searchParams?.get("editQuote");
    if (!editQuoteId || isOpsLimited) return;
    let cancelled = false;
    (async () => {
      setActiveTab("quotes");
      setLoadingEditQuote(true);
      const res = await getQuoteForEdit(editQuoteId);
      if (cancelled) return;
      setLoadingEditQuote(false);
      if (!res.success || !res.data) {
        showError("Não foi possível editar", res.error || "Orçamento não encontrado.");
        return;
      }
      setEditingQuote(res.data);
      setIsCreatingQuote(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open once from URL
  }, [searchParams, isOpsLimited]);

  // Estados para Controle Operacional do Projeto (Responsável, Entrega, Parceiro e Observações)
  const [responsavelId, setResponsavelId] = useState(project.responsavel_id || "none");
  const [confResp1Id, setConfResp1Id] = useState(project.conf_tecnica_resp1_id || "none");
  const [confResp2Id, setConfResp2Id] = useState(project.conf_tecnica_resp2_id || "none");
  const [dataEntrega, setDataEntrega] = useState(project.data_entrega_prevista ? project.data_entrega_prevista.split("T")[0] : "");
  const [observacoesProj, setObservacoesProj] = useState(project.observacoes || "");
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [partners, setPartners] = useState<any[]>([]);
  const [partnerId, setPartnerId] = useState(project.partner_id || "none");
  const showConfTecnica =
    project.status_geral === "APROVADO" ||
    project.status_geral === "CONFERENCIA_TECNICA" ||
    project.status_geral === "PRODUCAO" ||
    project.status_geral === "INSTALACAO";
  const canEditConfTecnica =
    project.status_geral === "APROVADO" || project.status_geral === "CONFERENCIA_TECNICA";

  useEffect(() => {
    if (isOpsLimited || !isEditingMeta) return;
    let cancelled = false;
    async function loadPartners() {
      const { getParceiros } = await import("@/app/actions/parceiros");
      const res = await getParceiros(companyId);
      if (cancelled) return;
      if (res.success && res.parceiros) {
        setPartners(res.parceiros);
      }
    }
    void loadPartners();
    return () => {
      cancelled = true;
    };
  }, [companyId, isOpsLimited, isEditingMeta]);

  const handleSaveProjectDetails = async () => {
    setLoading(true);
    const res = await updateProjectDetails(project.id, {
      data_entrega_prevista: dataEntrega || null,
      responsavel_id: responsavelId,
      conf_tecnica_resp1_id: confResp1Id,
      conf_tecnica_resp2_id: confResp2Id,
      observacoes: observacoesProj,
      partner_id: partnerId
    });

    if (res.success) {
      const selected = colaboradores.find(c => c.id === responsavelId);
      const selectedConf1 = colaboradores.find(c => c.id === confResp1Id);
      const selectedConf2 = colaboradores.find(c => c.id === confResp2Id);
      const selectedPartner = partners.find(p => p.id === partnerId);
      setProject(prev => ({
        ...prev,
        responsavel_id: responsavelId === "none" ? null : responsavelId,
        responsavelNome: selected ? selected.name : null,
        conf_tecnica_resp1_id: confResp1Id === "none" ? null : confResp1Id,
        conf_tecnica_resp1Nome: selectedConf1 ? selectedConf1.name : null,
        conf_tecnica_resp2_id: confResp2Id === "none" ? null : confResp2Id,
        conf_tecnica_resp2Nome: selectedConf2 ? selectedConf2.name : null,
        partner_id: partnerId === "none" ? null : partnerId,
        partner: selectedPartner ? { nome: selectedPartner.nome, tipo: selectedPartner.tipo } : null,
        data_entrega_prevista: dataEntrega ? new Date(dataEntrega).toISOString() : null,
        observacoes: observacoesProj,
        timeline: [
          {
            id: `local-meta-${Date.now()}`,
            acao: `Detalhes operacionais atualizados (Responsável: ${selected ? selected.name : "Nenhum"}, Parceiro: ${selectedPartner ? selectedPartner.nome : "Nenhum"}, Entrega: ${dataEntrega ? new Date(dataEntrega).toLocaleDateString("pt-BR") : "não definida"})`,
            data: new Date().toISOString(),
            interno_sotamente: true,
            user: { name: "Sistema" }
          },
          ...prev.timeline
        ]
      }));
      setIsEditingMeta(false);
      showSuccess("Detalhes salvos", "Informações operacionais do projeto foram atualizadas.");
    } else {
      showError("Erro ao salvar", `Não foi possível atualizar os detalhes: ${res.error}`);
    }
    setLoading(false);
  };
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [approvingQuoteId, setApprovingQuoteId] = useState<string | null>(null);
  const [approvalQuote, setApprovalQuote] = useState<Quote | null>(null);
  const [isAddInstallmentOpen, setIsAddInstallmentOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptPrefill, setReceiptPrefill] = useState<ReceiptIssuePrefill | null>(null);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);

  const [newTaskForm, setNewTaskForm] = useState({
    titulo: "",
    descricao: "",
    responsavel: "",
    data: "2026-07-01",
    hora: "09:00",
    tipo: "MEDICAO_TECNICA" as "VISITA_COMERCIAL" | "MEDICAO_TECNICA" | "ENTREGA_MOVEIS" | "INSTALACAO" | "OUTROS"
  });

  // Estados dos formulários
  const [newEnvForm, setNewEnvForm] = useState({ nome: "", tipo: "COZINHA" as EnvironmentType });
  const [galleryEnvironment, setGalleryEnvironment] =
    useState<EnvironmentGalleryTarget | null>(null);
  const [timelineInput, setTimelineInput] = useState("");
  const [isTimelinePrivate, setIsTimelinePrivate] = useState(true);
  const [timelineFilter, setTimelineFilter] = useState<"ALL" | "PUBLIC" | "PRIVATE">("ALL");
  const [uploadForm, setUploadForm] = useState({ tipo: "RENDER" as FileType, nome_arquivo: "" });
  const [loading, setLoading] = useState(false);
  const [isRenderingPro, setIsRenderingPro] = useState(false);

  useEffect(() => {
    const saved = readEnvironmentViewPrefs();
    setEnvironmentViewMode(saved.viewMode);
    setEnvironmentGridCols(saved.gridCols);
  }, []);

  useEffect(() => {
    writeEnvironmentViewPrefs({
      viewMode: environmentViewMode,
      gridCols: environmentGridCols,
    });
  }, [environmentViewMode, environmentGridCols]);

  const syncProject = useCallback(async () => {
    const result = await getProjectLiveSnapshot(project.id);
    if (result.success && result.project) {
      setProject(result.project as Project);
      if (result.sla) {
        setSla(result.sla);
      }
    }
  }, [project.id]);

  useLiveEntity("projects", {
    sync: syncProject,
    skipInitialSync: true,
    enabled:
      !loading &&
      !isEditingMeta &&
      !isCreatingQuote &&
      !isAddEnvOpen &&
      !slaModalOpen &&
      !isUploadOpen &&
      !isAddTaskOpen &&
      !isAddInstallmentOpen,
  });

  const handlePromobImportClick = () => {
    showSuccess(
      "Importação Promob — em breve",
      "Esse botão era só um protótipo. Nada é gravado no projeto nem enviado à fábrica. A leitura real do XML/TXT do Promob ainda será ligada."
    );
  };

  // Simula a IA transformando o desenho técnico em um render fotorrealista
  const handleSimulateRenderPro = (fileId: string) => {
    setIsRenderingPro(true);
    setTimeout(() => {
      setProject(prev => {
        const updatedFiles = prev.files.map(f => {
          if (f.id === fileId) {
            return {
              ...f,
              nome_arquivo: f.nome_arquivo.replace(/\.[^/.]+$/, "") + "_fotorrealista_RenderPro.jpg",
              tipo: "RENDER" as FileType
            };
          }
          return f;
        });

        return {
          ...prev,
          files: updatedFiles,
          timeline: [
            {
              id: "render-pro-time-" + Date.now(),
              acao: "Render Pro (IA) finalizado: imagem convertida para fotorrealismo HD.",
              data: new Date().toISOString(),
              interno_sotamente: false,
              user: { name: "Render Pro (IA)" }
            },
            ...prev.timeline
          ]
        };
      });

      setIsRenderingPro(false);
      showSuccess("Render concluído", "A imagem foi transformada em fotorrealismo HD e está disponível para o cliente.");
    }, 1500);
  };

  // Helper de Moeda
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

  // Handler de alteração do status geral do projeto
  const handleStatusChange = async (newStatus: string) => {
    const originalStatus = project.status_geral;
    const enteringConfTecnica =
      newStatus === "CONFERENCIA_TECNICA" &&
      originalStatus !== "CONFERENCIA_TECNICA";
    setProject({ ...project, status_geral: newStatus });
    
    const result = await updateProjectGeneralStatus(project.id, newStatus);
    if (!result.success) {
      setProject({ ...project, status_geral: originalStatus });
      showError("Erro ao alterar status", "Não foi possível alterar o status do projeto.");
    } else if (enteringConfTecnica) {
      setConfTecnicaWhatsApp({
        projectId: project.id,
        clientName: project.client.nome,
        clientPhone: project.client.telefone || "",
        responsaveis: [
          project.conf_tecnica_resp1Nome,
          project.conf_tecnica_resp2Nome,
        ].filter((name): name is string => Boolean(name)),
      });
    }
  };

  // Submit para adicionar ambiente
  const handleAddEnvSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await addEnvironment(project.id, newEnvForm.nome, newEnvForm.tipo);
    if (result.success && result.data) {
      const created = result.data as { id: string; nome: string; tipo: string; status: string };
      setProject({
        ...project,
        environments: [
          ...project.environments,
          { ...created, ...EMPTY_ENVIRONMENT_ATTACHMENT_SUMMARY },
        ],
        // Adiciona um evento mockado localmente na timeline para atualizar instantaneamente
        timeline: [
          {
            id: `local-time-${Date.now()}`,
            acao: `Ambiente "${newEnvForm.nome}" (${newEnvForm.tipo}) adicionado ao projeto`,
            data: new Date().toISOString(),
            interno_sotamente: false,
            user: { name: "Usuário do SaaS" }
          },
          ...project.timeline
        ]
      });
      const envNome = newEnvForm.nome;
      setIsAddEnvOpen(false);
      setNewEnvForm({ nome: "", tipo: "COZINHA" });
      showSuccess("Ambiente adicionado", `"${envNome}" foi incluído no projeto.`);
    } else {
      showError("Erro ao adicionar", "Não foi possível adicionar o ambiente.");
    }
    setLoading(false);
  };

  // Enviar nota na Timeline
  const handleSendTimeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timelineInput.trim()) return;

    const text = timelineInput.trim();
    setTimelineInput("");

    const result = await addTimelineEvent(project.id, text, isTimelinePrivate);
    if (result.success && result.data) {
      setProject({
        ...project,
        timeline: [
          {
            id: result.data.id,
            acao: result.data.acao,
            data: result.data.data.toISOString ? result.data.data.toISOString() : new Date(result.data.data).toISOString(),
            interno_sotamente: result.data.interno_sotamente,
            user: result.data.user
          },
          ...project.timeline
        ]
      });
      showSuccess("Nota publicada", isTimelinePrivate ? "Nota interna adicionada à timeline." : "Nota publicada na timeline do projeto.");
    } else {
      showError("Erro ao publicar", "Não foi possível publicar a nota na timeline.");
    }
  };

  // Toggle de liberação de arquivos para corte na fábrica
  const handleToggleFileApproval = async (fileId: string, currentApproved: boolean) => {
    const updatedFiles = project.files.map(f => f.id === fileId ? { ...f, aprovado_producao: !currentApproved } : f);
    setProject({ ...project, files: updatedFiles });

    const result = await toggleFileApproval(project.id, fileId, !currentApproved);
    if (!result.success) {
      // Reverte estado
      setProject({
        ...project,
        files: project.files.map(f => f.id === fileId ? { ...f, aprovado_producao: currentApproved } : f)
      });
      showError("Erro ao alterar arquivo", "Não foi possível alterar o status do arquivo.");
    } else {
      // Cria uma entrada local na timeline
      const logText = `Arquivo técnico foi ${!currentApproved ? "LIBERADO" : "BLOQUEADO"} para a produção/corte.`;
      setProject(prev => ({
        ...prev,
        timeline: [
          {
            id: `local-time-${Date.now()}`,
            acao: logText,
            data: new Date().toISOString(),
            interno_sotamente: true,
            user: { name: "Produção" }
          },
          ...prev.timeline
        ]
      }));
    }
  };

  // Submit de Upload do arquivo
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await uploadProjectFile(project.id, uploadForm);
    if (result.success && result.data) {
      const newFile: ProjectFile = {
        id: result.data.id,
        tipo: result.data.tipo,
        url: result.data.url,
        versao: result.data.versao,
        aprovado_producao: result.data.aprovado_producao,
        nome_arquivo: uploadForm.nome_arquivo || `Arquivo_${uploadForm.tipo}_v${result.data.versao}.pdf`
      };

      setProject({
        ...project,
        files: [newFile, ...project.files],
        timeline: [
          {
            id: `local-time-${Date.now()}`,
            acao: `Upload do arquivo "${newFile.nome_arquivo}" (v${newFile.versao}) realizado`,
            data: new Date().toISOString(),
            interno_sotamente: true,
            user: { name: "Sistema" }
          },
          ...project.timeline
        ]
      });
      setIsUploadOpen(false);
      setUploadForm({ tipo: "RENDER", nome_arquivo: "" });
      showSuccess("Upload concluído", "Arquivo adicionado ao projeto.");
    } else {
      showError("Erro no upload", "Não foi possível realizar o upload do arquivo.");
    }
    setLoading(false);
  };

  const handlePayInstallment = (installmentId: string) => {
    confirmAction({
      title: "Confirmar recebimento?",
      message: "Registrar o pagamento desta parcela no financeiro do projeto?",
      confirmLabel: "Confirmar pagamento",
      onConfirm: async () => {
        setProject(prev => ({
          ...prev,
          installments: prev.installments.map(ins => ins.id === installmentId ? {
            ...ins,
            status: "PAGO",
            data_pagamento: new Date().toISOString()
          } : ins)
        }));
        await payInstallment(project.id, installmentId);
        showSuccess("Pagamento registrado", "Parcela marcada como paga.");
      },
    });
  };

  const handleApproveQuote = (quote: Quote) => {
    if (approvingQuoteId) return;
    const summary = summarizeQuoteItems(
      (quote.items || []).map((i) => ({
        id: i.id,
        valor_total: Number(i.valor_total),
        status: i.status,
      }))
    );
    if (!summary.hasPending) return;
    setApprovalQuote(quote);
  };

  const openEditQuote = async (quoteId: string) => {
    if (loadingEditQuote) return;
    setLoadingEditQuote(true);
    const res = await getQuoteForEdit(quoteId);
    setLoadingEditQuote(false);
    if (!res.success || !res.data) {
      showError("Não foi possível editar", res.error || "Orçamento não encontrado.");
      return;
    }
    setApprovalQuote(null);
    setEditingQuote(res.data);
    setIsCreatingQuote(true);
    setActiveTab("quotes");
  };

  const closeQuoteBuilder = () => {
    setIsCreatingQuote(false);
    setEditingQuote(null);
  };

  const refreshProjectFromServer = async () => {
    const refreshed = await getProjectDetailsAction(project.id);
    if (refreshed.success && refreshed.project) {
      setProject(refreshed.project as Project);
    }
  };

  const handleDeleteProjectQuote = (quote: { id: string; versao: number; aprovado_em?: string | null }) => {
    const isApproved = Boolean(quote.aprovado_em);
    if (isApproved && !isAdmin) {
      showError("Não permitido", "Propostas aprovadas só podem ser excluídas por um administrador.");
      return;
    }
    confirmAction({
      title: isApproved ? "Excluir proposta aprovada?" : "Excluir proposta?",
      message: isApproved
        ? `A versão ${quote.versao} está aprovada e será removida permanentemente.`
        : `A versão ${quote.versao} será removida permanentemente.`,
      confirmLabel: "Sim, excluir",
      onConfirm: async () => {
        const previousQuotes = project.quotes;
        setProject(prev => ({ ...prev, quotes: prev.quotes.filter(item => item.id !== quote.id) }));
        const res = await deleteQuote(project.id, quote.id, quote.versao);
        if (!res.success) {
          setProject(prev => ({ ...prev, quotes: previousQuotes }));
          showError("Erro ao excluir", res.error ?? "Não foi possível excluir a proposta.");
          return;
        }
        showSuccess("Proposta excluída", `Versão ${quote.versao} removida do projeto.`);
      },
    });
  };

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    setProject(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === taskId ? {
        ...t,
        status: completed ? "CONCLUIDA" : "PENDENTE"
      } : t)
    }));

    await toggleTaskStatus(project.id, taskId, completed);
  };

  async function refreshInstallmentsFromServer() {
    const res = await getProjectDetailsAction(project.id);
    if (res.success && res.project) {
      setProject((prev) => ({
        ...prev,
        installments: res.project!.installments as Installment[],
      }));
      showSuccess("Financeiro atualizado", "Parcelas sincronizadas com o servidor.");
    }
  }

  const handleAddTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskForm.titulo || !newTaskForm.responsavel) return;

    setLoading(true);
    const dataHoraIso = new Date(`${newTaskForm.data}T${newTaskForm.hora}:00Z`).toISOString();
    
    const result = await createTask(project.id, {
      titulo: newTaskForm.titulo,
      descricao: newTaskForm.descricao,
      responsavel: newTaskForm.responsavel,
      data: dataHoraIso,
      tipo: newTaskForm.tipo
    });

    if (result.success && result.task) {
      const added: Task = {
        id: result.task.id,
        titulo: result.task.titulo,
        descricao: result.task.descricao || "",
        responsavel: result.task.responsavel,
        data: result.task.data.toISOString ? result.task.data.toISOString() : new Date(result.task.data).toISOString(),
        status: result.task.status,
        tipo: result.task.tipo
      };

      setProject(prev => ({
        ...prev,
        tasks: [added, ...prev.tasks],
        timeline: [
          {
            id: `local-time-${Date.now()}`,
            acao: `Tarefa "${added.titulo}" agendada com sucesso para o dia ${new Date(added.data).toLocaleDateString("pt-BR")}.`,
            data: new Date().toISOString(),
            interno_sotamente: false,
            user: { name: "Sistema" }
          },
          ...prev.timeline
        ]
      }));
      setIsAddTaskOpen(false);
      setNewTaskForm({
        titulo: "",
        descricao: "",
        responsavel: "",
        data: "2026-07-01",
        hora: "09:00",
        tipo: "MEDICAO_TECNICA"
      });
    }
    setLoading(false);
  };

  // Filtra a timeline conforme a privacidade selecionada
  const filteredTimeline = project.timeline.filter(item => {
    if (timelineFilter === "PUBLIC") return !item.interno_sotamente;
    if (timelineFilter === "PRIVATE") return item.interno_sotamente;
    return true;
  });

  return (
    <div className={`space-y-6 min-w-0 max-w-full ${isTablet ? "project-details-tablet space-y-4" : ""}`}>
      {/* Botão de Voltar e Banner de Mock */}
      {!embedded ? (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-0.5 transition-transform" />
              {resolvedBackLabel}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigateApp(resolvedBackHref)}
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-0.5 transition-transform" />
              {resolvedBackLabel}
            </button>
          )}
          {isMock && (
            <span className="text-[11px] font-semibold bg-accent border border-primary/20 text-primary px-3 py-1 rounded-full">
              Modo de Demonstração / Dados Mockados
            </span>
          )}
        </div>
      ) : null}

      {/* Banner de Projeto Bloqueado por Falta de Orçamento */}
      {!isOpsLimited && isBlocked && (
        <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-rose-900 uppercase tracking-wider">
                🔒 Projeto Comercial Bloqueado (Aguardando Orçamento)
              </h3>
              <p className="text-xs text-rose-700 font-medium leading-relaxed max-w-2xl mt-0.5">
                Este projeto foi originado através do formulário de qualificação (Briefing). Por regra comercial, ele está bloqueado e sem valor financeiro definido até que o primeiro orçamento seja gerado pelo construtor.
              </p>
            </div>
          </div>
          <Button
            onClick={() => {
              setEditingQuote(null);
              setIsCreatingQuote(true);
            }}
            className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2 px-5 rounded-xl cursor-pointer shadow-sm active:scale-95 transition-all"
          >
            Gerar Primeiro Orçamento
          </Button>
        </div>
      )}

      {/* Card Principal - Cabeçalho e Informações Básicas */}
      <div className={`rounded-xl border border-border bg-white p-6 shadow-sm ${isTablet ? "project-details-hero" : ""}`}>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          <div className="space-y-4 col-span-2">
            <div>
              <span className="text-xs font-bold text-primary tracking-widest uppercase">
                Projeto
              </span>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mt-1">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground break-words">
                  {project.client.nome}
                </h2>
                <Link
                  href={`/clientes/${project.client.id}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline shrink-0"
                >
                  Ver ficha do cliente
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed max-w-xl">
                Contato, origem e consentimentos estão na ficha do cliente. Aqui você gerencia
                prazos, status e execução deste projeto.
              </p>
            </div>

            {/* Controle Operacional do Projeto */}
            <div className="border-t border-slate-100 pt-4 mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Controle Operacional & Prazos
                </span>
                {!isOpsLimited && !isEditingMeta ? (
                  <Button 
                    onClick={() => setIsEditingMeta(true)}
                    variant="ghost" 
                    size="sm"
                    className="text-[10px] font-bold text-[hsl(28_85%_45%)] hover:bg-[hsl(28_85%_95%)] h-7 cursor-pointer"
                  >
                    Editar Controle
                  </Button>
                ) : !isOpsLimited ? (
                  <div className="flex items-center gap-2">
                    <Button 
                      onClick={() => setIsEditingMeta(false)}
                      variant="ghost" 
                      size="sm"
                      className="text-[10px] font-bold text-slate-400 h-7 cursor-pointer"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleSaveProjectDetails}
                      size="sm"
                      className="text-[10px] font-bold bg-[hsl(28_85%_45%)] text-white h-7 cursor-pointer border-none px-3"
                    >
                      Salvar
                    </Button>
                  </div>
                ) : null}
              </div>

              {!isEditingMeta ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center gap-1.5 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                      <User className="h-3.5 w-3.5 text-primary" />
                      Responsável Geral:
                    </div>
                    <strong className="text-sm text-slate-800 font-bold block">
                      {project.responsavelNome || "Não atribuído"}
                    </strong>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center gap-1.5 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      Previsão de Entrega:
                    </div>
                    <strong className="text-sm text-slate-800 font-bold block">
                      {project.data_entrega_prevista 
                        ? new Date(project.data_entrega_prevista).toLocaleDateString("pt-BR") 
                        : "Não definida"}
                    </strong>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center gap-1.5 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                      <Handshake className="h-3.5 w-3.5 text-primary" />
                      Parceiro Externo:
                    </div>
                    <strong className="text-sm text-slate-800 font-bold block truncate">
                      {project.partner ? `${project.partner.nome} (${project.partner.tipo})` : "Nenhum"}
                    </strong>
                  </div>

                  {showConfTecnica && (
                    <div className="sm:col-span-3 bg-emerald-50/60 border border-emerald-100 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center gap-1.5 text-emerald-800 font-bold uppercase text-[9px] tracking-wider">
                        <User className="h-3.5 w-3.5" />
                        Responsáveis — Conferência Técnica
                      </div>
                      <p className="text-sm text-slate-800 font-semibold">
                        {[project.conf_tecnica_resp1Nome, project.conf_tecnica_resp2Nome]
                          .filter(Boolean)
                          .join(" · ") || "Nenhum responsável atribuído"}
                      </p>
                      {canEditConfTecnica && !isOpsLimited && (
                        <p className="text-[10px] text-emerald-800/80 font-medium">
                          Use “Editar Controle” para atribuir até 2 colaboradores. Depois avance o card para Conf. Técnica (o sistema oferece WhatsApp pedindo datas) e, ao concluir, para Produção (aí entra na fábrica).
                        </p>
                      )}
                    </div>
                  )}

                  {project.observacoes && (
                    <div className="sm:col-span-3 bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-1 text-slate-600">
                      <span className="font-bold text-[9px] text-slate-500 uppercase tracking-wider block">Observações do Projeto:</span>
                      <p className="text-slate-700 font-medium whitespace-pre-wrap">{project.observacoes}</p>
                    </div>
                  )}

                  {partnerContributions &&
                    (partnerContributions.notes.length > 0 ||
                      partnerContributions.files.length > 0) && (
                    <div className="sm:col-span-3 bg-amber-50/50 border border-amber-100 rounded-xl p-3.5 space-y-3">
                      <span className="font-bold text-[9px] text-amber-800/80 uppercase tracking-wider block">
                        Contribuições do parceiro
                      </span>
                      {partnerContributions.notes.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" /> Notas
                          </p>
                          <ul className="space-y-2">
                            {partnerContributions.notes.map((note) => (
                              <li
                                key={note.id}
                                className="rounded-lg border border-amber-100/80 bg-white/70 px-3 py-2"
                              >
                                <p className="text-[10px] font-bold text-slate-500">
                                  {note.partnerNome} ·{" "}
                                  {new Date(note.createdAt).toLocaleDateString("pt-BR")}
                                </p>
                                <p className="text-xs text-slate-700 font-medium whitespace-pre-wrap mt-1">
                                  {note.body}
                                </p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {partnerContributions.files.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <Paperclip className="h-3 w-3" /> Arquivos
                          </p>
                          <ul className="space-y-1.5">
                            {partnerContributions.files.map((file) => (
                              <li key={file.id}>
                                <a
                                  href={file.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs font-bold text-primary hover:underline"
                                >
                                  {file.nome}
                                </a>
                                <span className="text-[10px] text-slate-400 ml-2">
                                  {file.partnerNome} ·{" "}
                                  {new Date(file.createdAt).toLocaleDateString("pt-BR")}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Responsável Geral</label>
                    <select
                      value={responsavelId}
                      onChange={(e) => setResponsavelId(e.target.value)}
                      className="w-full h-10 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs px-3 font-semibold cursor-pointer outline-none"
                    >
                      <option value="none">Nenhum</option>
                      {colaboradores.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.cargo})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Previsão de Entrega</label>
                    <Input
                      type="date"
                      value={dataEntrega}
                      onChange={(e) => setDataEntrega(e.target.value)}
                      className="bg-slate-50 border-slate-200 text-xs h-10 rounded-lg text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Parceiro Externo</label>
                    <select
                      value={partnerId}
                      onChange={(e) => setPartnerId(e.target.value)}
                      className="w-full h-10 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs px-3 font-semibold cursor-pointer outline-none"
                    >
                      <option value="none">Nenhum</option>
                      {partners.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nome} ({p.tipo})
                        </option>
                      ))}
                    </select>
                  </div>

                  {canEditConfTecnica && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Conf. Técnica — Responsável 1
                        </label>
                        <select
                          value={confResp1Id}
                          onChange={(e) => setConfResp1Id(e.target.value)}
                          className="w-full h-10 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs px-3 font-semibold cursor-pointer outline-none"
                        >
                          <option value="none">Selecionar…</option>
                          {colaboradores.map((c) => (
                            <option key={c.id} value={c.id} disabled={c.id === confResp2Id}>
                              {c.name} ({c.cargo})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Conf. Técnica — Responsável 2
                        </label>
                        <select
                          value={confResp2Id}
                          onChange={(e) => setConfResp2Id(e.target.value)}
                          className="w-full h-10 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs px-3 font-semibold cursor-pointer outline-none"
                        >
                          <option value="none">Opcional…</option>
                          {colaboradores.map((c) => (
                            <option key={c.id} value={c.id} disabled={c.id === confResp1Id}>
                              {c.name} ({c.cargo})
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Observações do Projeto</label>
                    <textarea
                      
                      value={observacoesProj}
                      onChange={(e) => setObservacoesProj(e.target.value)}
                      rows={3}
                      className="w-full p-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs font-semibold outline-none resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Painel Comercial Rápido */}
          <div className="p-5 rounded-xl border border-border bg-slate-50 flex flex-col justify-between h-full gap-4 shadow-sm">
            {!isOpsLimited && (
              <div>
                <span className="text-xs text-muted-foreground block">Valor Previsto do Projeto</span>
                {isBlocked ? (
                  <span className="text-rose-600 font-bold text-sm block leading-normal mt-0.5">🔒 Bloqueado (Sem Orçamento)</span>
                ) : (
                  <PrivacyMoney value={project.valor_previsto} className="text-2xl font-bold tracking-tight text-gradient-gold block mt-0.5" />
                )}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground block uppercase tracking-wider flex items-center gap-1.5">
                Status Operacional Geral
                {isBlocked && (
                  <span className="text-[9px] font-black text-rose-600 bg-rose-50 border border-rose-200 px-1 rounded uppercase">
                    Bloqueado
                  </span>
                )}
              </label>
              {isOpsLimited ? (
                <div className="rounded-lg border border-border bg-white px-3 py-2.5 text-sm font-semibold text-foreground">
                  {project.status_geral.replaceAll("_", " ")}
                </div>
              ) : (
                <Select
                  value={project.status_geral}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="w-full text-xs"
                  disabled={isBlocked}
                >
                  <option value="LEAD">Lead</option>
                  <option value="ORCAMENTO">Orçamento</option>
                  <option value="NEGOCIACAO">Negociação</option>
                  <option value="CONFERENCIA_TECNICA">Conferência Técnica</option>
                  <option value="APROVADO">Aprovado pelo Cliente</option>
                  <option value="PRODUCAO">Em Produção (Fábrica)</option>
                  <option value="INSTALACAO">Em Instalação</option>
                  <option value="FINALIZADO">Finalizado</option>
                </Select>
              )}
            </div>
          </div>
        </div>
      </div>

      <SlaRadar
        sla={sla}
        onVerify={isOpsLimited ? undefined : () => setSlaModalOpen(true)}
      />

      {!isOpsLimited && (
        <SlaVerificationModal
          projectId={project.id}
          stageKey={sla?.currentStage ?? "MEDICAO"}
          clientName={project.client.nome}
          isOpen={slaModalOpen && !!sla}
          onClose={() => setSlaModalOpen(false)}
          onSuccess={() => window.location.reload()}
        />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="min-w-0 max-w-full">
        {/* Mobile e tablet: dropdown — evita cortar as abas na largura do 10″ */}
        <div className={isTablet ? "relative" : "relative sm:hidden"}>
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="w-full appearance-none bg-white border border-border rounded-xl py-3 pl-4 pr-10 text-sm font-bold text-foreground shadow-sm outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
          >
            {!isOpsLimited && (
              <>
                <option value="quotes">Orçamentos ({project.quotes?.length || 0})</option>
                <option value="briefing">Formulário</option>
                <option value="timeline">Histórico ({filteredTimeline.length})</option>
              </>
            )}
            <option value="tasks">Tarefas ({project.tasks?.length || 0})</option>
            {!isOpsLimited && (
              <option value="finances">Financeiro ({project.installments?.length || 0})</option>
            )}
            <option value="environments">Ambientes ({project.environments.length})</option>
            <option value="files">Arquivos ({project.files.length})</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>

        <div className={isTablet ? "hidden" : "project-tabs-scroll hidden sm:block"}>
          <TabsList className="project-tabs-list !flex h-auto w-max min-w-full max-w-none flex-nowrap items-center justify-start gap-0.5 overflow-visible">
            {!isOpsLimited && (
              <>
                <TabsTrigger value="quotes" className="text-xs md:text-sm">
                  <DollarSign className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                  Orçamentos ({project.quotes?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="briefing" className="text-xs md:text-sm">
                  <FileText className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                  Formulário
                </TabsTrigger>
                <TabsTrigger value="timeline" className="text-xs md:text-sm">
                  <Clock className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                  Histórico ({filteredTimeline.length})
                </TabsTrigger>
              </>
            )}
            <TabsTrigger value="tasks" className="text-xs md:text-sm">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 shrink-0" />
              Tarefas ({project.tasks?.length || 0})
            </TabsTrigger>
            {!isOpsLimited && (
              <TabsTrigger value="finances" className="text-xs md:text-sm">
                <Receipt className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                Financeiro ({project.installments?.length || 0})
              </TabsTrigger>
            )}
            <TabsTrigger value="environments" className="text-xs md:text-sm">
              <Layers className="h-3.5 w-3.5 mr-1.5 shrink-0" />
              Ambientes ({project.environments.length})
            </TabsTrigger>
            <TabsTrigger value="files" className="text-xs md:text-sm">
              <FileText className="h-3.5 w-3.5 mr-1.5 shrink-0" />
              Arquivos ({project.files.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Ambientes */}
        <TabsContent value="environments" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-lg font-bold">Módulos de Ambientes / Cômodos</h3>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Cômodos com borda verde já têm projeto da fábrica ou do arquiteto. Toque no card
                para abrir fotos, medições, renders e arquivos técnicos.
                {canManageEnvGallery
                  ? " Você também pode enviar novos arquivos por lá."
                  : " Visualização disponível para a fábrica."}
              </p>
              {project.environments.length > 0 ? (
                <p className="text-[11px] font-semibold text-foreground/80 mt-2">
                  {environmentStats.withFiles} com arquivos
                  {environmentStats.withFactory > 0
                    ? ` · ${environmentStats.withFactory} com plano de corte`
                    : ""}
                  {environmentStats.withArch > 0
                    ? ` · ${environmentStats.withArch} com projeto do arquiteto`
                    : ""}
                </p>
              ) : null}
            </div>
            {!isOpsLimited && (
              <Button onClick={() => setIsAddEnvOpen(true)} size="sm" className="btn-metallic w-full sm:w-auto shrink-0">
                <Plus className="h-4 w-4 mr-1.5" /> Novo Cômodo
              </Button>
            )}
          </div>

          {project.environments.length > 0 ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { id: "all" as const, label: "Todos", count: project.environments.length },
                    {
                      id: "with_files" as const,
                      label: "Com arquivos",
                      count: environmentStats.withFiles,
                    },
                    {
                      id: "production_ready" as const,
                      label: "Prontos p/ produção",
                      count: environmentStats.productionReady,
                    },
                    { id: "empty" as const, label: "Sem arquivos", count: environmentStats.empty },
                  ] as const
                ).map((filter) => {
                  const active = environmentFilter === filter.id;
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setEnvironmentFilter(filter.id)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                        active
                          ? "bg-primary text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {filter.label}
                      <span
                        className={`ml-1 tabular-nums ${active ? "opacity-90" : "opacity-60"}`}
                      >
                        ({filter.count})
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <div
                  className="inline-flex rounded-lg border border-border bg-slate-50 p-0.5"
                  role="group"
                  aria-label="Modo de visualização dos cômodos"
                >
                  <button
                    type="button"
                    onClick={() => setEnvironmentViewMode("grid")}
                    className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[11px] font-bold cursor-pointer ${
                      environmentViewMode === "grid"
                        ? "bg-white text-foreground shadow-xs"
                        : "text-muted-foreground"
                    }`}
                    aria-pressed={environmentViewMode === "grid"}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Grade</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEnvironmentViewMode("list")}
                    className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[11px] font-bold cursor-pointer ${
                      environmentViewMode === "list"
                        ? "bg-white text-foreground shadow-xs"
                        : "text-muted-foreground"
                    }`}
                    aria-pressed={environmentViewMode === "list"}
                  >
                    <List className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Lista</span>
                  </button>
                </div>
                {environmentViewMode === "grid" && !isTablet ? (
                  <div
                    className="inline-flex rounded-lg border border-border bg-slate-50 p-0.5"
                    role="group"
                    aria-label="Cômodos por linha no desktop"
                  >
                    {([4, 5, 6] as EnvironmentGridCols[]).map((cols) => (
                      <button
                        key={cols}
                        type="button"
                        title={`${cols} por linha no desktop`}
                        onClick={() => setEnvironmentGridCols(cols)}
                        className={`h-8 min-w-8 px-2 rounded-md text-[11px] font-bold tabular-nums cursor-pointer ${
                          environmentGridCols === cols
                            ? "bg-white text-foreground shadow-xs"
                            : "text-muted-foreground"
                        }`}
                        aria-pressed={environmentGridCols === cols}
                      >
                        {cols}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {project.environments.length === 0 ? (
            <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground space-y-2">
              <p>
                Nenhum ambiente neste projeto.
                {!isOpsLimited
                  ? ' Use "Novo Cômodo" ou aprove itens no orçamento — cada item aprovado vira um ambiente aqui.'
                  : " Quando o comercial aprovar o orçamento, os cômodos aparecem automaticamente."}
              </p>
              {(project.status_geral === "APROVADO" ||
                project.status_geral === "PRODUCAO" ||
                project.status_geral === "CONFERENCIA_TECNICA") && (
                <p className="text-xs">
                  Quando listados, os cards mostram miniatura e quais tipos de arquivo já foram
                  enviados (projeto, medição, render, etc.).
                </p>
              )}
            </div>
          ) : filteredEnvironments.length === 0 ? (
            <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
              Nenhum cômodo neste filtro. Tente outra opção ou volte em{" "}
              <button
                type="button"
                onClick={() => setEnvironmentFilter("all")}
                className="font-bold text-primary hover:underline cursor-pointer"
              >
                Todos
              </button>
              .
            </div>
          ) : environmentViewMode === "grid" ? (
            <div
              className={`grid gap-3 sm:gap-4 ${ENVIRONMENT_GRID_COL_CLASS[environmentGridCols]}`}
            >
              {filteredEnvironments.map((env) => {
                const currentStatusInfo = ENVIRONMENT_STATUSES.find((s) => s.value === env.status);
                return (
                  <EnvironmentProjectCard
                    key={env.id}
                    environment={env}
                    compact={environmentGridCols >= 5}
                    statusLabel={currentStatusInfo?.label ?? env.status}
                    statusClassName={
                      currentStatusInfo?.bg ?? "bg-slate-500/10 text-slate-600 border-slate-200"
                    }
                    onOpen={() =>
                      setGalleryEnvironment({
                        id: env.id,
                        nome: env.nome,
                        tipo: env.tipo,
                      })
                    }
                  />
                );
              })}
            </div>
          ) : (
            <Card className="overflow-hidden border border-border bg-white divide-y divide-border shadow-sm">
              {filteredEnvironments.map((env) => {
                const currentStatusInfo = ENVIRONMENT_STATUSES.find((s) => s.value === env.status);
                return (
                  <EnvironmentProjectListRow
                    key={env.id}
                    environment={env}
                    statusLabel={currentStatusInfo?.label ?? env.status}
                    statusClassName={
                      currentStatusInfo?.bg ?? "bg-slate-500/10 text-slate-600 border-slate-200"
                    }
                    onOpen={() =>
                      setGalleryEnvironment({
                        id: env.id,
                        nome: env.nome,
                        tipo: env.tipo,
                      })
                    }
                  />
                );
              })}
            </Card>
          )}
        </TabsContent>

        {/* Tab 2: Arquivos Técnicos */}
        <TabsContent value="files" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold leading-snug">Gerenciador de Arquivos & Renders</h3>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Faça upload de projetos em DWG, SketchUp, PDFs de medição e renders em alta definição.
              </p>
            </div>
            {canManageProjectFiles && (
              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0">
                {!isOpsLimited && (
                <Button
                  onClick={() => handlePromobImportClick()}
                  size="sm"
                  variant="outline"
                  className="border-border text-primary hover:bg-secondary/20 font-semibold cursor-pointer w-full sm:w-auto justify-center"
                  title="Funcionalidade em desenvolvimento"
                >
                  <Box className="h-4 w-4 mr-1.5 text-amber-400 shrink-0" />
                  <span className="truncate">Importar Promob (em breve)</span>
                </Button>
                )}
                <Button
                  onClick={() => setIsUploadOpen(true)}
                  size="sm"
                  className="btn-metallic w-full sm:w-auto justify-center"
                >
                  <Upload className="h-4 w-4 mr-1.5 shrink-0" />
                  Upload de Arquivo
                </Button>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border/40 bg-card/35 backdrop-blur-xs overflow-hidden">
            {project.files.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Nenhum arquivo ou projeto técnico enviado.
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {project.files.map((file) => (
                  <div key={file.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-100 transition-colors">
                    <div className="flex items-start">
                      <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 mr-3 text-primary">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-foreground leading-none">{file.nome_arquivo}</h4>
                        <div className="flex items-center mt-2 gap-3 text-xs text-muted-foreground">
                          <span className="bg-secondary px-1.5 py-0.5 rounded text-[10px] font-semibold text-muted-foreground uppercase">
                            {FILE_TYPES.find(t => t.value === file.tipo)?.label || file.tipo}
                          </span>
                          <span className="font-medium">Versão {file.versao}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      {!isOpsLimited && (
                        <button
                          onClick={() => handleToggleFileApproval(file.id, file.aprovado_producao)}
                          className={`flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                            file.aprovado_producao
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                              : "bg-secondary text-muted-foreground border-border/60 hover:text-foreground hover:bg-accent/40"
                          }`}
                        >
                          {file.aprovado_producao ? (
                            <>
                              <ShieldCheck className="h-4 w-4 mr-1.5 text-emerald-400" /> Aprovado Fábrica
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-4 w-4 mr-1.5" /> Liberar p/ Fábrica
                            </>
                          )}
                        </button>
                      )}

                      {!isOpsLimited && file.tipo === "RENDER" && (
                        <button
                          onClick={() => handleSimulateRenderPro(file.id)}
                          className="flex items-center text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all cursor-pointer"
                          title="Melhorar com IA"
                        >
                          <Wand2 className="h-3.5 w-3.5 mr-1" />
                          {isRenderingPro ? "Processando..." : "Render Pro (IA)"}
                        </button>
                      )}

                      <a
                        href={file.url}
                        className="inline-flex items-center justify-center p-2 rounded-lg border border-border/60 bg-transparent text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
                        title="Baixar Arquivo"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab 3: Timeline & Notas */}
        <TabsContent value="timeline" className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold">Timeline & Histórico Operacional</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Notas internas da equipe, medições e registros de alteração.
              </p>
            </div>
            
            {/* Filtros da Timeline */}
            <div className="inline-flex rounded-lg border border-border/40 p-0.5 bg-secondary text-xs">
              <button 
                onClick={() => setTimelineFilter("ALL")}
                className={`px-2.5 py-1 rounded ${timelineFilter === "ALL" ? "bg-card text-foreground font-semibold" : "text-muted-foreground"}`}
              >
                Todas as Notas
              </button>
              <button 
                onClick={() => setTimelineFilter("PUBLIC")}
                className={`px-2.5 py-1 rounded ${timelineFilter === "PUBLIC" ? "bg-card text-foreground font-semibold" : "text-muted-foreground"}`}
              >
                Públicas
              </button>
              <button 
                onClick={() => setTimelineFilter("PRIVATE")}
                className={`px-2.5 py-1 rounded ${timelineFilter === "PRIVATE" ? "bg-card text-foreground font-semibold" : "text-muted-foreground"}`}
              >
                Internas
              </button>
            </div>
          </div>

          {/* Form para adicionar Notas */}
          <form onSubmit={handleSendTimeline} className="p-4 rounded-xl border border-border/40 bg-card/35 backdrop-blur-xs flex gap-3 items-end">
            <div className="flex-1 space-y-2">
              <Input
                required
                
                value={timelineInput}
                onChange={(e) => setTimelineInput(e.target.value)}
                className="bg-black/10 border-border/40"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsTimelinePrivate(!isTimelinePrivate)}
                  className={`inline-flex items-center text-[10px] font-bold px-2 py-1 rounded border transition-colors ${
                    isTimelinePrivate 
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  }`}
                >
                  {isTimelinePrivate ? (
                    <>
                      <Lock className="h-3 w-3 mr-1" /> Nota Interna (Fábrica/Vendedor)
                    </>
                  ) : (
                    <>
                      <Eye className="h-3 w-3 mr-1" /> Visível p/ Cliente
                    </>
                  )}
                </button>
              </div>
            </div>
            <Button type="submit" size="icon" className="h-9 w-9">
              <Send className="h-4 w-4" />
            </Button>
          </form>

          {/* Lista de Eventos */}
          <div className="relative border-l border-border/40 ml-4 pl-6 space-y-6 py-2">
            {filteredTimeline.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhuma nota correspondente encontrada.</div>
            ) : (
              filteredTimeline.map((event) => (
                <div key={event.id} className="relative group">
                  {/* Marcador na Linha */}
                  <span className="absolute -left-10 top-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-card border border-border/60 text-muted-foreground ring-8 ring-background">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  </span>
                  
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-foreground">{event.user.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(event.data).toLocaleString("pt-BR")}
                      </span>
                      {event.interno_sotamente && (
                        <span className="text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1 py-0.2 rounded inline-flex items-center">
                          <Lock className="h-2.5 w-2.5 mr-0.5" /> Interna
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground pr-4">
                      {sensitive.text(event.acao)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* Tab: Orçamentos */}
        <TabsContent value="quotes" className="space-y-4">
          {isCreatingQuote ? (
            <QuoteBuilder
              projectId={project.id}
              companyId={companyId}
              editingQuote={editingQuote}
              onCancel={closeQuoteBuilder}
              onSuccess={async () => {
                await refreshProjectFromServer();
                closeQuoteBuilder();
              }}
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">Propostas & Orçamentos Comerciais</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Gere orçamentos e envie propostas em PDF com itens e valores.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setEditingQuote(null);
                    setIsCreatingQuote(true);
                  }}
                  size="sm"
                  className="btn-metallic"
                >
                  <Plus className="h-4 w-4 mr-1.5" /> Nova Proposta
                </Button>
              </div>

              <div className="rounded-xl border border-border/40 bg-card/35 backdrop-blur-xs overflow-hidden">
                {project.quotes.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    Nenhum orçamento gerado para este projeto. Clique em "Nova Proposta" para começar.
                  </div>
                ) : (
                  <div className="divide-y divide-border/30">
                    {project.quotes.map((q) => {
                      const summary = summarizeQuoteItems(
                        (q.items || []).map((i) => ({
                          id: i.id,
                          valor_total: Number(i.valor_total),
                          status: i.status,
                        }))
                      );
                      const isFullyApproved = summary.isFullyApproved;
                      const isPartial = summary.isPartiallyApproved;
                      const hasPending = summary.hasPending;
                      const statusLabel = quoteCommercialLabel(summary);
                      const commerciallyExpired = isQuoteCommerciallyExpired(
                        toISODateBR(q.validade) < toISODateBR(),
                        summary
                      );
                      const isApproving = approvingQuoteId === q.id;
                      const viewStats = toQuoteViewStats(q);
                      const viewLabel = formatQuoteViewLabel(viewStats);

                      return (
                      <div
                        key={q.id}
                        className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                          isFullyApproved
                            ? "border-2 border-emerald-500 bg-emerald-50/60 shadow-sm shadow-emerald-500/10"
                            : isPartial
                              ? "border-2 border-amber-400 bg-amber-50/50"
                              : commerciallyExpired
                                ? "border-2 border-rose-400 bg-rose-50/60"
                                : "hover:bg-slate-100"
                        }`}
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h4 className="font-bold text-base text-foreground leading-none">
                              {formatQuoteCodigo(q)}
                              <span className="text-muted-foreground font-semibold text-sm ml-2">
                                · Proposta v{q.versao}
                              </span>
                            </h4>
                            {isFullyApproved ? (
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                                Aprovada
                              </span>
                            ) : isPartial ? (
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500 text-white">
                                {statusLabel}
                              </span>
                            ) : commerciallyExpired ? (
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-rose-600 text-white">
                                Vencido
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded font-semibold">
                                Validade: {formatDateBR(q.validade)}
                              </span>
                            )}
                            {viewLabel ? (
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  viewStats.neverOpened
                                    ? "bg-amber-50 text-amber-800 border-amber-200"
                                    : "bg-sky-50 text-sky-800 border-sky-200"
                                }`}
                                title={
                                  [
                                    viewStats.firstViewedAt
                                      ? `Primeira abertura: ${new Date(viewStats.firstViewedAt).toLocaleString("pt-BR")}`
                                      : null,
                                    viewStats.lastViewedAt
                                      ? `Última: ${new Date(viewStats.lastViewedAt).toLocaleString("pt-BR")}`
                                      : null,
                                    viewStats.lastDeviceLabel
                                      ? `Dispositivo: ${viewStats.lastDeviceLabel}`
                                      : null,
                                    viewStats.sharedAt && !viewStats.firstViewedAt
                                      ? `Link gerado em ${new Date(viewStats.sharedAt).toLocaleString("pt-BR")}`
                                      : null,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ") || undefined
                                }
                              >
                                <Eye className="h-3 w-3" />
                                {viewLabel}
                              </span>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-muted-foreground">
                            {q.desconto > 0 ? (
                              <span>
                                Subtotal:{" "}
                                <PrivacyMoney value={q.subtotal} as="strong" className="text-foreground" />
                              </span>
                            ) : null}
                            {q.desconto > 0 && (
                              <span className="text-amber-500 font-medium inline-flex items-center gap-1">
                                Desconto: -<PrivacyMoney value={q.desconto} />
                              </span>
                            )}
                            <span>
                              Valor:{" "}
                              <PrivacyMoney value={q.valor_final} as="strong" className="text-primary font-bold" />
                            </span>
                          </div>
                          {(summary.hasApproved || summary.hasPending) && (
                            <p className="text-xs text-muted-foreground">
                              {summary.hasApproved && (
                                <span className="text-emerald-700 font-semibold mr-3 inline-flex items-center gap-1">
                                  Aprovado: <PrivacyMoney value={summary.approvedTotal} /> ({summary.approvedCount})
                                </span>
                              )}
                              {summary.hasPending && (
                                <span className="text-amber-700 font-semibold inline-flex items-center gap-1">
                                  Pendente: <PrivacyMoney value={summary.pendingTotal} /> ({summary.pendingCount})
                                </span>
                              )}
                            </p>
                          )}
                          {q.observacoes && (
                            <p className="text-xs text-muted-foreground/80 line-clamp-1 italic">
                              "{q.observacoes}"
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                          {isFullyApproved ? (
                            <span className="inline-flex items-center text-xs font-bold px-3 py-1.5 rounded-lg border-2 border-emerald-600 bg-emerald-600 text-white cursor-default select-none shadow-sm">
                              <CheckCircle2 className="h-4 w-4 mr-1.5" /> Aprovado
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleApproveQuote(q)}
                              disabled={!!approvingQuoteId}
                              className="inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <CheckCircle2 className={`h-4 w-4 mr-1.5 ${isApproving ? "animate-pulse" : ""}`} />
                              {isPartial ? "Registrar aprovação" : "Aprovar Proposta"}
                            </button>
                          )}
                          {hasPending && (
                            <button
                              type="button"
                              onClick={() => void openEditQuote(q.id)}
                              disabled={loadingEditQuote}
                              className="inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-800 hover:bg-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                            >
                              Editar proposta
                            </button>
                          )}

                          <Link
                            href={`/quotes/${q.id}/print`}
                            target="_blank"
                            className="inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg border border-border/60 bg-transparent text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-all cursor-pointer"
                          >
                            <FileText className="h-4 w-4 mr-1.5" /> Gerar PDF
                          </Link>

                          {(!summary.hasApproved || isAdmin) && (
                            <button
                              onClick={() => handleDeleteProjectQuote(q)}
                              className="p-2 rounded-lg hover:bg-destructive/10 text-destructive/70 hover:text-destructive transition-colors cursor-pointer"
                              title={summary.hasApproved ? "Excluir orçamento aprovado (admin)" : "Excluir Orçamento"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tab: Formulário de Qualificação */}
        <TabsContent value="briefing" className="space-y-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold">Respostas do Formulário de Qualificação</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Consulte as respostas fornecidas pelo cliente no briefing e acesse o PDF de abordagem do lead.
              </p>
            </div>

            {project.briefing ? (
              <div className="p-5 rounded-xl border border-border/50 bg-card/35 backdrop-blur-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">Formulário de Qualificação de Lead</span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                      project.briefing.score && project.briefing.score >= 80 
                        ? "bg-rose-50 text-rose-600 border border-rose-200" 
                        : project.briefing.score && project.briefing.score < 50 
                        ? "bg-slate-50 text-slate-600 border border-slate-200" 
                        : "bg-amber-50 text-amber-600 border border-amber-200"
                    }`}>
                      Lead {project.briefing.score && project.briefing.score >= 80 ? "Quente" : project.briefing.score && project.briefing.score < 50 ? "Frio" : "Morno"} ({project.briefing.score || 0} pts)
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enviado em {new Date(project.briefing.createdAt).toLocaleDateString("pt-BR")} às {new Date(project.briefing.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div>
                  <a
                    href={`/briefing/${project.id}/print`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center text-xs font-semibold px-4.5 py-2.5 rounded-lg border border-border/60 bg-white hover:bg-slate-50 text-foreground shadow-xs transition-all cursor-pointer"
                  >
                    <FileText className="h-4 w-4 mr-2 text-primary" /> Visualizar PDF do Briefing
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground border border-dashed border-border/60 rounded-xl bg-card/20">
                Este cliente foi cadastrado de forma manual e não possui formulário de qualificação enviado.
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab: Financeiro do Projeto */}
        <TabsContent value="finances" className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold">Fluxo Financeiro do Projeto</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Controle o recebimento de entradas, parcelas e saldo devedor do contrato.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  setReceiptPrefill({
                    projectId: project.id,
                    referente: "Pagamento referente a móveis sob medida",
                    quitacao: "PARCIAL",
                  });
                  setReceiptOpen(true);
                }}
              >
                <Receipt className="h-4 w-4" /> Recibo avulso
              </Button>
              <Button onClick={() => setIsAddInstallmentOpen(true)} size="sm" className="btn-metallic">
                <Plus className="h-4 w-4 mr-1.5" /> Lançar Parcela
              </Button>
            </div>
          </div>

          {/* Indicadores Financeiros Rápidos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 bg-card/25 border-border/40">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Valor do Contrato</span>
              <PrivacyMoney value={project.valor_previsto} as="strong" className="text-lg text-foreground font-extrabold" />
            </Card>
            <Card className="p-4 bg-card/25 border-border/40">
              <span className="text-[10px] text-emerald-500/80 font-bold uppercase tracking-wider block">Valor Recebido</span>
              <PrivacyMoney
                as="strong"
                className="text-lg text-emerald-400 font-extrabold"
                value={project.installments
                  .filter((ins) => ins.status === "PAGO")
                  .reduce((acc, curr) => acc + curr.valor, 0)}
              />
            </Card>
            <Card className="p-4 bg-card/25 border-border/40">
              <span className="text-[10px] text-amber-500/80 font-bold uppercase tracking-wider block">Saldo Pendente</span>
              <PrivacyMoney
                as="strong"
                className="text-lg text-amber-400 font-extrabold"
                value={
                  project.valor_previsto -
                  project.installments
                    .filter((ins) => ins.status === "PAGO")
                    .reduce((acc, curr) => acc + curr.valor, 0)
                }
              />
            </Card>
          </div>

          {project.installments.length > 0 &&
            project.installments.every((ins) => ins.status === "PAGO") &&
            !sla?.notaFiscalEmitida && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-amber-900">Emitir nota fiscal</p>
                  <p className="text-xs text-amber-800/80 mt-0.5">
                    O pagamento integral deste projeto foi confirmado. Registre quando a NF for emitida.
                  </p>
                </div>
                <Button
                  size="sm"
                  className="shrink-0"
                  onClick={async () => {
                    const result = await markNotaFiscalEmitida(project.id);
                    if (result.success) {
                      setSla((prev) => (prev ? { ...prev, notaFiscalEmitida: true } : prev));
                      showSuccess("NF registrada", "Emissão da nota fiscal registrada no histórico.");
                    }
                  }}
                >
                  Marcar NF como emitida
                </Button>
              </div>
            )}

          <div className="rounded-xl border border-border/40 bg-card/35 backdrop-blur-xs overflow-hidden">
            {project.installments.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Nenhuma parcela cadastrada para este projeto. Clique em "Lançar Parcela" para iniciar o fluxo financeiro.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/30 text-muted-foreground text-xs uppercase font-bold bg-black/10">
                      <th className="p-4">Tipo</th>
                      <th className="p-4">Pagamento</th>
                      <th className="p-4 text-right">Valor</th>
                      <th className="p-4 text-center">Vencimento</th>
                      <th className="p-4 text-center">Pagamento</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20 text-neutral-300">
                    {project.installments.map((ins) => {
                      const isPaid = ins.status === "PAGO";
                      return (
                        <tr key={ins.id} className="hover:bg-slate-100 transition-colors">
                          <td className="p-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              ins.tipo === "ENTRADA" 
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                                : "bg-secondary text-muted-foreground"
                            }`}>
                              {ins.numero_parcela && ins.total_parcelas
                                ? `${ins.tipo} ${ins.numero_parcela}/${ins.total_parcelas}`
                                : ins.tipo}
                            </span>
                          </td>
                          <td className="p-4 text-xs text-muted-foreground">
                            {ins.metodo_pagamento
                              ? labelPaymentMethod(ins.metodo_pagamento)
                              : "—"}
                          </td>
                          <td className="p-4 text-right font-black text-foreground">
                            <PrivacyMoney value={ins.valor} />
                          </td>
                          <td className="p-4 text-center font-medium">
                            {new Date(ins.data_vencimento).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="p-4 text-center text-xs text-muted-foreground">
                            {ins.data_pagamento 
                              ? new Date(ins.data_pagamento).toLocaleDateString("pt-BR") 
                              : "—"
                            }
                          </td>
                          <td className="p-4 text-center">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded inline-flex items-center gap-1 ${
                              isPaid 
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" 
                                : ins.status === "ATRASADO"
                                  ? "bg-destructive/15 text-destructive/80 border border-destructive/20" 
                                  : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${
                                isPaid ? "bg-emerald-400" : ins.status === "ATRASADO" ? "bg-destructive" : "bg-amber-400"
                              }`} />
                              {ins.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex flex-col items-end gap-1.5">
                              {!isPaid ? (
                                <Button 
                                  onClick={() => handlePayInstallment(ins.id)} 
                                  size="sm" 
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] py-1 h-7 font-bold"
                                >
                                  Quitar
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="text-[10px] py-1 h-7 font-bold gap-1"
                                  onClick={() => {
                                    setReceiptPrefill({
                                      installmentId: ins.id,
                                      projectId: project.id,
                                      valor: ins.valor,
                                      metodo: ins.metodo_pagamento || "PIX",
                                      dataRecebimento: ins.data_pagamento
                                        ? toISODateBR(ins.data_pagamento)
                                        : toISODateBR(),
                                      tipo: ins.tipo,
                                      numero_parcela: ins.numero_parcela,
                                      total_parcelas: ins.total_parcelas,
                                      quitacao: "PARCIAL",
                                    });
                                    setReceiptOpen(true);
                                  }}
                                >
                                  <Receipt className="h-3 w-3" />
                                  Recibo
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab: Tarefas & Agenda do Projeto */}
        <TabsContent value="tasks" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Tarefas & Compromissos Operacionais</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Organize e agende medições técnicas, vistorias e etapas de montagem para este projeto.
              </p>
            </div>
            {!isOpsLimited && (
              <Button onClick={() => setIsAddTaskOpen(true)} size="sm" className="btn-metallic">
                <Plus className="h-4 w-4 mr-1.5" /> Agendar
              </Button>
            )}
          </div>

          <div className="rounded-xl border border-border/40 bg-card/35 backdrop-blur-xs overflow-hidden">
            {project.tasks.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Nenhum compromisso técnico agendado. Clique em "Agendar" para registrar uma atividade.
              </div>
            ) : (
              <div className="divide-y divide-border/20">
                {project.tasks.map((t) => {
                  const isCompleted = t.status === "CONCLUIDA";
                  
                  // Mapeia estilos do tipo
                  const typeStyles: Record<string, string> = {
                    VISITA_COMERCIAL: "bg-amber-500/10 text-amber-400 border-amber-500/20",
                    MEDICAO_TECNICA: "bg-blue-500/10 text-blue-400 border-blue-500/20",
                    ENTREGA_MOVEIS: "bg-purple-500/10 text-purple-400 border-purple-500/20",
                    INSTALACAO: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                    OUTROS: "bg-slate-500/10 text-slate-400 border-slate-500/20"
                  };
                  
                  return (
                    <div key={t.id} className={`p-4 flex items-center justify-between gap-4 hover:bg-slate-100 transition-colors ${
                      isCompleted ? "opacity-50" : ""
                    }`}>
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Checkbox customizado */}
                        <input
                          type="checkbox"
                          checked={isCompleted}
                          onChange={(e) => handleToggleTask(t.id, e.target.checked)}
                          disabled={isOpsLimited}
                          className="h-4.5 w-4.5 rounded border-border bg-slate-100 text-primary focus:ring-primary/40 focus:ring-1 disabled:cursor-default cursor-pointer mt-0.5"
                        />
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h4 className={`font-bold text-sm text-foreground leading-none ${
                              isCompleted ? "line-through" : ""
                            }`}>
                              {t.titulo}
                            </h4>
                            <span className={`text-[9px] font-bold px-2 py-0.2 rounded border uppercase tracking-wider ${
                              typeStyles[t.tipo] || typeStyles.OUTROS
                            }`}>
                              {t.tipo.replace("_", " ")}
                            </span>
                          </div>
                          {t.descricao && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{t.descricao}</p>
                          )}
                          <p className="text-[10px] text-muted-foreground flex items-center gap-2">
                            <span>📅 {new Date(t.data).toLocaleDateString("pt-BR")} às {new Date(t.data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })}</span>
                            <span>•</span>
                            <span>👤 Responsável: <strong>{t.responsavel}</strong></span>
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal - Novo Cômodo */}
      <Dialog isOpen={isAddEnvOpen} onClose={() => setIsAddEnvOpen(false)}>
        <h3 className="text-lg font-bold tracking-tight text-gradient-gold mb-4">
          Adicionar Novo Cômodo / Ambiente
        </h3>
        <form onSubmit={handleAddEnvSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Nome do Cômodo
            </label>
            <Input
              required
              
              value={newEnvForm.nome}
              onChange={(e) => setNewEnvForm({ ...newEnvForm, nome: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Tipo do Cômodo
            </label>
            <Select
              value={newEnvForm.tipo}
              onChange={(e) => setNewEnvForm({ ...newEnvForm, tipo: e.target.value as EnvironmentType })}
            >
              <option value="COZINHA">Cozinha</option>
              <option value="CLOSET">Closet</option>
              <option value="DORMITORIO">Dormitório</option>
              <option value="BANHEIRO">Banheiro</option>
              <option value="OUTROS">Outros</option>
            </Select>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-3 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddEnvOpen(false)}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="font-semibold btn-metallic w-full sm:w-auto">
              {loading ? "Adicionando..." : "Adicionar Cômodo"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal - Upload de Arquivo */}
      <Dialog isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)}>
        <h3 className="text-lg font-bold tracking-tight text-gradient-gold mb-4">
          Upload de Arquivo Técnico / Render
        </h3>
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Nome Descritivo do Arquivo
            </label>
            <Input
              required
              
              value={uploadForm.nome_arquivo}
              onChange={(e) => setUploadForm({ ...uploadForm, nome_arquivo: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Categoria do Arquivo
            </label>
            <Select
              value={uploadForm.tipo}
              onChange={(e) => setUploadForm({ ...uploadForm, tipo: e.target.value as FileType })}
            >
              {FILE_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-3 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsUploadOpen(false)}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="font-semibold btn-metallic w-full sm:w-auto">
              {loading ? "Enviando..." : "Salvar Arquivo"}
            </Button>
          </div>
        </form>
      </Dialog>

      <InstallmentLaunchDialog
        open={isAddInstallmentOpen}
        onClose={() => setIsAddInstallmentOpen(false)}
        projects={[
          {
            id: project.id,
            status_geral: project.status_geral,
            valor_previsto: project.valor_previsto,
          },
        ]}
        onSuccess={refreshInstallmentsFromServer}
      />

      <ReceiptIssueDialog
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        clientId={project.client.id}
        clientName={project.client.nome}
        projects={[
          {
            id: project.id,
            label: project.status_geral,
          },
        ]}
        prefill={receiptPrefill}
      />

      {/* Modal - Novo Agendamento / Tarefa */}
      <Dialog isOpen={isAddTaskOpen} onClose={() => setIsAddTaskOpen(false)}>
        <h3 className="text-lg font-bold tracking-tight text-gradient-gold mb-4">
          Agendar Compromisso Técnico / Tarefa
        </h3>
        <form onSubmit={handleAddTaskSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Título do Compromisso
            </label>
            <Input
              required
              
              value={newTaskForm.titulo}
              onChange={(e) => setNewTaskForm({ ...newTaskForm, titulo: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Descrição Detalhada
            </label>
            <textarea
              className="w-full bg-card/60 border border-border/60 hover:border-border rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary placeholder-muted-foreground transition-all duration-200 resize-none h-16"
              
              value={newTaskForm.descricao}
              onChange={(e) => setNewTaskForm({ ...newTaskForm, descricao: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Data do Compromisso
              </label>
              <Input
                required
                type="date"
                value={newTaskForm.data}
                onChange={(e) => setNewTaskForm({ ...newTaskForm, data: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Horário
              </label>
              <Input
                required
                type="time"
                value={newTaskForm.hora}
                onChange={(e) => setNewTaskForm({ ...newTaskForm, hora: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Responsável Técnico
              </label>
              <Input
                required
                
                value={newTaskForm.responsavel}
                onChange={(e) => setNewTaskForm({ ...newTaskForm, responsavel: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Tipo do Evento
              </label>
              <Select
                value={newTaskForm.tipo}
                onChange={(e) => setNewTaskForm({ ...newTaskForm, tipo: e.target.value as any })}
              >
                <option value="MEDICAO_TECNICA">Medição Técnica</option>
                <option value="ENTREGA_MOVEIS">Entrega de Móveis</option>
                <option value="INSTALACAO">Instalação / Montagem</option>
                <option value="VISITA_COMERCIAL">Visita Comercial</option>
                <option value="OUTROS">Outros</option>
              </Select>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-3 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddTaskOpen(false)}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="font-semibold btn-metallic w-full sm:w-auto">
              {loading ? "Agendando..." : "Confirmar Agendamento"}
            </Button>
          </div>
        </form>
      </Dialog>
      <QuoteApprovalDialog
        open={!!approvalQuote}
        onClose={() => setApprovalQuote(null)}
        quote={
          approvalQuote
            ? {
                id: approvalQuote.id,
                project_id: project.id,
                versao: approvalQuote.versao,
                subtotal: approvalQuote.subtotal,
                desconto: approvalQuote.desconto,
                clientName: project.client.nome,
                template_tipo: approvalQuote.template_tipo,
                items: approvalQuote.items || [],
              }
            : null
        }
        onRequestEdit={
          approvalQuote
            ? () => {
                void openEditQuote(approvalQuote.id);
              }
            : undefined
        }
        onApproved={async ({ remainingPending, valorAprovado }) => {
          showSuccess(
            remainingPending > 0 ? "Aprovação parcial registrada" : "Proposta aprovada",
            remainingPending > 0
              ? `R$ ${valorAprovado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} aprovados. Ainda restam itens pendentes.`
              : `Versão ${approvalQuote?.versao ?? ""} aprovada com sucesso.`
          );
          await refreshProjectFromServer();
        }}
      />
      <ActionDialogHost dialog={dialog} />
      <EnvironmentGalleryModal
        environment={galleryEnvironment}
        canManage={canManageEnvGallery}
        onClose={() => {
          setGalleryEnvironment(null);
          void syncProject();
        }}
      />
      <ConfTecnicaWhatsAppDialog
        target={confTecnicaWhatsApp}
        onClose={() => setConfTecnicaWhatsApp(null)}
      />
    </div>
  );
}
