"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import { SegmentControl } from "@/components/ui/segment-control";
import { 
  TrendingUp, 
  DollarSign, 
  Award, 
  PieChart, 
  Percent, 
  Users, 
  MapPin 
} from "lucide-react";

interface Project {
  id: string;
  valor_previsto: number;
  status_geral: string;
  client: {
    id: string;
    nome: string;
    cidade: string;
    origem: string;
    telefone: string;
    email: string;
  };
}

interface BiClientProps {
  initialProjects: Project[];
}

const COLUMNS_CRM = [
  { id: "LEAD", label: "Leads", color: "from-amber-500 to-amber-600" },
  { id: "ORCAMENTO", label: "Orçamentos", color: "from-orange-500 to-orange-600" },
  { id: "NEGOCIACAO", label: "Negociação", color: "from-blue-500 to-blue-600" },
  { id: "CONFERENCIA_TECNICA", label: "Conf. Técnica", color: "from-purple-500 to-purple-600" },
  { id: "APROVADO", label: "Aprovados", color: "from-emerald-500 to-emerald-600" },
  { id: "PRODUCAO", label: "Produção", color: "from-cyan-500 to-cyan-600" },
  { id: "INSTALACAO", label: "Instalação", color: "from-indigo-500 to-indigo-600" },
  { id: "FINALIZADO", label: "Finalizados", color: "from-slate-500 to-slate-600" }
];

export default function BiClient({ initialProjects }: BiClientProps) {
  const [filterPeriod, setFilterPeriod] = useState<"30" | "90" | "365">("90");

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(val);
  };

  // 1. Cálculos de CRM e Funil
  const totalPipeline = initialProjects.reduce((acc, p) => acc + p.valor_previsto, 0);
  const statusCounts = COLUMNS_CRM.map(col => {
    const list = initialProjects.filter(p => p.status_geral === col.id);
    const sum = list.reduce((acc, p) => acc + p.valor_previsto, 0);
    return {
      id: col.id,
      label: col.label,
      count: list.length,
      value: sum,
      color: col.color
    };
  });

  const maxCRMValue = Math.max(...statusCounts.map(s => s.value), 1);

  // 2. Receitas vs Custos (Margem de marcenaria de luxo)
  // Projetos aprovados, em produção, instalação ou finalizados representam faturamento real
  const activeClosedProjects = initialProjects.filter(p => 
    ["APROVADO", "PRODUCAO", "INSTALACAO", "FINALIZADO"].includes(p.status_geral)
  );
  
  const grossRevenue = activeClosedProjects.reduce((acc, p) => acc + p.valor_previsto, 0);
  // O custo estimado de materiais de alta tecnologia em marcenaria fina gira em torno de 38%
  const estimatedMaterialCost = grossRevenue * 0.38;
  // Custos fixos e mão de obra em torno de 22%
  const estimatedLabourCost = grossRevenue * 0.22;
  const netProfit = grossRevenue - estimatedMaterialCost - estimatedLabourCost;
  const profitMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

  // 3. Origens de Leads Rentáveis
  const originsData = ["INSTAGRAM", "INDICACAO", "SITE", "GOOGLE", "WHATSAPP"].map(orig => {
    const list = initialProjects.filter(p => p.client.origem === orig);
    const sum = list.reduce((acc, p) => acc + p.valor_previsto, 0);
    return {
      name: orig,
      count: list.length,
      value: sum
    };
  }).sort((a, b) => b.value - a.value);

  const maxOriginValue = Math.max(...originsData.map(o => o.value), 1);

  // 4. Ranking de Projetistas e Comissões
  // Mock de projetistas parceiros
  const designers = [
    { name: "Patricia Albuquerque (Farroupilha)", city: "Farroupilha", salesIds: ["proj-2", "proj-5"] },
    { name: "Gustavo Lemos (Caxias)", city: "Caxias do Sul", salesIds: ["proj-1", "proj-6", "proj-8"] },
    { name: "Fernanda Castoldi (Bento)", city: "Bento Gonçalves", salesIds: ["proj-3", "proj-4", "proj-7"] }
  ];

  const designerRanking = designers.map(des => {
    const list = initialProjects.filter(p => des.salesIds.includes(p.id));
    const totalSold = list.reduce((acc, p) => acc + p.valor_previsto, 0);
    // Comissão da Unghero para parceiros especificadores é de 5% sobre projetos vendidos
    const comission = totalSold * 0.05;
    return {
      name: des.name,
      city: des.city,
      count: list.length,
      totalSold,
      comission
    };
  }).sort((a, b) => b.totalSold - a.totalSold);

  return (
    <div className="space-y-[var(--space-6)] pb-[var(--space-8)]">
      <div className="overflow-x-auto -mx-[var(--space-1)] px-[var(--space-1)]">
        <SegmentControl
          value={filterPeriod}
          onChange={setFilterPeriod}
          aria-label="Período do relatório"
          className="min-w-max"
          options={[
            { value: "30", label: "30 dias" },
            { value: "90", label: "90 dias" },
            { value: "365", label: "Este ano" },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[var(--space-3)]">
        <KpiCard
          label="Pipeline de vendas"
          value={<span className="privacy-value">{formatCurrency(totalPipeline)}</span>}
          icon={TrendingUp}
          accent="primary"
          trend={{ value: "+14,2% este mês", positive: true }}
        />
        <KpiCard
          label="Receita aprovada"
          value={<span className="privacy-value">{formatCurrency(grossRevenue)}</span>}
          icon={DollarSign}
          accent="success"
          trend={{ value: "+8,7% vs meta", positive: true }}
        />
        <KpiCard
          label="Custo insumos (est.)"
          value={<span className="privacy-value">{formatCurrency(estimatedMaterialCost)}</span>}
          icon={Percent}
          accent="info"
          trend={{ value: "MDF e ferragens" }}
        />
        <KpiCard
          label="Lucro líquido (est.)"
          value={<span className="privacy-value">{formatCurrency(netProfit)}</span>}
          icon={Award}
          accent="warning"
          trend={{ value: `Margem ${profitMargin.toFixed(1)}%`, positive: profitMargin > 0 }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--space-4)]">
        <Card className="p-[var(--space-4)] space-y-[var(--space-4)]">
          <div>
            <h3 className="text-headline text-foreground">
              Distribuição do funil CRM
            </h3>
            <p className="text-caption text-muted-foreground mt-1">
              Total financeiro retido em cada coluna operacional do Kanban.
            </p>
          </div>

          <div className="space-y-3.5">
            {statusCounts.map((col) => {
              const percentage = (col.value / maxCRMValue) * 100;
              return (
                <div key={col.id} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-neutral-800">
                    <span>{col.label} ({col.count} {col.count === 1 ? "projeto" : "projetos"})</span>
                    <span className="privacy-value">{formatCurrency(col.value)}</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
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

        {/* Gráfico 2: Origem dos Leads e Atração Comercial */}
        <Card className="p-[var(--space-4)] space-y-[var(--space-4)] flex flex-col justify-between">
          <div>
            <h3 className="text-headline text-foreground">
              Rentabilidade por canal
            </h3>
            <p className="text-caption text-muted-foreground mt-1">
              Quais canais trazem projetos de maior valor bruto de fechamento.
            </p>
          </div>

          <div className="space-y-5 my-auto py-4">
            {originsData.map((orig) => {
              const pct = (orig.value / maxOriginValue) * 100;
              return (
                <div key={orig.name} className="flex items-center gap-4">
                  <span className="w-24 text-xs font-extrabold text-muted-foreground text-right tracking-wider block uppercase">
                    {orig.name}
                  </span>
                  <div className="flex-1 space-y-1">
                    <div className="w-full h-4 bg-slate-100 rounded-lg overflow-hidden relative">
                      <div 
                        className="h-full rounded-lg bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-1000" 
                        style={{ width: `${Math.max(2, pct)}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-32 text-right">
                    <strong className="text-xs font-bold text-neutral-800 block privacy-value">
                      {formatCurrency(orig.value)}
                    </strong>
                    <span className="text-[10px] text-muted-foreground block font-medium">
                      {orig.count} {orig.count === 1 ? "lead" : "leads"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-3">
            <PieChart className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <strong className="text-amber-800 font-bold block mb-0.5">Destaque Comercial:</strong>
              <p className="text-amber-700/80 leading-relaxed font-medium">
                Os leads via <span className="font-bold text-amber-800">Indicação de Clientes e Instagram</span> são responsáveis por 70% do nosso faturamento, com ticket médio superior a R$ 80.000,00 por projeto.
              </p>
            </div>
          </div>
        </Card>

      </div>

      {/* Ranking de Projetistas & Comissões */}
      <Card className="p-[var(--space-4)] space-y-[var(--space-4)]">
        <div>
          <h3 className="text-headline text-foreground">
            Projetistas parceiros
          </h3>
          <p className="text-caption text-muted-foreground mt-1">
            Especificações ativas e comissão contratual (5%).
          </p>
        </div>

        {/* Mobile: cards */}
        <div className="md:hidden space-y-[var(--space-3)]">
          {designerRanking.map((des, index) => (
            <div key={index} className="surface-compact p-[var(--space-3)] space-y-[var(--space-2)]">
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
              <div className="grid grid-cols-3 gap-[var(--space-2)] text-center">
                <div>
                  <p className="text-label text-muted-foreground">Projetos</p>
                  <p className="text-title font-bold">{des.count}</p>
                </div>
                <div>
                  <p className="text-label text-muted-foreground">Faturamento</p>
                  <p className="text-caption font-bold privacy-value">{formatCurrency(des.totalSold)}</p>
                </div>
                <div>
                  <p className="text-label text-muted-foreground">Comissão</p>
                  <p className="text-caption font-bold text-[hsl(var(--success))] privacy-value">{formatCurrency(des.comission)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-border/40 text-muted-foreground text-xs uppercase font-bold bg-slate-50">
                <th className="p-3">Nome do Profissional</th>
                <th className="p-3">Cidade / Região</th>
                <th className="p-3 text-center">Projetos Ativos</th>
                <th className="p-3 text-right">Faturamento Total</th>
                <th className="p-3 text-right">Comissão a Pagar (5%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 text-neutral-700">
              {designerRanking.map((des, index) => (
                <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 border border-primary/20">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <strong className="text-neutral-900 text-sm font-semibold">{des.name}</strong>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      {des.city}
                    </div>
                  </td>
                  <td className="p-3 text-center font-bold text-neutral-800">
                    {des.count}
                  </td>
                  <td className="p-3 text-right font-bold text-neutral-900 privacy-value">
                    {formatCurrency(des.totalSold)}
                  </td>
                  <td className="p-3 text-right">
                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-xs privacy-value">
                      {formatCurrency(des.comission)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  );
}
