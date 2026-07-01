"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  updateProjectGeneralStatus, 
  updateEnvironmentStatus, 
  addEnvironment, 
  addTimelineEvent, 
  toggleFileApproval, 
  uploadProjectFile,
  type EnvironmentType,
  type EnvironmentStatus,
  type FileType
} from "@/app/actions/project";
import { approveQuote, deleteQuote } from "@/app/actions/quotes";
import { createInstallment, payInstallment, createTask, toggleTaskStatus } from "@/app/actions/operations";
import QuoteBuilder from "@/components/QuoteBuilder";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
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
  Building,
  DollarSign,
  Trash2
} from "lucide-react";

interface Environment {
  id: string;
  nome: string;
  tipo: string;
  status: string;
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
  subtotal: number;
  desconto: number;
  valor_final: number;
  validade: string;
  observacoes: string;
}

interface Installment {
  id: string;
  valor: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status: string;
  tipo: string;
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
    cidade: string;
    origem: string;
    telefone: string;
    email: string;
    observacoes?: string | null;
  };
  environments: Environment[];
  files: ProjectFile[];
  timeline: TimelineEvent[];
  quotes: Quote[];
  tasks: Task[];
  installments: Installment[];
}

interface ProjectDetailsProps {
  initialProject: Project;
  companyId: string;
  isMock: boolean;
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

export default function ProjectDetails({ initialProject, companyId, isMock }: ProjectDetailsProps) {
  const [project, setProject] = useState<Project>(initialProject);
  const [isAddEnvOpen, setIsAddEnvOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCreatingQuote, setIsCreatingQuote] = useState(false);
  const [isAddInstallmentOpen, setIsAddInstallmentOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);

  // Estados dos formulários
  const [newInstallmentForm, setNewInstallmentForm] = useState({
    valor: "",
    data_vencimento: "2026-07-01",
    tipo: "PARCELA" as "ENTRADA" | "PARCELA"
  });

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
  const [timelineInput, setTimelineInput] = useState("");
  const [isTimelinePrivate, setIsTimelinePrivate] = useState(true);
  const [timelineFilter, setTimelineFilter] = useState<"ALL" | "PUBLIC" | "PRIVATE">("ALL");
  const [uploadForm, setUploadForm] = useState({ tipo: "RENDER" as FileType, nome_arquivo: "" });
  const [loading, setLoading] = useState(false);

  // Helper de Moeda
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

  // Handler de alteração do status geral do projeto
  const handleStatusChange = async (newStatus: string) => {
    const originalStatus = project.status_geral;
    setProject({ ...project, status_geral: newStatus });
    
    const result = await updateProjectGeneralStatus(project.id, newStatus);
    if (!result.success) {
      setProject({ ...project, status_geral: originalStatus });
      alert("Erro ao alterar o status do projeto.");
    }
  };

  // Handler de alteração do status do ambiente individual
  const handleEnvStatusChange = async (envId: string, newStatus: EnvironmentStatus) => {
    const originalEnvs = [...project.environments];
    const updatedEnvs = project.environments.map(e => e.id === envId ? { ...e, status: newStatus } : e);
    setProject({ ...project, environments: updatedEnvs });

    const result = await updateEnvironmentStatus(project.id, envId, newStatus);
    if (!result.success) {
      setProject({ ...project, environments: originalEnvs });
      alert("Erro ao atualizar o status do ambiente.");
    }
  };

  // Submit para adicionar ambiente
  const handleAddEnvSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await addEnvironment(project.id, newEnvForm.nome, newEnvForm.tipo);
    if (result.success && result.data) {
      setProject({
        ...project,
        environments: [...project.environments, result.data as Environment],
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
      setIsAddEnvOpen(false);
      setNewEnvForm({ nome: "", tipo: "COZINHA" });
    } else {
      alert("Erro ao adicionar ambiente.");
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
    } else {
      alert("Erro ao publicar nota.");
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
      alert("Erro ao alterar o status do arquivo.");
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
    } else {
      alert("Erro ao realizar upload.");
    }
    setLoading(false);
  };

  const handlePayInstallment = async (installmentId: string) => {
    if (!confirm("Confirmar o recebimento desta parcela?")) return;
    
    setProject(prev => ({
      ...prev,
      installments: prev.installments.map(ins => ins.id === installmentId ? {
        ...ins,
        status: "PAGO",
        data_pagamento: new Date().toISOString()
      } : ins)
    }));

    await payInstallment(project.id, installmentId);
  };

  const handleAddInstallmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstallmentForm.valor || !newInstallmentForm.data_vencimento) return;

    setLoading(true);
    const valueNum = parseFloat(newInstallmentForm.valor);
    const result = await createInstallment(project.id, {
      valor: valueNum,
      data_vencimento: newInstallmentForm.data_vencimento,
      tipo: newInstallmentForm.tipo
    });

    if (result.success && result.installment) {
      const added: Installment = {
        id: result.installment.id,
        valor: Number(result.installment.valor),
        data_vencimento: result.installment.data_vencimento.toISOString ? result.installment.data_vencimento.toISOString() : new Date(result.installment.data_vencimento).toISOString(),
        data_pagamento: null,
        status: "PENDENTE",
        tipo: result.installment.tipo
      };

      setProject(prev => ({
        ...prev,
        installments: [...prev.installments, added]
      }));
      setIsAddInstallmentOpen(false);
      setNewInstallmentForm({ valor: "", data_vencimento: "2026-07-01", tipo: "PARCELA" });
    }
    setLoading(false);
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
    <div className="space-y-6">
      {/* Botão de Voltar e Banner de Mock */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <Link 
          href="/crm" 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-0.5 transition-transform" />
          Voltar para o CRM Kanban
        </Link>
        {isMock && (
          <span className="text-[11px] font-semibold bg-accent border border-primary/20 text-primary px-3 py-1 rounded-full">
            Modo de Demonstração / Dados Mockados
          </span>
        )}
      </div>

      {/* Card Principal - Cabeçalho e Informações Básicas */}
      <div className="rounded-xl border border-border/40 bg-card/40 backdrop-blur-md p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="space-y-4 col-span-2">
            <div>
              <span className="text-xs font-bold text-primary tracking-widest uppercase">
                Cliente & Projeto
              </span>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mt-1">
                {project.client.nome}
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div className="flex items-center">
                <MapPin className="h-4 w-4 text-muted-foreground mr-2.5" />
                Cidade: <span className="text-foreground font-medium ml-1">{project.client.cidade}</span>
              </div>
              <div className="flex items-center">
                <Phone className="h-4 w-4 text-muted-foreground mr-2.5" />
                WhatsApp: <span className="text-foreground font-medium ml-1">{project.client.telefone}</span>
              </div>
              <div className="flex items-center">
                <Mail className="h-4 w-4 text-muted-foreground mr-2.5" />
                E-mail: <span className="text-foreground font-medium ml-1">{project.client.email}</span>
              </div>
              <div className="flex items-center">
                <Building className="h-4 w-4 text-muted-foreground mr-2.5" />
                Origem Lead: <span className="text-foreground font-medium ml-1 uppercase">{project.client.origem}</span>
              </div>
            </div>

            {project.client.observacoes && (
              <div className="p-3.5 rounded-lg bg-black/20 border border-border/40 text-xs text-muted-foreground">
                <span className="font-semibold block text-foreground mb-1">Notas do Cliente:</span>
                {project.client.observacoes}
              </div>
            )}
          </div>

          {/* Painel Comercial Rápido */}
          <div className="p-5 rounded-xl border border-border/60 bg-black/15 flex flex-col justify-between h-full gap-4">
            <div>
              <span className="text-xs text-muted-foreground block">Valor Previsto do Projeto</span>
              <span className="text-2xl font-bold tracking-tight text-gradient-gold block mt-0.5">
                {formatCurrency(project.valor_previsto)}
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground block uppercase tracking-wider">
                Status Operacional Geral
              </label>
              <Select 
                value={project.status_geral} 
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full"
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
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="environments">
        <TabsList>
          <TabsTrigger value="environments">
            <Layers className="h-4 w-4 mr-2" /> Ambientes ({project.environments.length})
          </TabsTrigger>
          <TabsTrigger value="quotes">
            <DollarSign className="h-4 w-4 mr-2" /> Orçamentos ({project.quotes?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="finances">
            <DollarSign className="h-4 w-4 mr-2" /> Financeiro ({project.installments?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="tasks">
            <CheckCircle2 className="h-4 w-4 mr-2" /> Tarefas ({project.tasks?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="files">
            <FileText className="h-4 w-4 mr-2" /> Arquivos Técnicos ({project.files.length})
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <Clock className="h-4 w-4 mr-2" /> Histórico & Notas ({filteredTimeline.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Ambientes */}
        <TabsContent value="environments" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Módulos de Ambientes / Cômodos</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Monitore e atualize as etapas de fabricação de cada cômodo de forma individual.
              </p>
            </div>
            <Button onClick={() => setIsAddEnvOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-1.5" /> Novo Cômodo
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {project.environments.length === 0 ? (
              <div className="col-span-2 border border-dashed border-border/30 rounded-xl p-8 text-center text-sm text-muted-foreground">
                Nenhum ambiente adicionado a este projeto. Clique em "Novo Cômodo" para começar.
              </div>
            ) : (
              project.environments.map((env) => {
                const currentStatusInfo = ENVIRONMENT_STATUSES.find(s => s.value === env.status);
                return (
                  <div 
                    key={env.id} 
                    className="p-5 rounded-xl border border-border/40 bg-card/35 backdrop-blur-xs flex flex-col justify-between gap-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[9px] font-bold bg-secondary px-1.5 py-0.5 rounded text-muted-foreground uppercase tracking-widest block w-max mb-1.5">
                          {env.tipo}
                        </span>
                        <h4 className="font-semibold text-base text-foreground">{env.nome}</h4>
                      </div>
                      
                      {/* Badge de Status Atual */}
                      <span className={`text-[11px] font-medium border px-2.5 py-0.5 rounded-full ${currentStatusInfo?.bg}`}>
                        {currentStatusInfo?.label}
                      </span>
                    </div>

                    <div className="border-t border-border/30 pt-3 flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase">
                        Alterar Status de Fabricação:
                      </label>
                      <Select 
                        value={env.status} 
                        onChange={(e) => handleEnvStatusChange(env.id, e.target.value as EnvironmentStatus)}
                        className="w-full text-xs"
                      >
                        {ENVIRONMENT_STATUSES.map(status => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Tab 2: Arquivos Técnicos */}
        <TabsContent value="files" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Gerenciador de Arquivos & Renders</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Faça upload de projetos em DWG, SketchUp, PDFs de medição e renders em alta definição.
              </p>
            </div>
            <Button onClick={() => setIsUploadOpen(true)} size="sm">
              <Upload className="h-4 w-4 mr-1.5" /> Upload de Arquivo
            </Button>
          </div>

          <div className="rounded-xl border border-border/40 bg-card/35 backdrop-blur-xs overflow-hidden">
            {project.files.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Nenhum arquivo ou projeto técnico enviado.
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {project.files.map((file) => (
                  <div key={file.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-black/10 transition-colors">
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

                    <div className="flex items-center gap-4">
                      {/* Toggle de Liberação para Produção */}
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
                placeholder="Adicione um comentário ou detalhe técnico no histórico..."
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
                      {event.acao}
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
              onCancel={() => setIsCreatingQuote(false)}
              onSuccess={(newQuoteData) => {
                const newQuote: Quote = {
                  id: newQuoteData.quote.id,
                  versao: newQuoteData.version,
                  subtotal: newQuoteData.quote.subtotal,
                  desconto: newQuoteData.quote.desconto,
                  valor_final: newQuoteData.quote.valor_final,
                  validade: newQuoteData.quote.validade.toISOString ? newQuoteData.quote.validade.toISOString() : new Date(newQuoteData.quote.validade).toISOString(),
                  observacoes: newQuoteData.quote.observacoes
                };
                
                setProject({
                  ...project,
                  quotes: [newQuote, ...project.quotes],
                  timeline: [
                    {
                      id: `local-time-${Date.now()}`,
                      acao: `Orçamento comercial v${newQuote.versao} gerado no valor de ${formatCurrency(newQuote.valor_final)}`,
                      data: new Date().toISOString(),
                      interno_sotamente: false,
                      user: { name: "Sistema" }
                    },
                    ...project.timeline
                  ]
                });
                setIsCreatingQuote(false);
              }}
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">Propostas & Orçamentos Comerciais</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Gere orçamentos e envie propostas em PDF de 5 páginas.
                  </p>
                </div>
                <Button onClick={() => setIsCreatingQuote(true)} size="sm">
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
                    {project.quotes.map((q) => (
                      <div key={q.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-black/10 transition-colors">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2.5">
                            <h4 className="font-bold text-base text-foreground leading-none">
                              Proposta Comercial v{q.versao}
                            </h4>
                            <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded font-semibold">
                              Validade: {new Date(q.validade).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                          <div className="flex items-center gap-6 text-sm text-muted-foreground">
                            <span>Subtotal: <strong className="text-foreground">{formatCurrency(q.subtotal)}</strong></span>
                            {q.desconto > 0 && <span className="text-amber-500 font-medium">Desconto: -{formatCurrency(q.desconto)}</span>}
                            <span>Valor Final: <strong className="text-primary font-bold">{formatCurrency(q.valor_final)}</strong></span>
                          </div>
                          {q.observacoes && (
                            <p className="text-xs text-muted-foreground/80 line-clamp-1 italic">
                              "{q.observacoes}"
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                          <button
                            onClick={async () => {
                              if (confirm(`Confirmar a aprovação da Proposta v${q.versao}? Isso mudará o status do projeto para APROVADO.`)) {
                                setProject(prev => ({ ...prev, status_geral: "APROVADO" }));
                                await approveQuote(project.id, q.id, q.versao);
                                setProject(prev => ({
                                  ...prev,
                                  timeline: [
                                    {
                                      id: `local-time-${Date.now()}`,
                                      acao: `Proposta comercial v${q.versao} foi APROVADA pelo cliente.`,
                                      data: new Date().toISOString(),
                                      interno_sotamente: false,
                                      user: { name: "Vendas" }
                                    },
                                    ...prev.timeline
                                  ]
                                }));
                              }
                            }}
                            className="inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1.5" /> Aprovar Proposta
                          </button>

                          <Link
                            href={`/quotes/${q.id}/print`}
                            target="_blank"
                            className="inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg border border-border/60 bg-transparent text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-all cursor-pointer"
                          >
                            <FileText className="h-4 w-4 mr-1.5" /> Gerar PDF (5 Págs)
                          </Link>

                          <button
                            onClick={async () => {
                              if (confirm(`Deseja realmente excluir a Proposta v${q.versao}?`)) {
                                setProject({ ...project, quotes: project.quotes.filter(item => item.id !== q.id) });
                                await deleteQuote(project.id, q.id, q.versao);
                              }
                            }}
                            className="p-2 rounded-lg hover:bg-destructive/10 text-destructive/70 hover:text-destructive transition-colors cursor-pointer"
                            title="Excluir Orçamento"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
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
            <Button onClick={() => setIsAddInstallmentOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-1.5" /> Lançar Parcela
            </Button>
          </div>

          {/* Indicadores Financeiros Rápidos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 bg-card/25 border-border/40">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Valor do Contrato</span>
              <strong className="text-lg text-foreground font-extrabold">{formatCurrency(project.valor_previsto)}</strong>
            </Card>
            <Card className="p-4 bg-card/25 border-border/40">
              <span className="text-[10px] text-emerald-500/80 font-bold uppercase tracking-wider block">Valor Recebido</span>
              <strong className="text-lg text-emerald-400 font-extrabold">
                {formatCurrency(
                  project.installments
                    .filter(ins => ins.status === "PAGO")
                    .reduce((acc, curr) => acc + curr.valor, 0)
                )}
              </strong>
            </Card>
            <Card className="p-4 bg-card/25 border-border/40">
              <span className="text-[10px] text-amber-500/80 font-bold uppercase tracking-wider block">Saldo Pendente</span>
              <strong className="text-lg text-amber-400 font-extrabold">
                {formatCurrency(
                  project.valor_previsto - 
                  project.installments
                    .filter(ins => ins.status === "PAGO")
                    .reduce((acc, curr) => acc + curr.valor, 0)
                )}
              </strong>
            </Card>
          </div>

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
                        <tr key={ins.id} className="hover:bg-black/10 transition-colors">
                          <td className="p-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              ins.tipo === "ENTRADA" 
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                                : "bg-secondary text-muted-foreground"
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
                          <td className="p-4 text-right">
                            {!isPaid && (
                              <Button 
                                onClick={() => handlePayInstallment(ins.id)} 
                                size="sm" 
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] py-1 h-7 font-bold"
                              >
                                Quitar
                              </Button>
                            )}
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
            <Button onClick={() => setIsAddTaskOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-1.5" /> Agendar
            </Button>
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
                    <div key={t.id} className={`p-4 flex items-center justify-between gap-4 hover:bg-black/10 transition-colors ${
                      isCompleted ? "opacity-50" : ""
                    }`}>
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Checkbox customizado */}
                        <input
                          type="checkbox"
                          checked={isCompleted}
                          onChange={(e) => handleToggleTask(t.id, e.target.checked)}
                          className="h-4.5 w-4.5 rounded border-border bg-black/20 text-primary focus:ring-primary/40 focus:ring-1 cursor-pointer mt-0.5"
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
              placeholder="Ex: Cozinha Americana Gourmet, Suíte Master"
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

          <div className="flex justify-end gap-3 pt-3 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddEnvOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="font-semibold">
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
              placeholder="Ex: Detalhamento_Corte_Cozinha.pdf, Render_V1.jpg"
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

          <div className="flex justify-end gap-3 pt-3 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsUploadOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="font-semibold">
              {loading ? "Enviando..." : "Salvar Arquivo"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal - Novo Recebível / Parcela */}
      <Dialog isOpen={isAddInstallmentOpen} onClose={() => setIsAddInstallmentOpen(false)}>
        <h3 className="text-lg font-bold tracking-tight text-gradient-gold mb-4">
          Lançar Parcela / Entrada Financeira
        </h3>
        <form onSubmit={handleAddInstallmentSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Valor da Parcela (R$)
            </label>
            <Input
              required
              type="number"
              step="0.01"
              placeholder="Ex: 5000.00"
              value={newInstallmentForm.valor}
              onChange={(e) => setNewInstallmentForm({ ...newInstallmentForm, valor: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Data de Vencimento
              </label>
              <Input
                required
                type="date"
                value={newInstallmentForm.data_vencimento}
                onChange={(e) => setNewInstallmentForm({ ...newInstallmentForm, data_vencimento: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Tipo
              </label>
              <Select
                value={newInstallmentForm.tipo}
                onChange={(e) => setNewInstallmentForm({ ...newInstallmentForm, tipo: e.target.value as any })}
              >
                <option value="PARCELA">Parcela Padrão</option>
                <option value="ENTRADA">Entrada / Sinal</option>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddInstallmentOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="font-semibold">
              {loading ? "Lançando..." : "Confirmar Parcela"}
            </Button>
          </div>
        </form>
      </Dialog>

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
              placeholder="Ex: Medição da Cozinha Gourmet, Entrega Módulos Closets"
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
              placeholder="Descreva observações técnicas relevantes ou requisitos..."
              value={newTaskForm.descricao}
              onChange={(e) => setNewTaskForm({ ...newTaskForm, descricao: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Responsável Técnico
              </label>
              <Input
                required
                placeholder="Ex: Roberto (Montador)"
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

          <div className="flex justify-end gap-3 pt-3 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddTaskOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="font-semibold">
              {loading ? "Agendando..." : "Confirmar Agendamento"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
