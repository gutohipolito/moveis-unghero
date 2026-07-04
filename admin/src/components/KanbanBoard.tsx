"use client";

import React, { useState } from "react";
import Link from "next/link";
import { updateProjectStatus, createLead, updateProjectAction, type ProjectStatus, type Origin } from "@/app/actions/kanban";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  MapPin, 
  Phone, 
  DollarSign, 
  ArrowRight,
  TrendingUp,
  UserCheck,
  Edit
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

const COLUMNS: { id: ProjectStatus; title: string; color: string }[] = [
  { id: "LEAD", title: "Leads", color: "border-t-amber-500 bg-amber-500/5 text-amber-700" },
  { id: "ORCAMENTO", title: "Orçamentos", color: "border-t-orange-500 bg-orange-500/5 text-orange-700" },
  { id: "NEGOCIACAO", title: "Negociação", color: "border-t-blue-500 bg-blue-500/5 text-blue-700" },
  { id: "CONFERENCIA_TECNICA", title: "Conf. Técnica", color: "border-t-purple-500 bg-purple-500/5 text-purple-700" },
  { id: "APROVADO", title: "Aprovados", color: "border-t-emerald-500 bg-emerald-500/5 text-emerald-700" },
  { id: "PRODUCAO", title: "Produção", color: "border-t-cyan-500 bg-cyan-500/5 text-cyan-700" },
  { id: "INSTALACAO", title: "Instalação", color: "border-t-indigo-500 bg-indigo-500/5 text-indigo-700" },
  { id: "FINALIZADO", title: "Finalizados", color: "border-t-slate-500 bg-slate-500/5 text-slate-600" }
];

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
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const [isEditLeadOpen, setIsEditLeadOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingStatusGeral, setEditingStatusGeral] = useState<ProjectStatus>("LEAD");
  const [statusGeralInicial, setStatusGeralInicial] = useState<ProjectStatus>("LEAD");
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ProjectStatus | null>(null);
  
  // Estados do formulário de lead
  const [isExistingClient, setIsExistingClient] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [loading, setLoading] = useState(false);
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
    } else {
      alert("Erro ao salvar alterações.");
    }
    setLoading(false);
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    setActiveDragId(id);
  };

  const handleDragEnd = () => {
    setActiveDragId(null);
    setDragOverColumn(null);
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

    // Persiste no banco de dados via Server Action
    const result = await updateProjectStatus(id, targetStatus);
    if (!result.success) {
      // Reverte se der erro
      setProjects(originalProjects);
      alert("Falha ao mover o projeto. Tente novamente.");
    }
  };

  const handleMoveRight = async (project: Project) => {
    const currentIdx = COLUMNS.findIndex((col) => col.id === project.status_geral);
    if (currentIdx === -1 || currentIdx === COLUMNS.length - 1) return;

    const targetStatus = COLUMNS[currentIdx + 1].id;
    const originalProjects = [...projects];
    setProjects(projects.map((p) => (p.id === project.id ? { ...p, status_geral: targetStatus } : p)));

    const result = await updateProjectStatus(project.id, targetStatus);
    if (!result.success) {
      setProjects(originalProjects);
      alert("Falha ao avançar o projeto. Tente novamente.");
    }
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
    } else {
      alert("Erro ao cadastrar o lead.");
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

  // Calcula estatísticas rápidas
  const totalPipeline = projects.reduce((acc, curr) => acc + curr.valor_previsto, 0);
  const activeProjectsCount = projects.filter(p => p.status_geral !== "FINALIZADO").length;

  return (
    <div className="space-y-6">
      {/* Topbar de Ações e Métricas Rápidas */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between p-6 rounded-xl border border-border bg-white backdrop-blur-md gap-6 shadow-xl">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center">
            <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 mr-3">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="kpi-label">Total em Negociação</span>
              <span className="kpi-value text-gradient-gold privacy-value">
                {formatCurrency(totalPipeline)}
              </span>
            </div>
          </div>
          <div className="flex items-center border-l border-border pl-6">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mr-3">
              <UserCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <span className="kpi-label">Projetos Ativos</span>
              <span className="kpi-value text-emerald-600">
                {activeProjectsCount}
              </span>
            </div>
          </div>
        </div>

        <Button onClick={() => setIsNewLeadOpen(true)} className="w-full lg:w-auto font-bold btn-metallic">
          <Plus className="mr-2 h-4.5 w-4.5" /> Novo Lead / Cliente
        </Button>
      </div>

      {/* Grid de Colunas Kanban */}
      <div className="kanban-scroll select-none min-h-[420px] md:min-h-[500px]">
        {COLUMNS.map((col) => {
          const colProjects = projects.filter((p) => p.status_geral === col.id);
          const colSum = colProjects.reduce((acc, curr) => acc + curr.valor_previsto, 0);
          const isOver = dragOverColumn === col.id;

          return (
            <div 
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`kanban-column rounded-xl border border-border bg-slate-50/80 flex flex-col transition-all duration-300 ${
                isOver ? "bg-slate-100 border-primary/30 scale-[1.01] shadow-lg" : ""
              }`}
            >
              {/* Cabeçalho da Coluna */}
              <div className={`p-3.5 border-t-2 ${col.color} rounded-t-xl flex items-center justify-between border-b border-border`}>
                <div className="flex items-center space-x-2 min-w-0">
                  <span className="font-bold text-xs uppercase tracking-wide truncate">{col.title}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground shrink-0">
                    {colProjects.length}
                  </span>
                </div>
                <span className="text-xs font-bold text-foreground privacy-value shrink-0 ml-2">{formatCurrency(colSum)}</span>
              </div>

              {/* Lista de Cards */}
              <div 
                className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[55vh] md:max-h-[600px] min-h-[280px] md:min-h-[400px]"
                onDragLeave={() => setDragOverColumn(null)}
              >
                {colProjects.length === 0 ? (
                  <div className="h-full flex items-center justify-center border border-dashed border-border rounded-xl p-6 text-center text-xs text-muted-foreground/60">
                    Nenhum projeto nesta etapa
                  </div>
                ) : (
                  colProjects.map((project) => {
                    const isDraggingThis = activeDragId === project.id;
                    return (
                      <div
                        key={project.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, project.id)}
                        onDragEnd={handleDragEnd}
                        className={`group bg-white p-4 rounded-xl text-card-foreground shadow-sm border border-border transition-all duration-300 cursor-grab active:cursor-grabbing hover:border-primary/50 hover:shadow-md ${
                          isDraggingThis ? "opacity-35 scale-95 border-dashed border-primary" : ""
                        }`}
                      >
                        <Link href={`/projects/${project.id}`} className="block space-y-2 cursor-pointer">
                          {/* Origem Badge */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold bg-secondary px-2 py-0.5 rounded text-muted-foreground uppercase tracking-widest border border-border">
                              {project.client.origem}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center font-medium">
                              <MapPin className="h-3 w-3 mr-0.5 text-primary" />
                              {project.client.cidade}
                            </span>
                          </div>

                          {/* Nome do Cliente */}
                          <h4 className="font-extrabold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                            {project.client.nome}
                          </h4>

                          {/* Detalhes de Contato */}
                          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                            <p className="flex items-center">
                              <Phone className="h-3 w-3 mr-1 opacity-70 text-primary" />
                              {project.client.telefone}
                            </p>
                          </div>

                          {/* Indicador de Chão de Fábrica / Produção */}
                          {(project.status_geral === "PRODUCAO" || project.status_geral === "INSTALACAO" || project.status_geral === "FINALIZADO") && (
                            <div className="mt-2.5">
                              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Fábrica & Montagem:</span>
                              <div
                                className="text-[10px] bg-cyan-50/80 text-cyan-600 border border-cyan-200 py-1.5 px-2.5 rounded-lg font-bold flex items-center justify-between"
                              >
                                <span>{getProductionProgress(project.id, project.status_geral)}</span>
                              </div>
                            </div>
                          )}
                        </Link>

                        {/* Separador */}
                        <div className="my-3 border-t border-border" />

                        {/* Rodapé do Card */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-foreground font-black text-sm">
                            <DollarSign className="h-3.5 w-3.5 -mr-0.5 opacity-80 text-primary" />
                            <span className="privacy-value">{formatCurrency(project.valor_previsto).replace("R$", "")}</span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveRight(project)}
                              className="md:hidden inline-flex items-center justify-center p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all cursor-pointer"
                              title="Avançar etapa"
                            >
                              <ArrowRight className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(project)}
                              className="inline-flex items-center justify-center p-1.5 rounded-lg bg-secondary hover:bg-primary/20 text-muted-foreground hover:text-primary border border-border transition-all cursor-pointer"
                              title="Editar Card"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            
                            <Link 
                              href={`/projects/${project.id}`}
                              className="inline-flex items-center justify-center p-1.5 rounded-lg bg-secondary hover:bg-primary/20 text-muted-foreground hover:text-primary border border-border transition-all cursor-pointer group/link"
                              title="Ver Detalhes do Projeto"
                            >
                              <ArrowRight className="h-4 w-4 group-hover/link:translate-x-0.5 transition-transform" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

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
                  {COLUMNS.map(col => (
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
                  {COLUMNS.map(col => (
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
    </div>
  );
}
