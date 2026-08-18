"use client";

import React, { useState } from "react";
import { logoutCliente } from "@/app/actions/cliente";
import type { ClientPortalData } from "@/lib/clientPortal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  LogOut, 
  MapPin, 
  Layers, 
  Clock, 
  FileText, 
  CheckCircle2, 
  Download, 
  Eye, 
  DollarSign,
  TrendingUp,
  Smile
} from "lucide-react";

interface TimelineEvent {
  id: string;
  acao: string;
  data: string;
  autor?: string;
}

interface ClienteDashboardClientProps {
  client: ClientPortalData;
  isMock: boolean;
}

const PROJECT_STEPS = [
  { id: "LEAD", label: "Briefing", desc: "Coleta de necessidades iniciais e referências do seu espaço." },
  { id: "ORCAMENTO", label: "Orçamento", desc: "Elaboração de custos e propostas iniciais do mobiliário." },
  { id: "NEGOCIACAO", label: "Negociação", desc: "Ajustes de formas de pagamento e fechamento da proposta." },
  { id: "CONFERENCIA_TECNICA", label: "Detalhamento", desc: "Vistoria técnica, medição milimétrica no local e desenhos." },
  { id: "APROVADO", label: "Aprovado", desc: "Sinal verde técnico! Memorial descritivo assinado pelas partes." },
  { id: "PRODUCAO", label: "Fábrica", desc: "Seus móveis estão sendo cortados e usinados em nossa fábrica." },
  { id: "INSTALACAO", label: "Montagem", desc: "Etapa de montagem física dos módulos em sua residência." },
  { id: "FINALIZADO", label: "Entregue", desc: "Móveis montados, limpos e revisados. Seu sonho concluído!" }
];

const ENVIRONMENT_FABRIC_STEPS = [
  { id: "AGUARDANDO_MEDICAO", label: "Medição", progress: 10 },
  { id: "EM_DETALHAMENTO", label: "Detalhamento", progress: 25 },
  { id: "PRONTO_PRODUCAO", label: "Fila Produção", progress: 45 },
  { id: "EM_CORTE", label: "Corte / Usinagem", progress: 60 },
  { id: "MONTAGEM_FABRICA", label: "Pré-Montagem", progress: 75 },
  { id: "PRONTO_ENTREGA", label: "Expedição", progress: 85 },
  { id: "EM_INSTALACAO", label: "Montagem Local", progress: 95 },
  { id: "FINALIZADO", label: "Concluído", progress: 100 }
];

const ENVIRONMENT_ICONS: Record<string, string> = {
  COZINHA: "🍳",
  CLOSET: "👔",
  DORMITORIO: "🛏️",
  BANHEIRO: "🚿",
  OUTROS: "🪵"
};

export default function ClienteDashboardClient({ client, isMock }: ClienteDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<"progress" | "environments" | "files" | "finances">("progress");
  const project = client.project;

  // Logout Handler
  const handleLogout = async () => {
    await logoutCliente();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

  // Encontra a etapa atual do projeto
  const currentStepIndex = project 
    ? PROJECT_STEPS.findIndex(step => step.id === project.status_geral)
    : -1;

  const currentStep = currentStepIndex !== -1 ? PROJECT_STEPS[currentStepIndex] : null;

  return (
    <div className="min-h-screen bg-[#120e0c] text-[#f5efe6] font-sans relative overflow-x-hidden">
      
      {/* Background radial soft gold glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-amber-500/3 blur-[120px] pointer-events-none" />

      {/* Header Fino */}
      <header className="border-b border-[#2d241f] bg-black/30 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex p-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary">
              <LayoutDashboard className="h-4.5 w-4.5" />
            </span>
            <span className="text-sm font-extrabold tracking-widest text-foreground uppercase">
              MÓVEIS UNGHERO
            </span>
          </div>

          <div className="flex items-center gap-4">
            {isMock && (
              <span className="text-[9px] bg-amber-500/15 text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                Simulador
              </span>
            )}
            <button 
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-[#b8a090] hover:text-destructive transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Corpo do Dashboard */}
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        
        {/* Banner de Acolhimento */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#211915] border border-[#302621]/80 rounded-2xl p-6 md:p-8 shadow-xl">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
              <Smile className="h-4 w-4" /> Bem-vindo ao seu espaço
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-foreground">
              Olá, {client.nome}!
            </h2>
            <p className="text-xs md:text-sm text-[#b8a090] leading-relaxed max-w-xl">
              Aqui você acompanha o progresso da confecção dos seus móveis sob medida, o cronograma técnico de instalação e visualiza seus documentos contratuais.
            </p>
          </div>
          <div className="shrink-0 flex flex-col md:items-end text-xs text-[#b8a090]">
            <span className="font-semibold text-foreground">Projeto ID: {project?.id || "N/A"}</span>
            <span className="mt-1 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-primary" /> {client.cidade} / RS
            </span>
          </div>
        </div>

        {/* Abas de Navegação Centralizadas */}
        <div className="flex border-b border-[#2d241f] gap-6 text-sm font-semibold overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab("progress")}
            className={`pb-3 border-b-2 px-1 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "progress" ? "border-primary text-primary" : "border-transparent text-[#b8a090] hover:text-foreground"
            }`}
          >
            Progresso do Sonho
          </button>
          <button
            onClick={() => setActiveTab("environments")}
            className={`pb-3 border-b-2 px-1 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "environments" ? "border-primary text-primary" : "border-transparent text-[#b8a090] hover:text-foreground"
            }`}
          >
            Fases dos Cômodos ({project?.environments.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("files")}
            className={`pb-3 border-b-2 px-1 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "files" ? "border-primary text-primary" : "border-transparent text-[#b8a090] hover:text-foreground"
            }`}
          >
            Renders & Documentos
          </button>
          <button
            onClick={() => setActiveTab("finances")}
            className={`pb-3 border-b-2 px-1 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "finances" ? "border-primary text-primary" : "border-transparent text-[#b8a090] hover:text-foreground"
            }`}
          >
            Financeiro
          </button>
        </div>

        {/* ================= ABA 1: PROGRESSO DO SONHO ================= */}
        {activeTab === "progress" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-300">
            {!project ? (
              <div className="lg:col-span-12">
                <Card className="p-8 bg-card/20 border-[#2d241f] text-center space-y-3">
                  <h3 className="text-base font-bold text-foreground">
                    Seu projeto está sendo preparado
                  </h3>
                  <p className="text-sm text-[#b8a090] max-w-lg mx-auto leading-relaxed">
                    Nossa equipe comercial está organizando as informações do seu atendimento.
                    Em breve você verá aqui o progresso, renders e o cronograma financeiro.
                  </p>
                </Card>
              </div>
            ) : (
            <>
            {/* Bloco de Progresso Linear */}
            <div className="lg:col-span-8 space-y-6">
              <Card className="p-6 bg-card/20 border-[#2d241f]">
                <h3 className="text-base font-bold mb-6 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" /> Estágio Geral do Projeto
                </h3>

                {/* Linha de Progresso Visual */}
                <div className="relative flex items-center justify-between w-full mb-8 pt-4">
                  {/* Linha de fundo */}
                  <div className="absolute left-0 right-0 h-0.5 bg-[#2d241f] top-1/2 -translate-y-1/2 -z-10" />
                  {/* Linha preenchida de progresso */}
                  <div 
                    className="absolute left-0 h-0.5 bg-primary top-1/2 -translate-y-1/2 -z-10 transition-all duration-500" 
                    style={{ width: `${(currentStepIndex / (PROJECT_STEPS.length - 1)) * 100}%` }}
                  />

                  {PROJECT_STEPS.map((step, idx) => {
                    const isPassed = idx < currentStepIndex;
                    const isCurrent = idx === currentStepIndex;
                    return (
                      <div key={step.id} className="flex flex-col items-center relative group">
                        <div className={`h-5 w-5 rounded-full flex items-center justify-center border font-bold text-[9px] transition-all duration-300 ${
                          isPassed 
                            ? "bg-primary border-primary text-neutral-900 shadow-md shadow-primary/20"
                            : isCurrent
                              ? "bg-[#1c1410] border-primary text-primary scale-110 shadow-lg shadow-primary/10 ring-4 ring-primary/20"
                              : "bg-[#1c1410] border-[#2d241f] text-muted-foreground"
                        }`}>
                          {isPassed ? "✓" : idx + 1}
                        </div>
                        <span className={`text-[10px] font-bold mt-2.5 absolute top-5 whitespace-nowrap transition-colors ${
                          isCurrent ? "text-primary font-black" : "text-[#b8a090]"
                        }`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Descrição Detalhada da Etapa Atual */}
                {currentStep && (
                  <div className="p-5 rounded-xl border border-primary/20 bg-primary/5 mt-8 space-y-2">
                    <strong className="text-sm font-bold text-primary block">
                      Fase Atual: {currentStep.label}
                    </strong>
                    <p className="text-xs text-neutral-300 leading-relaxed">
                      {currentStep.desc}
                    </p>
                  </div>
                )}
              </Card>

              {/* Renders Destaque do Cliente */}
              {project && project.files.filter(f => f.tipo === "RENDER").length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-[#b8a090] uppercase tracking-wider">Seu Futuro Lar (Projetos 3D)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {project.files.filter(f => f.tipo === "RENDER").slice(0, 2).map(file => (
                      <Card key={file.id} className="relative overflow-hidden rounded-xl border-[#2d241f] bg-black/35 group h-56">
                        <img 
                          src={file.url} 
                          alt={file.nome_arquivo}
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-103 transition-all duration-500" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 flex flex-col justify-end">
                          <strong className="text-xs font-bold text-white block">{file.nome_arquivo}</strong>
                          <span className="text-[10px] text-muted-foreground block mt-0.5">Render 3D Aprovado</span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Coluna Direita: Timeline Pública de Notas */}
            <div className="lg:col-span-4 space-y-6">
              <Card className="p-5 bg-card/20 border-[#2d241f] min-h-[350px]">
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2 border-b border-[#2d241f] pb-2">
                  <Clock className="h-4 w-4 text-primary" /> Diário de Bordo do Sonho
                </h3>

                <div className="relative border-l border-[#2d241f] ml-2 pl-4 space-y-6 py-2">
                  {!project || project.timeline.length === 0 ? (
                    <div className="text-xs text-muted-foreground py-6">
                      A marcenaria iniciará os registros de timeline em breve. Fique atento!
                    </div>
                  ) : (
                    project.timeline.map((event) => (
                      <div key={event.id} className="relative">
                        <span className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-full bg-[#1c1410] border border-[#2d241f] flex items-center justify-center">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        </span>
                        
                        <div className="space-y-1">
                          <span className="text-[10px] text-muted-foreground block font-semibold">
                            {new Date(event.data).toLocaleDateString("pt-BR")}
                          </span>
                          <p className="text-xs text-neutral-300 leading-relaxed pr-2">
                            {event.acao}
                          </p>
                          {event.autor && (
                            <span className="text-[10px] text-primary/80 font-semibold">
                              {event.autor}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
            </>
            )}
          </div>
        )}

        {/* ================= ABA 2: FASES DOS CÔMODOS ================= */}
        {activeTab === "environments" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="border-[#2d241f] bg-black/10 p-4 border rounded-xl flex items-center gap-3">
              <Layers className="h-5 w-5 text-primary" />
              <p className="text-xs text-[#b8a090] leading-normal">
                Na Móveis Unghero, fabricamos seus móveis por cômodo para otimizar a montagem. Abaixo você vê o progresso exato de cada ambiente de sua casa na fábrica:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {!project || project.environments.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground col-span-2">
                  Nenhum cômodo cadastrado para este projeto.
                </div>
              ) : (
                project.environments.map((env) => {
                  const stepConfig = ENVIRONMENT_FABRIC_STEPS.find(s => s.id === env.status) || ENVIRONMENT_FABRIC_STEPS[0];
                  
                  return (
                    <Card key={env.id} className="p-5 bg-card/25 border-[#2d241f] hover:border-[#3d302a] transition-all flex flex-col justify-between h-44">
                      <div className="flex items-start justify-between border-b border-border/10 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{ENVIRONMENT_ICONS[env.tipo] || "🪵"}</span>
                          <h4 className="font-extrabold text-sm text-foreground">{env.nome}</h4>
                        </div>
                        <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded uppercase tracking-wider">
                          {stepConfig.label}
                        </span>
                      </div>

                      {/* Barra de Progresso do Ambiente */}
                      <div className="space-y-2 flex-1 mt-4">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                          <span>Progresso da Fabricação</span>
                          <span className="text-foreground">{stepConfig.progress}%</span>
                        </div>
                        
                        <div className="w-full bg-[#2d241f] h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-primary to-amber-500 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${stepConfig.progress}%` }}
                          />
                        </div>
                        
                        <p className="text-[9px] text-[#b8a090] leading-none mt-1">
                          Estágio: <strong>{stepConfig.label}</strong>
                        </p>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ================= ABA 3: RENDERS & DOCUMENTOS ================= */}
        {activeTab === "files" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* Galeria de Renders */}
            {project && project.files.filter(f => f.tipo === "RENDER").length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[#b8a090] uppercase tracking-wider">Renders 3D Aprovados</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {project.files.filter(f => f.tipo === "RENDER").map((file) => (
                    <Card key={file.id} className="relative overflow-hidden rounded-xl border-[#2d241f] bg-black/35 group h-52">
                      <img 
                        src={file.url} 
                        alt={file.nome_arquivo} 
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-103 transition-all duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <strong className="text-xs font-bold text-white block">{file.nome_arquivo}</strong>
                        <div className="flex gap-2 mt-2">
                          <a 
                            href={file.url} 
                            target="_blank" 
                            className="inline-flex items-center text-[10px] font-bold bg-white text-black px-2.5 py-1 rounded"
                          >
                            <Eye className="h-3 w-3 mr-1" /> Ampliar
                          </a>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Documentos de Contrato */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[#b8a090] uppercase tracking-wider">Contrato & Documentos Legais</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {project && project.files.filter(f => f.tipo !== "RENDER").length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-[#2d241f] rounded-xl col-span-2">
                    Nenhum documento legal ou contrato disponibilizado ainda.
                  </div>
                ) : (
                  project?.files.filter(f => f.tipo !== "RENDER").map((file) => (
                    <Card key={file.id} className="p-4 bg-card/25 border-[#2d241f] hover:border-[#3d302a] flex items-center justify-between gap-4 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 text-primary rounded-lg">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="space-y-0.5">
                          <strong className="text-xs font-bold text-foreground block truncate max-w-xs">{file.nome_arquivo}</strong>
                          <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.2 rounded font-semibold uppercase tracking-wider">
                            {file.tipo}
                          </span>
                        </div>
                      </div>

                      <a 
                        href={file.url} 
                        target="_blank"
                        className="inline-flex items-center text-[10px] font-bold bg-[#2d241f] hover:bg-primary/20 text-[#b8a090] hover:text-primary px-3 py-1.5 rounded-lg border border-[#3c3029] transition-all cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5 mr-1" /> Baixar
                      </a>
                    </Card>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* ================= ABA 4: FINANCEIRO ================= */}
        {activeTab === "finances" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* Resumo de Pagamentos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4 bg-card/20 border-[#2d241f]">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Valor Total do Sonho</span>
                <strong className="text-lg text-foreground font-extrabold">{formatCurrency(project?.valor_previsto || 0)}</strong>
              </Card>
              <Card className="p-4 bg-card/20 border-[#2d241f]">
                <span className="text-[10px] text-emerald-500/80 font-bold uppercase tracking-wider block">Total Pago / Quitante</span>
                <strong className="text-lg text-emerald-400 font-extrabold">
                  {formatCurrency(
                    project?.installments
                      .filter(ins => ins.status === "PAGO")
                      .reduce((acc, curr) => acc + curr.valor, 0) || 0
                  )}
                </strong>
              </Card>
              <Card className="p-4 bg-card/20 border-[#2d241f]">
                <span className="text-[10px] text-amber-500/80 font-bold uppercase tracking-wider block">Saldo Restante</span>
                <strong className="text-lg text-amber-400 font-extrabold">
                  {formatCurrency(
                    (project?.valor_previsto || 0) - 
                    (project?.installments
                      .filter(ins => ins.status === "PAGO")
                      .reduce((acc, curr) => acc + curr.valor, 0) || 0)
                  )}
                </strong>
              </Card>
            </div>

            {/* Extrato Financeiro */}
            <Card className="bg-card/25 border-[#2d241f] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#2d241f] text-muted-foreground text-xs uppercase font-bold bg-black/20">
                      <th className="p-4">Tipo</th>
                      <th className="p-4 text-right">Valor da Parcela</th>
                      <th className="p-4 text-center">Vencimento</th>
                      <th className="p-4 text-center">Data Recebimento</th>
                      <th className="p-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2d241f]/35 text-neutral-300">
                    {!project || project.installments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-xs text-muted-foreground">
                          Nenhum registro de parcelamento cadastrado.
                        </td>
                      </tr>
                    ) : (
                      project.installments.map((ins) => {
                        const isPaid = ins.status === "PAGO";
                        return (
                          <tr key={ins.id} className="hover:bg-black/10 transition-colors">
                            <td className="p-4">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                ins.tipo === "ENTRADA" 
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                                  : "bg-[#2d241f] text-[#b8a090]"
                              }`}>
                                {ins.tipo}
                              </span>
                            </td>
                            <td className="p-4 text-right font-black text-foreground">
                              {formatCurrency(ins.valor)}
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
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="border-[#2d241f] bg-black/10 p-4 border rounded-xl text-center">
              <p className="text-[11px] text-[#b8a090] leading-normal">
                Para solicitar boletos, segundas vias ou dúvidas de faturamento, entre em contato diretamente com o nosso comercial no WhatsApp.
              </p>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
