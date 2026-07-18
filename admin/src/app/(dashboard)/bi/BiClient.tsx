"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import { getBiLiveSnapshot } from "@/app/actions/liveSnapshots";
import { useLiveEntity } from "@/context/LiveSyncContext";
import { toISODateBR } from "@/lib/brazilDate";
import { Pagination } from "@/components/ui/pagination";
import { usePrivacy } from "@/context/PrivacyContext";
import {
  TrendingUp,
  DollarSign,
  Award,
  PieChart,
  Users,
  MapPin,
  FolderKanban,
  Calculator,
  Clock,
  ClipboardList,
  UserCheck,
  Handshake,
  XCircle,
  FileText,
  Search,
  Download,
  Printer,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  Target,
  Percent,
  LayoutGrid,
  Table,
  User,
  Palette,
  Ruler,
  Wrench,
  Layers,
  Package,
  Truck,
  ClipboardCheck,
} from "lucide-react";

interface Project {
  id: string;
  valor_previsto: number;
  status_geral: string;
  partner_id: string | null;
  partner: {
    id: string;
    nome: string;
    cidade: string | null;
    tipo: string;
    fotoUrl: string | null;
  } | null;
  client: {
    id: string;
    nome: string;
    cidade: string;
    origem: string;
    telefone: string;
    email: string;
  };
}

export interface BiQuoteSummary {
  id: string;
  valor_final: number;
  validade: string;
  aprovado_em: string | null;
}

interface FactoryEnvironment {
  id: string;
  nome: string;
  tipo: string;
  status: string;
  projectId: string;
  clientId: string;
  clientName: string;
  responsavelId: string | null;
  responsavelNome: string | null;
  ajudanteId: string | null;
  ajudanteNome: string | null;
  techSheetFilled: number;
  techSheetTotal: number;
  techSheetComplete: boolean;
}

interface BiClientProps {
  initialProjects: Project[];
  initialQuotes: BiQuoteSummary[];
  initialEnvironments: FactoryEnvironment[];
  companyId: string;
}

const COLUMNS_CRM = [
  { id: "LEAD", label: "Leads", color: "from-amber-500 to-amber-600" },
  { id: "ORCAMENTO", label: "Orçamentos", color: "from-orange-500 to-orange-600" },
  { id: "NEGOCIACAO", label: "Negociação", color: "from-blue-500 to-blue-600" },
  { id: "CONFERENCIA_TECNICA", label: "Conf. Técnica", color: "from-purple-500 to-purple-600" },
  { id: "APROVADO", label: "Aprovados", color: "from-emerald-500 to-emerald-600" },
  { id: "PRODUCAO", label: "Produção", color: "from-cyan-500 to-cyan-600" },
  { id: "INSTALACAO", label: "Instalação", color: "from-indigo-500 to-indigo-600" },
  { id: "FINALIZADO", label: "Finalizados", color: "from-slate-500 to-slate-600" },
  { id: "PERDIDO", label: "Perdas", color: "from-rose-500 to-rose-600" },
];

const COLUMNS_FACTORY = [
  { id: "PRONTO_PRODUCAO", label: "Fila de Produção", color: "from-purple-400 to-purple-500" },
  { id: "EM_CORTE", label: "Corte / Usinagem", color: "from-cyan-400 to-cyan-500" },
  { id: "MONTAGEM_FABRICA", label: "Montagem Fábrica", color: "from-orange-400 to-orange-500" },
  { id: "PRONTO_ENTREGA", label: "Pronto p/ Entrega", color: "from-emerald-400 to-emerald-500" },
  { id: "EM_INSTALACAO", label: "Instalação", color: "from-indigo-400 to-indigo-500" },
];

const FUNNEL_ACTIVE_STATUSES = [
  "LEAD",
  "ORCAMENTO",
  "NEGOCIACAO",
  "APROVADO",
  "CONFERENCIA_TECNICA",
  "PRODUCAO",
];

const CLOSED_STATUSES = ["APROVADO", "PRODUCAO", "INSTALACAO", "FINALIZADO"];
const PARTNER_COMMISSION_RATE = 0.05;

const ORIGIN_LABELS: Record<string, string> = {
  INSTAGRAM: "Instagram",
  INDICACAO: "Indicação de Clientes",
  SITE: "Site institucional",
  GOOGLE: "Google Search",
  WHATSAPP: "WhatsApp",
  FACEBOOK: "Facebook",
};

const PARTNER_TYPE_LABELS: Record<string, string> = {
  ARQUITETO: "Arquiteto",
  DESIGNER_INTERIORES: "Designer de Interiores",
  PROJETISTA: "Projetista",
  DECORADOR: "Decorador",
  ENGENHEIRO: "Engenheiro",
  OUTROS: "Parceiro",
};

// Cores dos avatares baseadas nos tipos de parceiro
const PARTNER_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  ARQUITETO: { bg: "bg-emerald-50 text-emerald-700", text: "text-emerald-800", border: "border-emerald-200/50" },
  DESIGNER_INTERIORES: { bg: "bg-amber-50 text-amber-700", text: "text-amber-800", border: "border-amber-200/50" },
  PROJETISTA: { bg: "bg-blue-50 text-blue-700", text: "text-blue-800", border: "border-blue-200/50" },
  DECORADOR: { bg: "bg-purple-50 text-purple-700", text: "text-purple-800", border: "border-purple-200/50" },
  ENGENHEIRO: { bg: "bg-cyan-50 text-cyan-700", text: "text-cyan-800", border: "border-cyan-200/50" },
  OUTROS: { bg: "bg-slate-50 text-slate-700", text: "text-slate-800", border: "border-slate-200/50" },
};

export default function BiClient({
  initialProjects,
  initialQuotes,
  initialEnvironments,
  companyId,
}: BiClientProps) {
  const [projects, setProjects] = useState(initialProjects);
  const [quotes, setQuotes] = useState(initialQuotes);
  const [environments, setEnvironments] = useState(initialEnvironments);

  // Privacidade global integrada do projeto
  const { privacyMode, togglePrivacy } = usePrivacy();

  // 1. Forçar o modo privado a estar ATIVO por padrão ao entrar no BI (Relatórios)
  useEffect(() => {
    if (!privacyMode) {
      togglePrivacy();
    }
  }, []); // Executado apenas na montagem

  // 2. Timer de auto-ocultação: se o usuário clicar para mostrar os valores (privacyMode virar false),
  // aguardamos 30 segundos e depois ativamos a privacidade de novo automaticamente.
  useEffect(() => {
    let timerId: NodeJS.Timeout;

    if (!privacyMode) {
      timerId = setTimeout(() => {
        togglePrivacy();
      }, 30_000); // 30 segundos
    }

    return () => {
      if (timerId) {
        clearTimeout(timerId);
      }
    };
  }, [privacyMode, togglePrivacy]);

  // Estados de navegação e busca
  const [activeTab, setActiveTab] = useState<"geral" | "funil_orcamentos" | "producao" | "parceiros" | "exportar">("geral");
  const [searchTerm, setSearchTerm] = useState("");

  // Estados específicos para Parceiros
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [activeTypeFilter, setActiveTypeFilter] = useState<string>("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Estados de Configuração da Exportação PDF
  const [pdfPeriod, setPdfPeriod] = useState<"all" | "month" | "quarter" | "year">("all");
  const [pdfSections, setPdfSections] = useState({
    kpis: true,
    crm: true,
    channels: true,
    production: true,
    partners: true,
  });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);

  const syncBi = useCallback(async () => {
    const result = await getBiLiveSnapshot(companyId);
    if (result.success) {
      if (result.projects) setProjects(result.projects as Project[]);
      if (result.quotes) setQuotes(result.quotes);
      if (result.environments) setEnvironments(result.environments as FactoryEnvironment[]);
    }
  }, [companyId]);

  useLiveEntity("bi", { sync: syncBi });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const isQuoteExpired = (validade: string) => toISODateBR(validade) < toISODateBR();

  // Métricas de Orçamentos
  const quoteMetrics = useMemo(() => {
    const totalValue = quotes.reduce((acc, q) => acc + q.valor_final, 0);
    const approved = quotes.filter((q) => q.aprovado_em);
    const totalApprovedValue = approved.reduce((acc, q) => acc + q.valor_final, 0);
    const averageValue = approved.length > 0 ? totalApprovedValue / approved.length : 0;
    const expiredCount = quotes.filter((q) => isQuoteExpired(q.validade) && !q.aprovado_em).length;
    const activeCount = quotes.filter((q) => !isQuoteExpired(q.validade) && !q.aprovado_em).length;
    return {
      count: quotes.length,
      totalValue,
      totalApprovedValue,
      averageValue,
      expiredCount,
      activeCount,
      approvedCount: approved.length,
    };
  }, [quotes]);

  const totalPipeline = projects.reduce((acc, p) => acc + p.valor_previsto, 0);

  const funnelActiveProjects = projects.filter((p) =>
    FUNNEL_ACTIVE_STATUSES.includes(p.status_geral)
  );
  const funnelNegotiationValue = funnelActiveProjects.reduce(
    (acc, p) => acc + p.valor_previsto,
    0
  );
  const negotiationProjects = projects.filter((p) => p.status_geral === "NEGOCIACAO");
  const negotiationValue = negotiationProjects.reduce((acc, p) => acc + p.valor_previsto, 0);
  const lostProjects = projects.filter((p) => p.status_geral === "PERDIDO");
  const lostValue = lostProjects.reduce((acc, p) => acc + p.valor_previsto, 0);

  const statusCounts = COLUMNS_CRM.map((col) => {
    const list = projects.filter((p) => p.status_geral === col.id);
    const sum = list.reduce((acc, p) => acc + p.valor_previsto, 0);
    return {
      id: col.id,
      label: col.label,
      count: list.length,
      value: sum,
      color: col.color,
    };
  });

  const maxCRMValue = Math.max(...statusCounts.map((s) => s.value), 1);

  const activeClosedProjects = projects.filter((p) => CLOSED_STATUSES.includes(p.status_geral));
  const grossRevenue = activeClosedProjects.reduce((acc, p) => acc + p.valor_previsto, 0);
  const ticketMedio =
    activeClosedProjects.length > 0 ? grossRevenue / activeClosedProjects.length : 0;

  const originsData = useMemo(() => {
    const map = new Map<string, { name: string; count: number; value: number }>();

    for (const project of projects) {
      const origem = (project.client.origem || "OUTRO").toUpperCase();
      const current = map.get(origem) ?? { name: origem, count: 0, value: 0 };
      current.count += 1;
      current.value += project.valor_previsto;
      map.set(origem, current);
    }

    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [projects]);

  const maxOriginValue = Math.max(...originsData.map((o) => o.value), 1);

  // Agrupamento e ranking de projetistas incluindo o tipo de parceiro e fotoUrl
  const designerRanking = useMemo(() => {
    const byPartner = new Map<
      string,
      {
        name: string;
        city: string;
        tipo: string;
        fotoUrl: string | null;
        count: number;
        totalSold: number;
        comission: number;
      }
    >();

    for (const project of projects) {
      if (!project.partner_id || !project.partner) continue;
      const current = byPartner.get(project.partner_id) ?? {
        name: project.partner.nome,
        city: project.partner.cidade || "Não informada",
        tipo: project.partner.tipo || "OUTROS",
        fotoUrl: project.partner.fotoUrl || null,
        count: 0,
        totalSold: 0,
        comission: 0,
      };
      current.count += 1;
      current.totalSold += project.valor_previsto;
      current.comission = current.totalSold * PARTNER_COMMISSION_RATE;
      byPartner.set(project.partner_id, current);
    }

    return Array.from(byPartner.values()).sort((a, b) => b.totalSold - a.totalSold);
  }, [projects]);

  // Estatísticas consolidadas de parcerias
  const partnersStats = useMemo(() => {
    const activeCount = designerRanking.length;
    const faturamentoTotal = designerRanking.reduce((acc, des) => acc + des.totalSold, 0);
    const comissaoTotal = designerRanking.reduce((acc, des) => acc + des.comission, 0);
    const topPartner = designerRanking.length > 0 ? designerRanking[0] : null;

    return {
      activeCount,
      faturamentoTotal,
      comissaoTotal,
      topPartner,
    };
  }, [designerRanking]);

  // Filtragem de parceiros para pesquisa e tipo de parceiro
  const filteredDesignerRanking = useMemo(() => {
    let result = designerRanking;

    // Filtro por tipo de parceiro
    if (activeTypeFilter !== "todos") {
      result = result.filter((des) => des.tipo === activeTypeFilter);
    }

    // Filtro por termo de busca
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (des) =>
          des.name.toLowerCase().includes(term) ||
          des.city.toLowerCase().includes(term)
      );
    }

    return result;
  }, [designerRanking, searchTerm, activeTypeFilter]);

  // Lógica de Paginação de Parceiros
  const totalPartners = filteredDesignerRanking.length;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedPartners = useMemo(() => {
    return filteredDesignerRanking.slice(startIndex, startIndex + pageSize);
  }, [filteredDesignerRanking, startIndex, pageSize]);

  // Handlers para resetar página ativa ao filtrar/pesquisar
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleTypeFilterChange = (tipo: string) => {
    setActiveTypeFilter(tipo);
    setCurrentPage(1);
  };

  // Reestruturação para usar elemento React ao invés de string estática, ocultando o ticket médio de faturamento destaque
  const highlightText = useMemo(() => {
    if (activeClosedProjects.length === 0 || grossRevenue === 0) {
      return (
        <span>
          Nenhum projeto foi aprovado ou finalizado ainda para calcular os destaques comerciais e ticket médio reais do faturamento da fábrica.
        </span>
      );
    }

    const originRevenues: Record<string, number> = {};
    activeClosedProjects.forEach((p) => {
      const orig = p.client.origem;
      originRevenues[orig] = (originRevenues[orig] || 0) + p.valor_previsto;
    });

    const sortedOrigins = Object.entries(originRevenues)
      .map(([name, val]) => ({ name, val }))
      .sort((a, b) => b.val - a.val);

    if (sortedOrigins.length === 0) {
      return (
        <span>
          Nenhum projeto foi aprovado ou finalizado ainda para calcular os destaques comerciais e ticket médio reais do faturamento da fábrica.
        </span>
      );
    }

    const mainOrigin = sortedOrigins[0];
    const pct = (mainOrigin.val / grossRevenue) * 100;
    const originLabel = ORIGIN_LABELS[mainOrigin.name] || mainOrigin.name;

    return (
      <span>
        Os leads via {originLabel} são responsáveis por {pct.toFixed(0)}% da receita aprovada, com ticket médio real de <strong className="privacy-value font-bold">{formatCurrency(ticketMedio)}</strong> por projeto fechado.
      </span>
    );
  }, [activeClosedProjects, grossRevenue, ticketMedio]);

  // ==========================================
  // NOVOS CÁLCULOS ANALÍTICOS PARA UI/UX
  // ==========================================

  // 1. Funil de Conversão Comercial
  const funnelStages = useMemo(() => {
    const totalLeadsQtd = projects.length;
    const totalLeadsVal = totalPipeline;

    const orcamentosProjects = projects.filter((p) => p.status_geral !== "LEAD" && p.status_geral !== "PERDIDO");
    const orcamentosQtd = orcamentosProjects.length;
    const orcamentosVal = orcamentosProjects.reduce((acc, p) => acc + p.valor_previsto, 0);

    const negocProjects = projects.filter((p) =>
      ["NEGOCIACAO", "CONFERENCIA_TECNICA", "APROVADO", "PRODUCAO", "INSTALACAO", "FINALIZADO"].includes(p.status_geral)
    );
    const negocQtd = negocProjects.length;
    const negocVal = negocProjects.reduce((acc, p) => acc + p.valor_previsto, 0);

    const fechadosProjects = projects.filter((p) => CLOSED_STATUSES.includes(p.status_geral));
    const fechadosQtd = fechadosProjects.length;
    const fechadosVal = grossRevenue;

    // Conversões etapa a etapa
    const convLeadsToOrc = totalLeadsQtd > 0 ? (orcamentosQtd / totalLeadsQtd) * 100 : 0;
    const convOrcToNeg = orcamentosQtd > 0 ? (negocQtd / orcamentosQtd) * 100 : 0;
    const convNegToFechados = negocQtd > 0 ? (fechadosQtd / negocQtd) * 100 : 0;
    const convGeral = totalLeadsQtd > 0 ? (fechadosQtd / totalLeadsQtd) * 100 : 0;

    return {
      leads: { label: "Leads (Total)", qtd: totalLeadsQtd, value: totalLeadsVal },
      orcamentos: { label: "Propostas Criadas", qtd: orcamentosQtd, value: orcamentosVal, conv: convLeadsToOrc },
      negociacao: { label: "Em Negociação", qtd: negocQtd, value: negocVal, conv: convOrcToNeg },
      fechados: { label: "Projetos Fechados", qtd: fechadosQtd, value: fechadosVal, conv: convNegToFechados },
      convGeral,
    };
  }, [projects, totalPipeline, grossRevenue]);

  // 2. Saúde dos Orçamentos
  const quotesHealth = useMemo(() => {
    const approvedQuotes = quotes.filter((q) => q.aprovado_em);
    const approvedVal = approvedQuotes.reduce((acc, q) => acc + q.valor_final, 0);

    const activeQuotes = quotes.filter((q) => !q.aprovado_em && !isQuoteExpired(q.validade));
    const activeVal = activeQuotes.reduce((acc, q) => acc + q.valor_final, 0);

    const expiredQuotes = quotes.filter((q) => !q.aprovado_em && isQuoteExpired(q.validade));
    const expiredVal = expiredQuotes.reduce((acc, q) => acc + q.valor_final, 0);

    const totalVal = quotes.reduce((acc, q) => acc + q.valor_final, 0) || 1;

    return {
      approved: { label: "Aprovados", qtd: approvedQuotes.length, value: approvedVal, pct: (approvedVal / totalVal) * 100 },
      active: { label: "Ativos", qtd: activeQuotes.length, value: activeVal, pct: (activeVal / totalVal) * 100 },
      expired: { label: "Vencidos", qtd: expiredQuotes.length, value: expiredVal, pct: (expiredVal / totalVal) * 100 },
      totalVal,
    };
  }, [quotes]);

  // 3. Alertas e Oportunidades Comerciais (agora usando elementos React para ocultar os valores sensíveis)
  const commercialAlerts = useMemo(() => {
    const list: Array<{ id: string; type: "warning" | "success" | "info"; title: string; desc: React.ReactNode }> = [];

    // Alerta 1: Orçamentos Ativos (oportunidade de fechamento)
    const activeVal = quotesHealth.active.value;
    const activeQtd = quotesHealth.active.qtd;
    if (activeQtd > 0) {
      list.push({
        id: "alert-active",
        type: "success",
        title: "Acompanhamento Comercial Pendente",
        desc: (
          <span>
            Temos {activeQtd} proposta(s) ativa(s) aguardando retorno dos clientes, representando <strong className="privacy-value font-bold">{formatCurrency(activeVal)}</strong> no mercado. Faça follow-up hoje mesmo.
          </span>
        )
      });
    }

    // Alerta 2: Projetos grandes parados em Negociação
    const negocVal = negotiationValue;
    const negocQtd = negotiationProjects.length;
    if (negocQtd > 0 && negocVal > 50000) {
      list.push({
        id: "alert-negoc",
        type: "info",
        title: "Decisão Comercial Requerida",
        desc: (
          <span>
            Há {negocQtd} projeto(s) na etapa de Negociação acumulando <strong className="privacy-value font-bold">{formatCurrency(negocVal)}</strong>. Priorize a renegociação destes leads com os projetistas.
          </span>
        )
      });
    }

    // Alerta 3: Orçamentos vencidos (oportunidade de resgate)
    const expiredVal = quotesHealth.expired.value;
    const expiredQtd = quotesHealth.expired.qtd;
    if (expiredQtd > 0) {
      list.push({
        id: "alert-expired",
        type: "warning",
        title: "Resgate de Propostas Vencidas",
        desc: (
          <span>
            Existem {expiredQtd} orçamento(s) vencido(s) que somam <strong className="privacy-value font-bold">{formatCurrency(expiredVal)}</strong>. Vale estruturar uma campanha de desconto ou resgate técnico.
          </span>
        )
      });
    }

    return list;
  }, [quotesHealth, negotiationValue, negotiationProjects]);

  // ==========================================
  // NOVOS CÁLCULOS ANALÍTICOS DE PRODUÇÃO
  // ==========================================

  // Cômodos ativos na fábrica (todos exceto os marcados como FINALIZADO)
  const activeEnvironments = useMemo(() => {
    return environments.filter((e) => e.status !== "FINALIZADO");
  }, [environments]);

  const factoryKpis = useMemo(() => {
    const total = activeEnvironments.length;
    const emCorte = activeEnvironments.filter((e) => e.status === "EM_CORTE").length;
    const emMontagem = activeEnvironments.filter((e) => e.status === "MONTAGEM_FABRICA").length;
    const prontoEntrega = activeEnvironments.filter((e) => e.status === "PRONTO_ENTREGA").length;
    const emInstalacao = activeEnvironments.filter((e) => e.status === "EM_INSTALACAO").length;
    const filaProducao = activeEnvironments.filter((e) => e.status === "PRONTO_PRODUCAO").length;

    return {
      total,
      emCorte,
      emMontagem,
      prontoEntrega,
      emInstalacao,
      filaProducao,
    };
  }, [activeEnvironments]);

  // Distribuição de carga de trabalho dos colaboradores (Responsável / Ajudante)
  const staffWorkload = useMemo(() => {
    const map = new Map<string, { name: string; lead: number; helper: number; total: number }>();

    for (const env of activeEnvironments) {
      if (env.responsavelNome) {
        const cur = map.get(env.responsavelNome) ?? { name: env.responsavelNome, lead: 0, helper: 0, total: 0 };
        cur.lead += 1;
        cur.total += 1;
        map.set(env.responsavelNome, cur);
      }
      if (env.ajudanteNome) {
        const cur = map.get(env.ajudanteNome) ?? { name: env.ajudanteNome, lead: 0, helper: 0, total: 0 };
        cur.helper += 1;
        cur.total += 1;
        map.set(env.ajudanteNome, cur);
      }
    }

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [activeEnvironments]);

  // Estatísticas de preenchimento das Fichas Técnicas
  const techSheetStats = useMemo(() => {
    if (activeEnvironments.length === 0) return { pct: 0, complete: 0, incomplete: 0 };
    let filledSum = 0;
    let totalSum = 0;
    let completeCount = 0;

    for (const env of activeEnvironments) {
      filledSum += env.techSheetFilled || 0;
      totalSum += env.techSheetTotal || 0;
      if (env.techSheetComplete) completeCount += 1;
    }

    const pct = totalSum > 0 ? (filledSum / totalSum) * 100 : 0;
    return {
      pct,
      complete: completeCount,
      incomplete: activeEnvironments.length - completeCount,
    };
  }, [activeEnvironments]);

  // Tipologia dos cômodos que estão na linha de produção hoje
  const roomTypesData = useMemo(() => {
    const map = new Map<string, { type: string; count: number }>();
    for (const env of activeEnvironments) {
      const type = env.tipo || "OUTROS";
      const cur = map.get(type) ?? { type, count: 0 };
      cur.count += 1;
      map.set(type, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [activeEnvironments]);

  const maxRoomTypeCount = Math.max(...roomTypesData.map((r) => r.count), 1);

  // Helper para obter as iniciais de um nome
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return "";
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Helper para obter ícone de acordo com o tipo
  const getPartnerIcon = (tipo: string) => {
    switch (tipo) {
      case "ARQUITETO":
        return Ruler;
      case "DESIGNER_INTERIORES":
        return Palette;
      default:
        return User;
    }
  };

  // Ação de geração de PDF simulada e disparo de impressão
  const handleGeneratePdf = () => {
    setIsGeneratingPdf(true);
    setPdfProgress(10);
    
    const interval = setInterval(() => {
      setPdfProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsGeneratingPdf(false);
            window.print();
          }, 300);
          return 100;
        }
        return prev + 30;
      });
    }, 200);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden space-y-4 print:space-y-0 print:overflow-visible">
      {/* Estilos de Impressão Injetados Dinamicamente */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            /* Esconder componentes normais da UI do dashboard */
            .app-sidebar,
            header,
            aside,
            nav,
            .print\\:hidden,
            .suggestion-fab,
            button {
              display: none !important;
            }
            /* Ocupar tela inteira para o contêiner de impressão */
            main {
              padding: 0 !important;
              margin: 0 !important;
              background: white !important;
            }
            .dashboard-main-mobile {
              padding-bottom: 0 !important;
            }
            body {
              background: white !important;
              color: black !important;
            }
          }
        `
      }} />

      {/* Navegação de Abas Premium */}
      <div className="shrink-0 flex items-center justify-between border-b border-border/40 pb-1 print:hidden">
        <div className="flex gap-1 overflow-x-auto no-scrollbar scroll-smooth py-1">
          <button
            onClick={() => setActiveTab("geral")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
              activeTab === "geral"
                ? "bg-primary/10 text-primary border border-primary/20 shadow-xs"
                : "text-muted-foreground hover:bg-slate-100 hover:text-foreground border border-transparent"
            }`}
          >
            <PieChart className="h-4 w-4" />
            <span>Visão Geral</span>
          </button>
          
          <button
            onClick={() => setActiveTab("funil_orcamentos")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
              activeTab === "funil_orcamentos"
                ? "bg-primary/10 text-primary border border-primary/20 shadow-xs"
                : "text-muted-foreground hover:bg-slate-100 hover:text-foreground border border-transparent"
            }`}
          >
            <FolderKanban className="h-4 w-4" />
            <span>Funil & Orçamentos</span>
          </button>

          <button
            onClick={() => setActiveTab("producao")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
              activeTab === "producao"
                ? "bg-primary/10 text-primary border border-primary/20 shadow-xs font-bold"
                : "text-muted-foreground hover:bg-slate-100 hover:text-foreground border border-transparent"
            }`}
          >
            <Wrench className="h-4 w-4" />
            <span>Produção (Fábrica)</span>
            {activeEnvironments.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-primary/20 text-primary-foreground leading-none">
                {activeEnvironments.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("parceiros")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
              activeTab === "parceiros"
                ? "bg-primary/10 text-primary border border-primary/20 shadow-xs font-bold"
                : "text-muted-foreground hover:bg-slate-100 hover:text-foreground border border-transparent"
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Parceiros</span>
            {designerRanking.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-primary/20 text-primary-foreground leading-none">
                {designerRanking.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("exportar")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
              activeTab === "exportar"
                ? "bg-primary/10 text-primary border border-primary/20 shadow-xs font-bold"
                : "text-muted-foreground hover:bg-slate-100 hover:text-foreground border border-transparent"
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Exportar Relatório</span>
            <span className="px-1.5 py-0.5 text-[9px] font-black rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/25 tracking-wide">
              PDF
            </span>
          </button>
        </div>
      </div>

      {/* Área de Conteúdo das Abas (Scroll Interno) */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pb-[var(--space-6)] print:hidden print:overflow-visible">
        {activeTab === "geral" && (
          <div className="space-y-5 animate-in fade-in-50 duration-200">
            {/* Cards de KPIs de Visão Geral */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[var(--space-3)]">
              <KpiCard
                label="Pipeline de vendas"
                value={<span className="privacy-value">{formatCurrency(totalPipeline)}</span>}
                icon={TrendingUp}
                accent="primary"
              />
              <KpiCard
                label="Receita aprovada"
                value={<span className="privacy-value">{formatCurrency(grossRevenue)}</span>}
                icon={DollarSign}
                accent="success"
              />
              <KpiCard
                label="Projetos no funil"
                value={String(projects.length)}
                icon={FolderKanban}
                accent="info"
              />
              <KpiCard
                label="Ticket médio aprovado"
                value={<span className="privacy-value">{formatCurrency(ticketMedio)}</span>}
                icon={Award}
                accent="warning"
                trend={
                  activeClosedProjects.length > 0
                    ? {
                        value: `${activeClosedProjects.length} fechado${activeClosedProjects.length === 1 ? "" : "s"}`,
                      }
                    : undefined
                }
              />
            </div>

            {/* Gráficos de Funil CRM e Canal */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--space-4)]">
              <Card className="p-[var(--space-4)] space-y-[var(--space-3)]">
                <div>
                  <h3 className="text-headline text-foreground">Distribuição do funil CRM</h3>
                  <p className="text-caption text-muted-foreground mt-0.5">
                    Total financeiro retido em cada coluna operacional do Kanban.
                  </p>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {statusCounts.map((col) => {
                    const percentage = (col.value / maxCRMValue) * 100;
                    return (
                      <div key={col.id} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold text-neutral-800">
                          <span>
                            {col.label} ({col.count} {col.count === 1 ? "projeto" : "projetos"})
                          </span>
                          <span className="privacy-value">{formatCurrency(col.value)}</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${col.color} transition-all duration-1000`}
                            style={{ width: `${Math.max(2, percentage)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card className="p-[var(--space-4)] space-y-[var(--space-4)] flex flex-col justify-between">
                <div className="space-y-1">
                  <h3 className="text-headline text-foreground">Rentabilidade por canal</h3>
                  <p className="text-caption text-muted-foreground mt-0.5">
                    Quais canais trazem projetos de maior valor bruto de fechamento.
                  </p>
                </div>

                <div className="space-y-4 my-auto py-2 max-h-[260px] overflow-y-auto pr-1">
                  {originsData.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      Nenhum projeto com origem registrada.
                    </p>
                  ) : (
                    originsData.map((orig) => {
                      const pct = (orig.value / maxOriginValue) * 100;
                      return (
                        <div key={orig.name} className="flex items-center gap-3">
                          <span className="w-20 text-[10px] font-extrabold text-muted-foreground text-right tracking-wider block uppercase truncate">
                            {ORIGIN_LABELS[orig.name] || orig.name}
                          </span>
                          <div className="flex-1">
                            <div className="w-full h-3.5 bg-slate-100 rounded-md overflow-hidden relative">
                              <div
                                className="h-full rounded-md bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-1000"
                                style={{ width: `${Math.max(2, pct)}%` }}
                              />
                            </div>
                          </div>
                          <div className="w-24 text-right">
                            <strong className="text-xs font-bold text-neutral-800 block privacy-value">
                              {formatCurrency(orig.value)}
                            </strong>
                            <span className="text-[9px] text-muted-foreground block font-medium">
                              {orig.count} {orig.count === 1 ? "lead" : "leads"}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-2.5 mt-2">
                  <Sparkles className="h-4.5 w-4.5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <strong className="text-amber-800 font-bold block mb-0.5">Destaque Comercial:</strong>
                    <p className="text-amber-700/80 leading-relaxed font-medium">{highlightText}</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "funil_orcamentos" && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            {/* KPIs Rápidos no Topo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[var(--space-3)]">
              <KpiCard
                label="Conversão Geral"
                value={`${funnelStages.convGeral.toFixed(1)}%`}
                icon={Target}
                accent="primary"
                trend={{ value: "Leads convertidos em vendas", positive: true }}
              />
              <KpiCard
                label="Faturamento Ativo"
                value={<span className="privacy-value">{formatCurrency(funnelNegotiationValue)}</span>}
                icon={TrendingUp}
                accent="info"
              />
              <KpiCard
                label="Orçamentos Aprovados"
                value={<span className="privacy-value">{formatCurrency(quoteMetrics.totalApprovedValue)}</span>}
                icon={DollarSign}
                accent="success"
                trend={{ value: `${quoteMetrics.approvedCount} propostas aceitas` }}
              />
              <KpiCard
                label="Ticket Médio Proposta"
                value={<span className="privacy-value">{formatCurrency(quoteMetrics.averageValue)}</span>}
                icon={Clock}
                accent="warning"
              />
            </div>

            {/* Grid dos Gráficos Ricos */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Gráfico do Funil de Conversão */}
              <Card className="p-5 lg:col-span-7 space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-headline text-foreground flex items-center gap-1.5">
                    <Target className="h-4.5 w-4.5 text-primary" />
                    Fluxo de Conversão Comercial
                  </h3>
                  <p className="text-caption text-muted-foreground mt-0.5">
                    Visualização analítica do funil comercial e as taxas de perda ou avanço entre as fases.
                  </p>
                </div>

                <div className="space-y-3.5 my-auto py-2">
                  {/* Etapa 1: Leads */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-neutral-800">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-slate-400" />
                        {funnelStages.leads.label}
                      </span>
                      <div className="text-right">
                        <span className="privacy-value block font-extrabold">{formatCurrency(funnelStages.leads.value)}</span>
                        <span className="text-[10px] text-muted-foreground block font-medium">{funnelStages.leads.qtd} projetos cadastrados</span>
                      </div>
                    </div>
                    <div className="w-full h-6 bg-slate-100 rounded-lg overflow-hidden border border-slate-200/50 flex">
                      <div className="h-full bg-slate-400/90 text-[10px] text-white flex items-center justify-center font-bold px-3 transition-all duration-1000 w-full">
                        100% Topo do Funil
                      </div>
                    </div>
                  </div>

                  {/* Seta de Conversão 1 */}
                  <div className="flex justify-center items-center">
                    <div className="bg-amber-500/10 text-primary border border-amber-500/20 px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1.5 shadow-2xs">
                      <Percent className="h-3 w-3" />
                      <span>{funnelStages.orcamentos.conv.toFixed(0)}% avançaram para proposta</span>
                    </div>
                  </div>

                  {/* Etapa 2: Orçamentos */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-neutral-800">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-orange-500" />
                        {funnelStages.orcamentos.label}
                      </span>
                      <div className="text-right">
                        <span className="privacy-value block font-extrabold">{formatCurrency(funnelStages.orcamentos.value)}</span>
                        <span className="text-[10px] text-muted-foreground block font-medium">{funnelStages.orcamentos.qtd} propostas elaboradas</span>
                      </div>
                    </div>
                    <div className="w-full h-6 bg-slate-100 rounded-lg overflow-hidden border border-slate-200/50 flex">
                      <div 
                        className="h-full bg-orange-500/90 text-[10px] text-white flex items-center justify-center font-bold px-3 transition-all duration-1000 rounded-r-md"
                        style={{ width: `${Math.max(15, funnelStages.orcamentos.conv)}%` }}
                      >
                        {funnelStages.orcamentos.conv.toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  {/* Seta de Conversão 2 */}
                  <div className="flex justify-center items-center">
                    <div className="bg-blue-500/10 text-blue-600 border border-blue-500/20 px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1.5 shadow-2xs">
                      <Percent className="h-3 w-3" />
                      <span>{funnelStages.negociacao.conv.toFixed(0)}% entraram em negociação</span>
                    </div>
                  </div>

                  {/* Etapa 3: Negociação */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-neutral-800">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                        {funnelStages.negociacao.label}
                      </span>
                      <div className="text-right">
                        <span className="privacy-value block font-extrabold">{formatCurrency(funnelStages.negociacao.value)}</span>
                        <span className="text-[10px] text-muted-foreground block font-medium">{funnelStages.negociacao.qtd} projetos ativos</span>
                      </div>
                    </div>
                    <div className="w-full h-6 bg-slate-100 rounded-lg overflow-hidden border border-slate-200/50 flex">
                      <div 
                        className="h-full bg-blue-500/90 text-[10px] text-white flex items-center justify-center font-bold px-3 transition-all duration-1000 rounded-r-md"
                        style={{ width: `${Math.max(12, (funnelStages.negociacao.conv * funnelStages.orcamentos.conv) / 100)}%` }}
                      >
                        {funnelStages.negociacao.conv.toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  {/* Seta de Conversão 3 */}
                  <div className="flex justify-center items-center">
                    <div className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1.5 shadow-2xs">
                      <Percent className="h-3 w-3" />
                      <span>{funnelStages.fechados.conv.toFixed(0)}% taxa de fechamento</span>
                    </div>
                  </div>

                  {/* Etapa 4: Fechados */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-neutral-800">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        {funnelStages.fechados.label}
                      </span>
                      <div className="text-right">
                        <span className="privacy-value block font-extrabold">{formatCurrency(funnelStages.fechados.value)}</span>
                        <span className="text-[10px] text-muted-foreground block font-medium">{funnelStages.fechados.qtd} contratos assinados</span>
                      </div>
                    </div>
                    <div className="w-full h-6 bg-slate-100 rounded-lg overflow-hidden border border-slate-200/50 flex">
                      <div 
                        className="h-full bg-emerald-500/90 text-[10px] text-white flex items-center justify-center font-bold px-3 transition-all duration-1000 rounded-r-md"
                        style={{ width: `${Math.max(8, funnelStages.convGeral)}%` }}
                      >
                        {funnelStages.convGeral.toFixed(0)}% Fechamento Geral
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Barra de Saúde dos Orçamentos */}
              <Card className="p-5 lg:col-span-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-0.5">
                  <h3 className="text-headline text-foreground flex items-center gap-1.5">
                    <ClipboardList className="h-4.5 w-4.5 text-primary" />
                    Saúde das Propostas Emitidas
                  </h3>
                  <p className="text-caption text-muted-foreground">
                    Análise da proporção de orçamentos aprovados, ativos comerciais ou vencidos.
                  </p>
                </div>

                <div className="space-y-6 my-auto">
                  {/* A Barra Segmentada Proporcional */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-extrabold text-neutral-500">
                      <span>Proporção por Valor de Orçamento</span>
                      <span>Total: <span className="privacy-value">{formatCurrency(quotesHealth.totalVal)}</span></span>
                    </div>
                    <div className="w-full h-6 rounded-lg overflow-hidden flex border border-slate-200/50 shadow-xs">
                      {quotesHealth.approved.value > 0 && (
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-1000 flex items-center justify-center text-[10px] font-black text-white"
                          style={{ width: `${quotesHealth.approved.pct}%` }}
                          title={`Aprovados: ${quotesHealth.approved.pct.toFixed(0)}%`}
                        >
                          {quotesHealth.approved.pct > 15 && `${quotesHealth.approved.pct.toFixed(0)}%`}
                        </div>
                      )}
                      {quotesHealth.active.value > 0 && (
                        <div 
                          className="h-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-1000 flex items-center justify-center text-[10px] font-black text-white"
                          style={{ width: `${quotesHealth.active.pct}%` }}
                          title={`Ativos: ${quotesHealth.active.pct.toFixed(0)}%`}
                        >
                          {quotesHealth.active.pct > 15 && `${quotesHealth.active.pct.toFixed(0)}%`}
                        </div>
                      )}
                      {quotesHealth.expired.value > 0 && (
                        <div 
                          className="h-full bg-gradient-to-r from-rose-400 to-rose-500 transition-all duration-1000 flex items-center justify-center text-[10px] font-black text-white"
                          style={{ width: `${quotesHealth.expired.pct}%` }}
                          title={`Vencidos: ${quotesHealth.expired.pct.toFixed(0)}%`}
                        >
                          {quotesHealth.expired.pct > 15 && `${quotesHealth.expired.pct.toFixed(0)}%`}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Legenda Detalhada */}
                  <div className="space-y-3 border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded bg-emerald-500 shrink-0" />
                        <span className="font-bold text-neutral-800">Propostas Aprovadas</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-neutral-900 block privacy-value">{formatCurrency(quotesHealth.approved.value)}</span>
                        <span className="text-[10px] text-muted-foreground block font-medium">{quotesHealth.approved.qtd} propostas aceitas</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded bg-blue-500 shrink-0" />
                        <span className="font-bold text-neutral-800">Propostas Ativas</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-neutral-900 block privacy-value">{formatCurrency(quotesHealth.active.value)}</span>
                        <span className="text-[10px] text-muted-foreground block font-medium">{quotesHealth.active.qtd} propostas em andamento</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded bg-rose-500 shrink-0" />
                        <span className="font-bold text-neutral-800">Propostas Expiradas</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-neutral-900 block privacy-value">{formatCurrency(quotesHealth.expired.value)}</span>
                        <span className="text-[10px] text-muted-foreground block font-medium">{quotesHealth.expired.qtd} propostas sem retorno</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Painel de Recomendações e Alertas Comerciais (Actionable Insights) */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 border-b border-border/40 pb-1">
                <Sparkles className="h-4.5 w-4.5 text-primary" />
                <h3 className="text-headline text-foreground">Alertas e Recomendações de Ação</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {commercialAlerts.length === 0 ? (
                  <Card className="col-span-3 p-4 text-center text-xs text-muted-foreground font-medium border-dashed border">
                    Nenhum alerta ou ação recomendada pendente. A saúde comercial está impecável!
                  </Card>
                ) : (
                  commercialAlerts.map((alert) => (
                    <Card key={alert.id} className={`p-4 flex gap-3 border ${
                      alert.type === "warning" 
                        ? "bg-rose-500/5 border-rose-500/10 text-rose-800" 
                        : alert.type === "success" 
                          ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-800" 
                          : "bg-blue-500/5 border-blue-500/10 text-blue-800"
                    }`}>
                      {alert.type === "warning" ? (
                        <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                      ) : alert.type === "success" ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-1">
                        <strong className="text-xs font-bold block">{alert.title}</strong>
                        <div className="text-[11px] leading-relaxed text-neutral-600/90 font-medium">
                          {alert.desc}
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "producao" && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            {/* 1. KPIs da Produção Translocados do Chão de Fábrica */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-[var(--space-3)]">
              <KpiCard label="Total na fábrica" value={`${factoryKpis.total} cômodos`} icon={ClipboardList} accent="neutral" />
              <KpiCard label="Em corte" value={`${factoryKpis.emCorte} cômodos`} icon={Layers} accent="info" />
              <KpiCard label="Em montagem" value={`${factoryKpis.emMontagem} peças`} icon={Wrench} accent="warning" />
              <KpiCard label="Pronto p/ expedição" value={`${factoryKpis.prontoEntrega} cômodos`} icon={Package} accent="success" />
            </div>

            {/* 2. Gráficos Analíticos Detalhados da Produção */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Distribuição por Etapa na Fábrica */}
              <Card className="p-5 lg:col-span-7 space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-headline text-foreground flex items-center gap-1.5">
                    <Wrench className="h-4.5 w-4.5 text-primary" />
                    Cômodos Ativos por Fila Operacional
                  </h3>
                  <p className="text-caption text-muted-foreground mt-0.5">
                    Volume de trabalho distribuído pelas fases físicas da marcenaria e entrega.
                  </p>
                </div>

                <div className="space-y-3.5 my-auto py-2">
                  {COLUMNS_FACTORY.map((col) => {
                    const count = activeEnvironments.filter((e) => e.status === col.id).length;
                    const maxCount = Math.max(...COLUMNS_FACTORY.map((c) => activeEnvironments.filter((e) => e.status === c.id).length), 1);
                    const pct = (count / maxCount) * 100;

                    return (
                      <div key={col.id} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold text-neutral-800">
                          <span>{col.label}</span>
                          <span>{count} {count === 1 ? "cômodo" : "cômodos"}</span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full bg-gradient-to-r ${col.color} transition-all duration-1000`}
                            style={{ width: `${Math.max(2, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Fichas Técnicas & Controle de Preparação */}
              <Card className="p-5 lg:col-span-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-0.5">
                  <h3 className="text-headline text-foreground flex items-center gap-1.5">
                    <ClipboardCheck className="h-4.5 w-4.5 text-primary" />
                    Preenchimento de Fichas Técnicas
                  </h3>
                  <p className="text-caption text-muted-foreground">
                    Taxa de documentação técnica dos cômodos liberados na fábrica.
                  </p>
                </div>

                <div className="space-y-5 my-auto">
                  <div className="flex flex-col items-center justify-center space-y-2 py-2">
                    <div className="relative flex items-center justify-center h-24 w-24">
                      {/* Círculo de Progresso */}
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="transparent"
                          className="text-slate-100"
                        />
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="transparent"
                          strokeDasharray={251.2}
                          strokeDashoffset={251.2 - (251.2 * techSheetStats.pct) / 100}
                          className="text-primary transition-all duration-1000"
                        />
                      </svg>
                      <span className="absolute text-lg font-black text-neutral-900">
                        {techSheetStats.pct.toFixed(0)}%
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-neutral-500">Média de Conclusão Técnica</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-center border-t border-slate-100 pt-3.5">
                    <div>
                      <span className="text-[10px] text-muted-foreground font-semibold block uppercase">Completas</span>
                      <strong className="text-sm font-bold text-emerald-600 block mt-0.5">{techSheetStats.complete} cômodos</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground font-semibold block uppercase">Incompletas</span>
                      <strong className="text-sm font-bold text-amber-600 block mt-0.5">{techSheetStats.incomplete} cômodos</strong>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Carga de Trabalho por Equipe e Tipologia de Cômodo */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              
              {/* Equipe Operacional da Fábrica */}
              <Card className="p-5 space-y-3.5">
                <div>
                  <h3 className="text-headline text-foreground flex items-center gap-1.5">
                    <Users className="h-4.5 w-4.5 text-primary" />
                    Carga de Trabalho da Equipe (Ativa)
                  </h3>
                  <p className="text-caption text-muted-foreground mt-0.5">
                    Número de cômodos sob encargo dos marceneiros e auxiliares no momento.
                  </p>
                </div>

                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                  {staffWorkload.length === 0 ? (
                    <div className="text-center py-8 text-xs text-muted-foreground font-semibold">
                      Nenhum profissional com cômodo atribuído hoje.
                    </div>
                  ) : (
                    staffWorkload.map((staff) => (
                      <div key={staff.name} className="flex items-center justify-between text-xs border-b border-slate-50 pb-2">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700 border">
                            {getInitials(staff.name)}
                          </span>
                          <div>
                            <strong className="text-neutral-800 block font-semibold">{staff.name}</strong>
                            <span className="text-[9px] text-muted-foreground block font-medium">
                              Como Responsável: {staff.lead} | Como Ajudante: {staff.helper}
                            </span>
                          </div>
                        </div>
                        <span className="bg-primary/10 text-primary font-extrabold text-xs px-2.5 py-1 rounded-lg">
                          {staff.total} cômodos
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              {/* Tipos de Cômodos em Produção */}
              <Card className="p-5 space-y-3.5">
                <div>
                  <h3 className="text-headline text-foreground flex items-center gap-1.5">
                    <Palette className="h-4.5 w-4.5 text-primary" />
                    Tipologia de Cômodos na Linha
                  </h3>
                  <p className="text-caption text-muted-foreground mt-0.5">
                    Quais ambientes predominam nas serras e bancadas de montagem atualmente.
                  </p>
                </div>

                <div className="space-y-4 max-h-[250px] overflow-y-auto pr-1">
                  {roomTypesData.length === 0 ? (
                    <div className="text-center py-8 text-xs text-muted-foreground font-semibold">
                      Nenhum cômodo ativo em produção.
                    </div>
                  ) : (
                    roomTypesData.map((room) => {
                      const pct = (room.count / maxRoomTypeCount) * 100;
                      return (
                        <div key={room.type} className="flex items-center gap-3">
                          <span className="w-20 text-[10px] font-extrabold text-muted-foreground text-right tracking-wider block uppercase truncate">
                            {room.type}
                          </span>
                          <div className="flex-1">
                            <div className="w-full h-3 bg-slate-100 rounded-md overflow-hidden relative">
                              <div
                                className="h-full rounded-md bg-gradient-to-r from-indigo-400 to-indigo-500 transition-all duration-1000"
                                style={{ width: `${Math.max(2, pct)}%` }}
                              />
                            </div>
                          </div>
                          <div className="w-16 text-right shrink-0">
                            <strong className="text-xs font-bold text-neutral-800 block">
                              {room.count} {room.count === 1 ? "cômodo" : "cômodos"}
                            </strong>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "parceiros" && (
          <div className="space-y-4 animate-in fade-in-50 duration-200 flex flex-col h-full">
            
            {/* 1. KPIs Rápidos de Parcerias */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[var(--space-3)] shrink-0">
              <KpiCard
                label="Parceiros Vinculados"
                value={String(designerRanking.length)}
                icon={Users}
                accent="primary"
              />
              <KpiCard
                label="Faturamento Parcerias"
                value={<span className="privacy-value">{formatCurrency(partnersStats.faturamentoTotal)}</span>}
                icon={TrendingUp}
                accent="success"
              />
              <KpiCard
                label="Comissões Estimadas (5%)"
                value={<span className="privacy-value">{formatCurrency(partnersStats.comissaoTotal)}</span>}
                icon={DollarSign}
                accent="info"
              />
              <KpiCard
                label="Parceiro Destaque"
                value={partnersStats.topPartner ? partnersStats.topPartner.name : "Nenhum"}
                icon={Award}
                accent="warning"
                trend={
                  partnersStats.topPartner 
                    ? { 
                        value: (
                          <span>
                            Faturou <strong className="privacy-value font-bold">{formatCurrency(partnersStats.topPartner.totalSold)}</strong>
                          </span>
                        ) 
                      } 
                    : undefined
                }
              />
            </div>

            {/* 2. Barra de Filtro, Busca e Controles de Visualização */}
            <div className="flex flex-col gap-3 p-4 bg-slate-50 border border-border/40 rounded-xl shrink-0">
              <div className="flex flex-col sm:flex-row gap-3 justify-between sm:items-center">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Pesquisar parceiro ou cidade..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="w-full bg-white pl-9 pr-4 py-2 text-sm rounded-lg border border-border focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary transition-all shadow-xs"
                  />
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className="text-xs text-muted-foreground font-semibold">Exibição:</span>
                  <div className="inline-flex rounded-lg border border-border bg-white p-0.5 shadow-xs">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-1.5 rounded-md transition-all cursor-pointer flex items-center justify-center ${
                        viewMode === "grid"
                          ? "bg-slate-100 text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      title="Visualizar em Grade"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("table")}
                      className={`p-1.5 rounded-md transition-all cursor-pointer flex items-center justify-center ${
                        viewMode === "table"
                          ? "bg-slate-100 text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      title="Visualizar em Tabela"
                    >
                      <Table className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Botões de Filtro Rápido de Tipo */}
              <div className="flex flex-wrap gap-1.5 border-t border-slate-200/50 pt-3">
                <button
                  onClick={() => handleTypeFilterChange("todos")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                    activeTypeFilter === "todos"
                      ? "bg-neutral-900 border-neutral-900 text-white shadow-xs"
                      : "bg-white border-border hover:bg-slate-100 text-neutral-700"
                  }`}
                >
                  Todos os Tipos
                </button>
                {Array.from(new Set(designerRanking.map((d) => d.tipo))).filter(Boolean).map((tipo) => {
                  const label = PARTNER_TYPE_LABELS[tipo] || tipo;
                  return (
                    <button
                      key={tipo}
                      onClick={() => handleTypeFilterChange(tipo)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                        activeTypeFilter === tipo
                          ? "bg-neutral-900 border-neutral-900 text-white shadow-xs"
                          : "bg-white border-border hover:bg-slate-100 text-neutral-700"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Listagem com Alternador de Layout */}
            <div className="flex-1 min-h-[300px] overflow-y-auto pr-1">
              {viewMode === "grid" ? (
                // Grade de Cards Modernos (Crachás de Parceiros)
                <div>
                  {paginatedPartners.length === 0 ? (
                    <div className="text-center py-12 text-sm text-muted-foreground bg-slate-50/50 border border-dashed rounded-xl">
                      Nenhum parceiro encontrado para os filtros atuais.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {paginatedPartners.map((des) => {
                        const TypeIcon = getPartnerIcon(des.tipo);
                        const typeColors = PARTNER_TYPE_COLORS[des.tipo] || PARTNER_TYPE_COLORS.OUTROS;
                        const contributionPct = partnersStats.faturamentoTotal > 0 
                          ? (des.totalSold / partnersStats.faturamentoTotal) * 100 
                          : 0;

                        return (
                          <Card key={des.name} className="p-4 space-y-4 hover:shadow-md transition-all duration-300 border border-border/40 relative overflow-hidden group">
                            {/* Top Card: Info Principal */}
                            <div className="flex items-start justify-between gap-3 relative z-5">
                              <div className="flex items-center gap-3">
                                {/* Avatar circular com foto real ou iniciais */}
                                <div className="h-11 w-11 rounded-full overflow-hidden border flex items-center justify-center font-bold text-sm tracking-wide shadow-2xs shrink-0 bg-slate-50 border-slate-200/50">
                                  {des.fotoUrl ? (
                                    <img 
                                      src={des.fotoUrl} 
                                      alt={des.name} 
                                      className="h-full w-full object-cover animate-in fade-in-30 duration-300" 
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = "none";
                                        const parent = (e.target as HTMLElement).parentElement;
                                        if (parent && !parent.querySelector(".fallback-avatar")) {
                                          const textSpan = document.createElement("span");
                                          textSpan.className = `fallback-avatar ${typeColors.bg} ${typeColors.text} w-full h-full flex items-center justify-center`;
                                          textSpan.innerText = getInitials(des.name);
                                          parent.appendChild(textSpan);
                                        }
                                      }}
                                    />
                                  ) : (
                                    <span className={`${typeColors.bg} ${typeColors.text} w-full h-full flex items-center justify-center`}>
                                      {getInitials(des.name)}
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-sm font-extrabold text-neutral-900 truncate leading-snug group-hover:text-primary transition-colors">
                                    {des.name}
                                  </h4>
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md mt-0.5 border ${typeColors.bg} ${typeColors.border}`}>
                                    <TypeIcon className="h-3 w-3" />
                                    {PARTNER_TYPE_LABELS[des.tipo] || des.tipo}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="text-right">
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 justify-end font-semibold uppercase">
                                  <MapPin className="h-3 w-3 text-primary" />
                                  {des.city}
                                </span>
                              </div>
                            </div>

                            {/* Contribuição de Vendas */}
                            <div className="space-y-1 relative z-5 border-t border-slate-100 pt-3">
                              <div className="flex justify-between text-[10px] font-bold text-neutral-500">
                                <span>Participação Comercial</span>
                                <span>{contributionPct.toFixed(1)}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary rounded-full transition-all duration-1000"
                                  style={{ width: `${contributionPct}%` }}
                                />
                              </div>
                            </div>

                            {/* Métricas Compactas */}
                            <div className="grid grid-cols-3 gap-2 text-center border-t border-slate-100 pt-3 relative z-5 bg-slate-50/50 p-2 rounded-lg">
                              <div>
                                <span className="text-[9px] text-muted-foreground font-semibold block uppercase">Projetos</span>
                                <strong className="text-xs font-bold text-neutral-800 block mt-0.5">{des.count}</strong>
                              </div>
                              <div>
                                <span className="text-[9px] text-muted-foreground font-semibold block uppercase">Faturamento</span>
                                <strong className="text-xs font-black text-neutral-950 block mt-0.5 privacy-value">
                                  {formatCurrency(des.totalSold)}
                                </strong>
                              </div>
                              <div>
                                <span className="text-[9px] text-muted-foreground font-semibold block uppercase">Comissão</span>
                                <strong className="text-xs font-black text-emerald-600 block mt-0.5 privacy-value">
                                  {formatCurrency(des.comission)}
                                </strong>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                // Tabela Corporativa Tradicional Otimizada
                <div className="border border-border/40 rounded-xl bg-white shadow-xs">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border/40 text-muted-foreground text-xs uppercase font-bold bg-slate-50 sticky top-0 z-15 shadow-2xs">
                        <th className="p-3">Nome do Profissional</th>
                        <th className="p-3">Categoria</th>
                        <th className="p-3">Cidade / Região</th>
                        <th className="p-3 text-center">Projetos</th>
                        <th className="p-3 text-right">Valor dos projetos</th>
                        <th className="p-3 text-right">Comissão (5%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20 text-neutral-700">
                      {paginatedPartners.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-12 text-center text-sm text-muted-foreground">
                            Nenhum parceiro encontrado para os filtros atuais.
                          </td>
                        </tr>
                      ) : (
                        paginatedPartners.map((des) => {
                          const TypeIcon = getPartnerIcon(des.tipo);
                          const typeColors = PARTNER_TYPE_COLORS[des.tipo] || PARTNER_TYPE_COLORS.OUTROS;

                          return (
                            <tr key={des.name} className="hover:bg-slate-50/40 transition-colors">
                              <td className="p-3">
                                <div className="flex items-center gap-3">
                                  {/* Avatar circular com foto real na tabela */}
                                  <div className="h-8 w-8 rounded-full overflow-hidden border flex items-center justify-center font-bold text-xs shadow-2xs shrink-0 bg-slate-50 border-slate-200/50">
                                    {des.fotoUrl ? (
                                      <img 
                                        src={des.fotoUrl} 
                                        alt={des.name} 
                                        className="h-full w-full object-cover animate-in fade-in-30 duration-300" 
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = "none";
                                          const parent = (e.target as HTMLElement).parentElement;
                                          if (parent && !parent.querySelector(".fallback-avatar")) {
                                            const textSpan = document.createElement("span");
                                            textSpan.className = `fallback-avatar ${typeColors.bg} ${typeColors.text} w-full h-full flex items-center justify-center`;
                                            textSpan.innerText = getInitials(des.name);
                                            parent.appendChild(textSpan);
                                          }
                                        }}
                                      />
                                    ) : (
                                      <span className={`${typeColors.bg} ${typeColors.text} w-full h-full flex items-center justify-center`}>
                                        {getInitials(des.name)}
                                      </span>
                                    )}
                                  </div>
                                  <strong className="text-neutral-900 text-sm font-semibold">{des.name}</strong>
                                </div>
                              </td>
                              <td className="p-3">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${typeColors.bg} ${typeColors.border}`}>
                                  <TypeIcon className="h-3 w-3" />
                                  {PARTNER_TYPE_LABELS[des.tipo] || des.tipo}
                                </span>
                              </td>
                              <td className="p-3 text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5 text-primary" />
                                  {des.city}
                                </div>
                              </td>
                              <td className="p-3 text-center font-bold text-neutral-800">{des.count}</td>
                              <td className="p-3 text-right font-bold text-neutral-900 privacy-value">
                                {formatCurrency(des.totalSold)}
                              </td>
                              <td className="p-3 text-right">
                                <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-2xs privacy-value">
                                  {formatCurrency(des.comission)}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Componente de Paginação */}
            {filteredDesignerRanking.length > 0 && (
              <div className="shrink-0 mt-2 print:hidden border-t border-slate-100 pt-2">
                <Pagination
                  page={currentPage}
                  pageSize={pageSize}
                  total={totalPartners}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}
                  itemLabel="parceiros"
                />
              </div>
            )}
          </div>
        )}

        {activeTab === "exportar" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-in fade-in-50 duration-200">
            {/* Lado Esquerdo: Configuração da Exportação */}
            <Card className="lg:col-span-7 p-5 space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="text-title text-foreground">Central de Exportação de Relatórios</h3>
                </div>

                {/* Filtro de Período */}
                <div className="space-y-2">
                  <label className="text-xs font-extrabold uppercase text-muted-foreground tracking-wide block">
                    1. Período do Relatório
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      onClick={() => setPdfPeriod("all")}
                      className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                        pdfPeriod === "all"
                          ? "bg-neutral-900 border-neutral-900 text-white shadow-sm"
                          : "bg-white border-border hover:bg-slate-50 text-neutral-700"
                      }`}
                    >
                      Histórico Total
                    </button>
                    <button
                      onClick={() => setPdfPeriod("month")}
                      className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                        pdfPeriod === "month"
                          ? "bg-neutral-900 border-neutral-900 text-white shadow-sm"
                          : "bg-white border-border hover:bg-slate-50 text-neutral-700"
                      }`}
                    >
                      Mês Atual
                    </button>
                    <button
                      onClick={() => setPdfPeriod("quarter")}
                      className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                        pdfPeriod === "quarter"
                          ? "bg-neutral-900 border-neutral-900 text-white shadow-sm"
                          : "bg-white border-border hover:bg-slate-50 text-neutral-700"
                      }`}
                    >
                      Trimestre
                    </button>
                    <button
                      onClick={() => setPdfPeriod("year")}
                      className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                        pdfPeriod === "year"
                          ? "bg-neutral-900 border-neutral-900 text-white shadow-sm"
                          : "bg-white border-border hover:bg-slate-50 text-neutral-700"
                      }`}
                    >
                      Ano Comercial
                    </button>
                  </div>
                </div>

                {/* Seções a Incluir */}
                <div className="space-y-2.5">
                  <label className="text-xs font-extrabold uppercase text-muted-foreground tracking-wide block">
                    2. Seções para incluir no PDF
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2.5 text-sm text-neutral-800 bg-slate-50 p-2.5 rounded-lg border border-border/40 cursor-pointer hover:bg-slate-100/70 transition-colors">
                      <input
                        type="checkbox"
                        checked={pdfSections.kpis}
                        onChange={(e) =>
                          setPdfSections((p) => ({ ...p, kpis: e.target.checked }))
                        }
                        className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                      />
                      <div className="text-left">
                        <span className="font-bold block text-xs">Resumo Executivo (KPIs)</span>
                        <span className="text-[10px] text-muted-foreground block leading-none">
                          Faturamento, faturamento pendente, ticket médio e volume do pipeline.
                        </span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 text-sm text-neutral-800 bg-slate-50 p-2.5 rounded-lg border border-border/40 cursor-pointer hover:bg-slate-100/70 transition-colors">
                      <input
                        type="checkbox"
                        checked={pdfSections.crm}
                        onChange={(e) =>
                          setPdfSections((p) => ({ ...p, crm: e.target.checked }))
                        }
                        className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                      />
                      <div className="text-left">
                        <span className="font-bold block text-xs">Distribuição do Funil CRM</span>
                        <span className="text-[10px] text-muted-foreground block leading-none">
                          Valores e quantidade de leads retidos por status do funil comercial.
                        </span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 text-sm text-neutral-800 bg-slate-50 p-2.5 rounded-lg border border-border/40 cursor-pointer hover:bg-slate-100/70 transition-colors">
                      <input
                        type="checkbox"
                        checked={pdfSections.channels}
                        onChange={(e) =>
                          setPdfSections((p) => ({ ...p, channels: e.target.checked }))
                        }
                        className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                      />
                      <div className="text-left">
                        <span className="font-bold block text-xs">Rentabilidade por Canal</span>
                        <span className="text-[10px] text-muted-foreground block leading-none">
                          Rankings financeiro dos canais de origem de leads.
                        </span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 text-sm text-neutral-800 bg-slate-50 p-2.5 rounded-lg border border-border/40 cursor-pointer hover:bg-slate-100/70 transition-colors">
                      <input
                        type="checkbox"
                        checked={pdfSections.production}
                        onChange={(e) =>
                          setPdfSections((p) => ({ ...p, production: e.target.checked }))
                        }
                        className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                      />
                      <div className="text-left">
                        <span className="font-bold block text-xs">Estatísticas do Chão de Fábrica</span>
                        <span className="text-[10px] text-muted-foreground block leading-none">
                          Cômodos ativos por fila, preparação técnica e tipologia dos ambientes na linha.
                        </span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 text-sm text-neutral-800 bg-slate-50 p-2.5 rounded-lg border border-border/40 cursor-pointer hover:bg-slate-100/70 transition-colors">
                      <input
                        type="checkbox"
                        checked={pdfSections.partners}
                        onChange={(e) =>
                          setPdfSections((p) => ({ ...p, partners: e.target.checked }))
                        }
                        className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                      />
                      <div className="text-left">
                        <span className="font-bold block text-xs">Ranking de Projetistas Parceiros</span>
                        <span className="text-[10px] text-muted-foreground block leading-none">
                          Faturamento por profissional e valores de comissão estimados.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-150 rounded-lg text-xs text-slate-600 flex gap-2 items-start">
                  <Info className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Respeito à Privacidade:</strong> A exportação de dados reflete o estado atual do <strong>Modo Privado</strong>. Se o modo privado estiver ativo (olho cortado no cabeçalho), os valores confidenciais serão substituídos por valores protegidos.
                  </p>
                </div>
              </div>

              {/* Botão de Geração */}
              <div className="pt-4 shrink-0">
                {isGeneratingPdf ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-primary">
                      <span>Gerando relatório...</span>
                      <span>{pdfProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all duration-300 rounded-full"
                        style={{ width: `${pdfProgress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleGeneratePdf}
                    className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-extrabold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-primary/10 transition-all hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <Download className="h-4.5 w-4.5" />
                    Gerar Relatório em PDF
                  </button>
                )}
              </div>
            </Card>

            {/* Lado Direito: Preview do Relatório Fictício */}
            <div className="lg:col-span-5 flex flex-col justify-center items-center">
              <span className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest mb-3 block self-start lg:self-center">
                Visualização Prévia
              </span>
              <div className="w-full max-w-[280px] aspect-[1/1.414] bg-white border border-slate-200 rounded-lg shadow-xl p-4 flex flex-col justify-between relative overflow-hidden select-none hover:rotate-1 hover:scale-102 transition-all duration-300">
                {/* Linhas da Folha Timbrada Fictícia */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-150 pb-2">
                    <div className="space-y-1">
                      <div className="h-3 w-16 bg-neutral-800 rounded" />
                      <div className="h-1.5 w-24 bg-slate-200 rounded" />
                    </div>
                    <div className="h-2 w-10 bg-slate-200 rounded" />
                  </div>

                  <div className="space-y-2">
                    <div className="h-3 w-32 bg-slate-300 rounded" />
                    <div className="h-1.5 w-40 bg-slate-200 rounded" />
                  </div>

                  {/* Esboço do Gráfico do Funil */}
                  {pdfSections.crm && (
                    <div className="space-y-1.5 bg-slate-50 p-2 rounded border border-slate-100">
                      <div className="h-2.5 w-20 bg-slate-300 rounded mb-1" />
                      <div className="h-1.5 w-full bg-slate-200 rounded-full" />
                      <div className="h-1.5 w-4/5 bg-slate-200 rounded-full" />
                      <div className="h-1.5 w-3/5 bg-slate-200 rounded-full" />
                    </div>
                  )}

                  {/* Esboço dos Canais */}
                  {pdfSections.channels && (
                    <div className="space-y-1.5">
                      <div className="h-2 w-28 bg-slate-300 rounded" />
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-6 bg-slate-250 rounded" />
                        <div className="flex-1 h-2 bg-amber-400 rounded-full" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-6 bg-slate-250 rounded" />
                        <div className="flex-1 h-2 bg-amber-300 rounded-full w-2/3" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-150 pt-2 flex justify-between items-center text-[8px] text-slate-400">
                  <span>Móveis Unghero — BI</span>
                  <span>Pág. 1 / 1</span>
                </div>

                {/* Sombra Dourada Elegante de Fundo */}
                <div className="absolute -right-20 -bottom-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================================= */}
      {/* ─── CANVAS DE IMPRESSÃO (Formatado especificamente para folha A4) ─── */}
      {/* ======================================================================= */}
      <div
        id="print-report-root"
        className="hidden print:block w-[185mm] mx-auto bg-white text-black p-4 font-sans text-xs leading-relaxed"
      >
        {/* Cabeçalho da Móveis Unghero */}
        <div className="flex justify-between items-start border-b border-black pb-4 mb-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">MÓVEIS UNGHERO</h1>
            <p className="text-[10px] text-neutral-500 uppercase font-bold">Relatório Comercial Analítico</p>
          </div>
          <div className="text-right text-[10px] text-neutral-600 space-y-0.5">
            <p className="font-bold text-neutral-900">Módulo BI - Inteligência de Negócio</p>
            <p>Gerado em: {new Date().toLocaleDateString("pt-BR")} às {new Date().toLocaleTimeString("pt-BR")}</p>
            <p>Período: {pdfPeriod === "all" ? "Todo o histórico" : pdfPeriod === "month" ? "Mês Atual" : pdfPeriod === "quarter" ? "Trimestre Comercial" : "Ano Comercial"}</p>
          </div>
        </div>

        {/* 1. KPIs Principais */}
        {pdfSections.kpis && (
          <div className="mb-6 space-y-2">
            <h2 className="text-xs uppercase tracking-wider font-extrabold text-neutral-700 border-b border-neutral-350 pb-1">
              1. Resumo Executivo Financeiro
            </h2>
            <div className="grid grid-cols-4 gap-3">
              <div className="border border-neutral-250 p-2.5 rounded bg-slate-50/50">
                <span className="text-[9px] text-neutral-500 uppercase font-extrabold block">Pipeline Comercial</span>
                <strong className="text-sm font-bold privacy-value block mt-0.5">{formatCurrency(totalPipeline)}</strong>
              </div>
              <div className="border border-neutral-250 p-2.5 rounded bg-slate-50/50">
                <span className="text-[9px] text-neutral-500 uppercase font-extrabold block">Receita Aprovada</span>
                <strong className="text-sm font-bold privacy-value block mt-0.5">{formatCurrency(grossRevenue)}</strong>
              </div>
              <div className="border border-neutral-250 p-2.5 rounded bg-slate-50/50">
                <span className="text-[9px] text-neutral-500 uppercase font-extrabold block">Funil Comercial</span>
                <strong className="text-sm font-bold privacy-value block mt-0.5">{formatCurrency(funnelNegotiationValue)}</strong>
              </div>
              <div className="border border-neutral-250 p-2.5 rounded bg-slate-50/50">
                <span className="text-[9px] text-neutral-500 uppercase font-extrabold block">Ticket Médio Fechado</span>
                <strong className="text-sm font-bold privacy-value block mt-0.5">{formatCurrency(ticketMedio)}</strong>
              </div>
            </div>
          </div>
        )}

        {/* 2. Distribuição do Funil CRM */}
        {pdfSections.crm && (
          <div className="mb-6 space-y-2.5 page-break-inside-avoid">
            <h2 className="text-xs uppercase tracking-wider font-extrabold text-neutral-700 border-b border-neutral-350 pb-1">
              2. Distribuição do Funil CRM
            </h2>
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-neutral-800 text-[10px] font-bold text-neutral-600">
                  <th className="py-1.5 pr-2">Coluna do Kanban</th>
                  <th className="py-1.5 text-center px-2">Projetos</th>
                  <th className="py-1.5 text-right pl-2">Total Estimado</th>
                  <th className="py-1.5 text-right pl-4 w-1/3">Porcentagem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {statusCounts.map((col) => {
                  const percentage = (col.value / maxCRMValue) * 100;
                  return (
                    <tr key={col.id}>
                      <td className="py-1.5 font-bold text-neutral-900">{col.label}</td>
                      <td className="py-1.5 text-center text-neutral-700">{col.count}</td>
                      <td className="py-1.5 text-right font-semibold privacy-value">{formatCurrency(col.value)}</td>
                      <td className="py-1.5 text-right pl-4">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 bg-neutral-100 border border-neutral-200 h-2 rounded overflow-hidden">
                            <div className="bg-neutral-800 h-full" style={{ width: `${percentage}%` }} />
                          </div>
                          <span className="text-[10px] text-neutral-500 font-bold w-8 text-right">
                            {percentage.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. Rentabilidade por Canal */}
        {pdfSections.channels && (
          <div className="mb-6 space-y-2.5 page-break-inside-avoid">
            <h2 className="text-xs uppercase tracking-wider font-extrabold text-neutral-700 border-b border-neutral-350 pb-1">
              3. Rentabilidade por Canal de Origem
            </h2>
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-neutral-800 text-[10px] font-bold text-neutral-600">
                  <th className="py-1.5 pr-2">Canal / Origem</th>
                  <th className="py-1.5 text-center px-2">Leads Gerados</th>
                  <th className="py-1.5 text-right pl-2">Volume Comercial</th>
                  <th className="py-1.5 text-right pl-4 w-1/3">Participação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {originsData.map((orig) => {
                  const pct = (orig.value / maxOriginValue) * 100;
                  return (
                    <tr key={orig.name}>
                      <td className="py-1.5 font-bold text-neutral-900">
                        {ORIGIN_LABELS[orig.name] || orig.name}
                      </td>
                      <td className="py-1.5 text-center text-neutral-700">{orig.count}</td>
                      <td className="py-1.5 text-right font-semibold privacy-value">{formatCurrency(orig.value)}</td>
                      <td className="py-1.5 text-right pl-4">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 bg-neutral-100 border border-neutral-200 h-2 rounded overflow-hidden">
                            <div className="bg-neutral-800 h-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] text-neutral-500 font-bold w-8 text-right">
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="p-2 border border-neutral-350 rounded bg-slate-50 text-[10px] text-neutral-700">
              <strong>Destaque Comercial:</strong> {highlightText}
            </div>
          </div>
        )}

        {/* 4. Estatísticas de Produção (Chão de Fábrica) no PDF */}
        {pdfSections.production && (
          <div className="mb-6 space-y-2.5 page-break-inside-avoid">
            <h2 className="text-xs uppercase tracking-wider font-extrabold text-neutral-700 border-b border-neutral-350 pb-1">
              4. Análise de Produção & Chão de Fábrica
            </h2>
            <div className="grid grid-cols-4 gap-3 mb-3 text-center text-[9px] font-bold text-neutral-700">
              <div className="border border-neutral-200 p-1.5 rounded bg-slate-50/20">Total: {factoryKpis.total} cômodos</div>
              <div className="border border-neutral-200 p-1.5 rounded bg-slate-50/20">Em corte: {factoryKpis.emCorte}</div>
              <div className="border border-neutral-200 p-1.5 rounded bg-slate-50/20">Em montagem: {factoryKpis.emMontagem}</div>
              <div className="border border-neutral-200 p-1.5 rounded bg-slate-50/20">Pronto expedição: {factoryKpis.prontoEntrega}</div>
            </div>
            
            <table className="w-full text-left border-collapse text-[10px]">
              <thead>
                <tr className="border-b border-neutral-800 font-bold text-neutral-600">
                  <th className="py-1.5 pr-2">Etapa Operacional</th>
                  <th className="py-1.5 text-center px-2">Cômodos Ativos</th>
                  <th className="py-1.5 text-right pl-4 w-1/3">Porcentagem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {COLUMNS_FACTORY.map((col) => {
                  const count = activeEnvironments.filter((e) => e.status === col.id).length;
                  const total = activeEnvironments.length || 1;
                  const pct = (count / total) * 100;
                  return (
                    <tr key={col.id}>
                      <td className="py-1.5 font-bold text-neutral-900">{col.label}</td>
                      <td className="py-1.5 text-center text-neutral-700">{count}</td>
                      <td className="py-1.5 text-right pl-4">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 bg-neutral-100 border border-neutral-200 h-2 rounded overflow-hidden">
                            <div className="bg-neutral-800 h-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] text-neutral-500 font-bold w-8 text-right">
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. Ranking de Projetistas */}
        {pdfSections.partners && (
          <div className="mb-6 space-y-2.5 page-break-inside-avoid">
            <h2 className="text-xs uppercase tracking-wider font-extrabold text-neutral-700 border-b border-neutral-350 pb-1">
              5. Ranking de Parceiros & Profissionais
            </h2>
            {/* Resumo Superior com suporte a privacidade */}
            <div className="grid grid-cols-3 gap-3 mb-3 border border-neutral-250 p-2 rounded bg-slate-50/20 text-[9px] font-bold text-neutral-700">
              <div>Total de Parceiros: {partnersStats.activeCount}</div>
              <div>Faturamento Parcerias: <span className="privacy-value">{formatCurrency(partnersStats.faturamentoTotal)}</span></div>
              <div>Comissões Estimadas: <span className="privacy-value">{formatCurrency(partnersStats.comissaoTotal)}</span></div>
            </div>
            <table className="w-full text-left border-collapse text-[10px]">
              <thead>
                <tr className="border-b border-neutral-850 font-bold text-neutral-650">
                  <th className="py-1.5 pr-2">Nome do Profissional</th>
                  <th className="py-1.5 px-2">Categoria</th>
                  <th className="py-1.5 px-2">Cidade / Região</th>
                  <th className="py-1.5 text-center px-2">Projetos</th>
                  <th className="py-1.5 text-right pl-2">Faturamento Bruto</th>
                  <th className="py-1.5 text-right pl-2">Comissão (5%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {designerRanking.map((des) => (
                  <tr key={des.name}>
                    <td className="py-1.5 font-bold text-neutral-900">{des.name}</td>
                    <td className="py-1.5 px-2 text-neutral-700">{PARTNER_TYPE_LABELS[des.tipo] || des.tipo}</td>
                    <td className="py-1.5 px-2 text-neutral-600 uppercase tracking-wider">{des.city}</td>
                    <td className="py-1.5 text-center text-neutral-750 font-semibold">{des.count}</td>
                    <td className="py-1.5 text-right font-bold text-neutral-950 privacy-value">
                      {formatCurrency(des.totalSold)}
                    </td>
                    <td className="py-1.5 text-right font-bold text-emerald-700 privacy-value">
                      {formatCurrency(des.comission)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Termo de Confidencialidade / Rodapé */}
        <div className="mt-12 pt-4 border-t border-neutral-450 flex justify-between items-center text-[9px] text-neutral-500">
          <span>Este documento contém informações estratégicas e confidenciais da Móveis Unghero LTDA.</span>
          <span>Página 1 de 1</span>
        </div>
      </div>
    </div>
  );
}
