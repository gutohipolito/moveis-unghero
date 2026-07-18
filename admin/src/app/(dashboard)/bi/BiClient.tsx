"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import { getBiLiveSnapshot } from "@/app/actions/liveSnapshots";
import { useLiveEntity } from "@/context/LiveSyncContext";
import { toISODateBR } from "@/lib/brazilDate";
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
  ArrowRight,
  Target,
  Percent,
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

interface BiClientProps {
  initialProjects: Project[];
  initialQuotes: BiQuoteSummary[];
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

export default function BiClient({
  initialProjects,
  initialQuotes,
  companyId,
}: BiClientProps) {
  const [projects, setProjects] = useState(initialProjects);
  const [quotes, setQuotes] = useState(initialQuotes);

  // Estados de navegação e busca
  const [activeTab, setActiveTab] = useState<"geral" | "funil_orcamentos" | "parceiros" | "exportar">("geral");
  const [searchTerm, setSearchTerm] = useState("");

  // Estados de Configuração da Exportação PDF
  const [pdfPeriod, setPdfPeriod] = useState<"all" | "month" | "quarter" | "year">("all");
  const [pdfSections, setPdfSections] = useState({
    kpis: true,
    crm: true,
    channels: true,
    partners: true,
  });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);

  const syncBi = useCallback(async () => {
    const result = await getBiLiveSnapshot(companyId);
    if (result.success) {
      if (result.projects) setProjects(result.projects);
      if (result.quotes) setQuotes(result.quotes);
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

  const designerRanking = useMemo(() => {
    const byPartner = new Map<
      string,
      {
        name: string;
        city: string;
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

  // Filtragem de parceiros para pesquisa
  const filteredDesignerRanking = useMemo(() => {
    if (!searchTerm.trim()) return designerRanking;
    const term = searchTerm.toLowerCase();
    return designerRanking.filter(
      (des) =>
        des.name.toLowerCase().includes(term) ||
        des.city.toLowerCase().includes(term)
    );
  }, [designerRanking, searchTerm]);

  let highlightText =
    "Nenhum projeto foi aprovado ou finalizado ainda para calcular os destaques comerciais e ticket médio reais do faturamento da fábrica.";

  if (activeClosedProjects.length > 0 && grossRevenue > 0) {
    const originRevenues: Record<string, number> = {};
    activeClosedProjects.forEach((p) => {
      const orig = p.client.origem;
      originRevenues[orig] = (originRevenues[orig] || 0) + p.valor_previsto;
    });

    const sortedOrigins = Object.entries(originRevenues)
      .map(([name, val]) => ({ name, val }))
      .sort((a, b) => b.val - a.val);

    if (sortedOrigins.length > 0) {
      const mainOrigin = sortedOrigins[0];
      const pct = (mainOrigin.val / grossRevenue) * 100;
      const originLabel = ORIGIN_LABELS[mainOrigin.name] || mainOrigin.name;
      highlightText = `Os leads via ${originLabel} são responsáveis por ${pct.toFixed(0)}% da receita aprovada, com ticket médio real de ${formatCurrency(ticketMedio)} por projeto fechado.`;
    }
  }

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

  // 3. Alertas e Oportunidades Comerciais
  const commercialAlerts = useMemo(() => {
    const list: Array<{ id: string; type: "warning" | "success" | "info"; title: string; desc: string }> = [];

    // Alerta 1: Orçamentos Ativos (oportunidade de fechamento)
    const activeVal = quotesHealth.active.value;
    const activeQtd = quotesHealth.active.qtd;
    if (activeQtd > 0) {
      list.push({
        id: "alert-active",
        type: "success",
        title: "Acompanhamento Comercial Pendente",
        desc: `Temos ${activeQtd} proposta(s) ativa(s) aguardando retorno dos clientes, representando ${formatCurrency(activeVal)} no mercado. Faça follow-up hoje mesmo.`
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
        desc: `Há ${negocQtd} projeto(s) na etapa de Negociação acumulando ${formatCurrency(negocVal)}. Priorize a renegociação destes leads com os projetistas.`
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
        desc: `Existem ${expiredQtd} orçamento(s) vencido(s) que somam ${formatCurrency(expiredVal)}. Vale estruturar uma campanha de desconto ou resgate técnico.`
      });
    }

    return list;
  }, [quotesHealth, negotiationValue, negotiationProjects]);

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
            onClick={() => setActiveTab("parceiros")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
              activeTab === "parceiros"
                ? "bg-primary/10 text-primary border border-primary/20 shadow-xs"
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
                      <span>Total: R$ {formatCurrency(quotesHealth.totalVal)}</span>
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
                        <p className="text-[11px] leading-relaxed text-neutral-600/90 font-medium">
                          {alert.desc}
                        </p>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "parceiros" && (
          <div className="space-y-4 animate-in fade-in-50 duration-200 flex flex-col h-full">
            {/* Barra de Pesquisa e Cabeçalho */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between sm:items-center bg-slate-50 p-3 rounded-xl border border-border/40 shrink-0">
              <div className="space-y-0.5">
                <h3 className="text-title text-foreground flex items-center gap-1.5">
                  <Users className="h-4.5 w-4.5 text-primary" />
                  Ranking de Projetistas
                </h3>
                <p className="text-caption text-muted-foreground">
                  Comissão estimada de 5% sobre faturamento de parceiros vinculados.
                </p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Pesquisar projetista ou cidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white pl-9 pr-4 py-2 text-sm rounded-lg border border-border focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary transition-all shadow-xs"
                />
              </div>
            </div>

            {/* Listagem Mobile */}
            <div className="md:hidden space-y-[var(--space-3)] overflow-y-auto max-h-[350px] pr-1">
              {filteredDesignerRanking.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground bg-slate-50/50 border border-dashed rounded-xl">
                  Nenhum parceiro encontrado para "{searchTerm}".
                </div>
              ) : (
                filteredDesignerRanking.map((des) => (
                  <div key={des.name} className="surface-compact p-[var(--space-3)] space-y-[var(--space-2)]">
                    <div className="flex items-center gap-[var(--space-3)]">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 border border-primary/15">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-title text-sm font-semibold truncate">{des.name}</p>
                        <p className="text-caption text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {des.city}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-[var(--space-2)] text-center border-t border-slate-100 pt-2">
                      <div>
                        <p className="text-label text-[10px] text-muted-foreground">Projetos</p>
                        <p className="text-sm font-bold text-neutral-800">{des.count}</p>
                      </div>
                      <div>
                        <p className="text-label text-[10px] text-muted-foreground">Faturamento</p>
                        <p className="text-xs font-bold text-neutral-900 privacy-value">
                          {formatCurrency(des.totalSold)}
                        </p>
                      </div>
                      <div>
                        <p className="text-label text-[10px] text-muted-foreground">Comissão</p>
                        <p className="text-xs font-bold text-emerald-600 privacy-value">
                          {formatCurrency(des.comission)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Listagem Desktop */}
            <div className="hidden md:block flex-1 min-h-[300px] max-h-[380px] overflow-y-auto border border-border/40 rounded-xl bg-white shadow-xs">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/40 text-muted-foreground text-xs uppercase font-bold bg-slate-50 sticky top-0 z-15 shadow-2xs">
                    <th className="p-3">Nome do Profissional</th>
                    <th className="p-3">Cidade / Região</th>
                    <th className="p-3 text-center">Projetos vinculados</th>
                    <th className="p-3 text-right">Valor dos projetos</th>
                    <th className="p-3 text-right">Comissão (5%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 text-neutral-700">
                  {filteredDesignerRanking.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-sm text-muted-foreground">
                        Nenhum parceiro encontrado para "{searchTerm}".
                      </td>
                    </tr>
                  ) : (
                    filteredDesignerRanking.map((des) => (
                      <tr key={des.name} className="hover:bg-slate-50/40 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 border border-primary/20">
                              <Users className="h-4 w-4 text-primary" />
                            </div>
                            <strong className="text-neutral-900 text-sm font-semibold">{des.name}</strong>
                          </div>
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {filteredDesignerRanking.length > 0 && (
              <p className="text-[10px] text-muted-foreground text-right shrink-0 mt-1">
                Exibindo {filteredDesignerRanking.length} parceiro(s) do ranking.
              </p>
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
            <div className="p-2 border border-neutral-300 rounded bg-slate-50 text-[10px] text-neutral-700">
              <strong>Destaque Comercial:</strong> {highlightText}
            </div>
          </div>
        )}

        {/* 4. Ranking de Projetistas */}
        {pdfSections.partners && (
          <div className="mb-6 space-y-2.5 page-break-inside-avoid">
            <h2 className="text-xs uppercase tracking-wider font-extrabold text-neutral-700 border-b border-neutral-350 pb-1">
              4. Ranking de Parceiros & Profissionais
            </h2>
            <table className="w-full text-left border-collapse text-[10px]">
              <thead>
                <tr className="border-b border-neutral-800 font-bold text-neutral-600">
                  <th className="py-1.5 pr-2">Nome do Profissional</th>
                  <th className="py-1.5 px-2">Cidade / Região</th>
                  <th className="py-1.5 text-center px-2">Projetos</th>
                  <th className="py-1.5 text-right pl-2">Faturamento Bruto</th>
                  <th className="py-1.5 text-right pl-2">Comissão Estimada (5%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {designerRanking.map((des) => (
                  <tr key={des.name}>
                    <td className="py-1.5 font-bold text-neutral-900">{des.name}</td>
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
        <div className="mt-12 pt-4 border-t border-neutral-400 flex justify-between items-center text-[9px] text-neutral-500">
          <span>Este documento contém informações estratégicas e confidenciais da Móveis Unghero LTDA.</span>
          <span>Página 1 de 1</span>
        </div>
      </div>
    </div>
  );
}
