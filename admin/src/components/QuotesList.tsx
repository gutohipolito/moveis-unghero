"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Search, 
  Trash2, 
  ExternalLink, 
  Printer, 
  DollarSign, 
  Calculator, 
  FileText,
  Clock,
  AlertTriangle,
  Plus,
  Loader2
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  deleteQuote, 
  getProjectsForQuotes, 
  getQuotes,
  createProjectForClient,
  createQuickClientAndProject
} from "@/app/actions/quotes";
import { getClients } from "@/app/actions/cliente";
import QuoteBuilder from "@/components/QuoteBuilder";

interface QuoteItem {
  id: string;
  descricao: string;
  quantidade: number;
  tipo_custo: string;
  valor_unitario: number;
  valor_total: number;
}

interface Client {
  id: string;
  nome: string;
  cidade: string;
}

interface Project {
  id: string;
  status_geral: string;
  client: Client;
}

interface Quote {
  id: string;
  project_id: string;
  versao: number;
  subtotal: number;
  desconto: number;
  valor_final: number;
  validade: Date | string;
  observacoes: string | null;
  project: Project;
  items: QuoteItem[];
}

interface QuotesListProps {
  initialQuotes: Quote[];
  companyId: string;
}

export default function QuotesList({ initialQuotes, companyId }: QuotesListProps) {
  const [quotes, setQuotes] = useState<Quote[]>(initialQuotes);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ACTIVE" | "EXPIRED">("ALL");

  // Estados para criação direta de Orçamento
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [searchProject, setSearchProject] = useState("");

  // Novos estados para vinculação de cliente ou avulso
  const [creationMode, setCreationMode] = useState<"PROJECT" | "CLIENT" | "QUICK">("PROJECT");
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [searchClient, setSearchClient] = useState("");
  const [isGeneratingProject, setIsGeneratingProject] = useState(false);

  // Form de dados avulsos
  const [quickNome, setQuickNome] = useState("");
  const [quickEmail, setQuickEmail] = useState("");
  const [quickTelefone, setQuickTelefone] = useState("");
  const [quickCidade, setQuickCidade] = useState("");

  const handleOpenCreateModal = async () => {
    setIsCreateOpen(true);
    setLoadingProjects(true);
    const res = await getProjectsForQuotes();
    if (res.success) {
      setProjects(res.data || []);
    }
    setLoadingProjects(false);
  };

  const handleModeChange = async (mode: "PROJECT" | "CLIENT" | "QUICK") => {
    setCreationMode(mode);
    if (mode === "CLIENT" && clientsList.length === 0) {
      setLoadingClients(true);
      const res = await getClients(companyId);
      if (res.success) {
        setClientsList(res.clients || []);
      }
      setLoadingClients(false);
    }
  };

  const handleSelectClient = async (clientId: string) => {
    setIsGeneratingProject(true);
    const res = await createProjectForClient(clientId, companyId);
    if (res.success && res.projectId) {
      setSelectedProjectId(res.projectId);
    } else {
      alert("Erro ao inicializar orçamento para o cliente.");
    }
    setIsGeneratingProject(false);
  };

  const handleCreateQuickClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNome || !quickCidade) {
      alert("Por favor, preencha o Nome e a Cidade do cliente.");
      return;
    }
    setIsGeneratingProject(true);
    const res = await createQuickClientAndProject({
      nome: quickNome,
      email: quickEmail,
      telefone: quickTelefone,
      cidade: quickCidade,
      companyId
    });
    if (res.success && res.projectId) {
      setSelectedProjectId(res.projectId);
    } else {
      alert("Erro ao criar cadastro avulso.");
    }
    setIsGeneratingProject(false);
  };

  const handleCreateSuccess = async () => {
    const res = await getQuotes();
    if (res.success) {
      setQuotes(res.data as any || []);
    }
    setIsCreateOpen(false);
    setSelectedProjectId(null);
    setSearchProject("");
    setSearchClient("");
    setCreationMode("PROJECT");
    setQuickNome("");
    setQuickEmail("");
    setQuickTelefone("");
    setQuickCidade("");
  };

  const handleCancelCreate = () => {
    setIsCreateOpen(false);
    setSelectedProjectId(null);
    setSearchProject("");
    setSearchClient("");
    setCreationMode("PROJECT");
    setQuickNome("");
    setQuickEmail("");
    setQuickTelefone("");
    setQuickCidade("");
  };

  const handleDeleteQuote = async (projectId: string, quoteId: string, version: number) => {
    if (confirm(`Deseja realmente excluir a versão ${version} deste orçamento?`)) {
      const res = await deleteQuote(projectId, quoteId, version);
      if (res.success) {
        setQuotes(prev => prev.filter(q => q.id !== quoteId));
      } else {
        alert("Erro ao excluir orçamento.");
      }
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(val);
  };

  const formatDate = (dateInput: Date | string) => {
    const d = new Date(dateInput);
    return d.toLocaleDateString("pt-BR");
  };

  const isExpired = (dateInput: Date | string) => {
    const d = new Date(dateInput);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return d.getTime() < today.getTime();
  };

  // Filtragem
  const filteredQuotes = quotes.filter(q => {
    const matchesSearch = 
      q.project.client.nome.toLowerCase().includes(search.toLowerCase()) ||
      q.id.toLowerCase().includes(search.toLowerCase()) ||
      `orc-${q.id.substring(0, 5)}`.toLowerCase().includes(search.toLowerCase());

    const expired = isExpired(q.validade);
    const matchesStatus = 
      filterStatus === "ALL" ||
      (filterStatus === "ACTIVE" && !expired) ||
      (filterStatus === "EXPIRED" && expired);

    return matchesSearch && matchesStatus;
  });

  // Métricas
  const totalValue = filteredQuotes.reduce((acc, q) => acc + q.valor_final, 0);
  const averageValue = filteredQuotes.length > 0 ? totalValue / filteredQuotes.length : 0;
  const expiredCount = filteredQuotes.filter(q => isExpired(q.validade)).length;
  const activeCount = filteredQuotes.length - expiredCount;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="h-6 w-6 text-[hsl(28_85%_45%)]" />
            Orçamentos
          </h1>
          <p className="text-sm text-slate-500">
            Gerencie e visualize todas as propostas comerciais e orçamentos emitidos.
          </p>
        </div>
        <div>
          <Button 
            onClick={handleOpenCreateModal} 
            className="font-bold btn-metallic gap-1.5 bg-[hsl(28_85%_45%)] text-white hover:bg-[hsl(28_85%_40%)]"
          >
            <Plus className="h-4 w-4" />
            Novo Orçamento
          </Button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-4 bg-white border border-slate-100 shadow-sm">
          <div className="p-3 bg-amber-500/10 rounded-lg text-amber-600">
            <Calculator className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Emitido</p>
            <p className="text-xl font-bold text-slate-800">{filteredQuotes.length} orçamentos</p>
            <p className="text-xs text-slate-400">{activeCount} ativos / {expiredCount} vencidos</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 bg-white border border-slate-100 shadow-sm">
          <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-600">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor Total</p>
            <p className="text-xl font-bold text-slate-800">{formatCurrency(totalValue)}</p>
            <p className="text-xs text-emerald-600">Soma de orçamentos filtrados</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 bg-white border border-slate-100 shadow-sm">
          <div className="p-3 bg-blue-500/10 rounded-lg text-blue-600">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ticket Médio</p>
            <p className="text-xl font-bold text-slate-800">{formatCurrency(averageValue)}</p>
            <p className="text-xs text-slate-400">Média por proposta comercial</p>
          </div>
        </Card>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col md:flex-row gap-3 bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Buscar por cliente ou ID do orçamento..." 
            className="pl-9 bg-slate-50 border-slate-200 focus:bg-white focus:border-[hsl(28_85%_45%)]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button 
            variant={filterStatus === "ALL" ? "default" : "outline"} 
            className={filterStatus === "ALL" ? "bg-slate-800 hover:bg-slate-700 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"}
            size="sm"
            onClick={() => setFilterStatus("ALL")}
          >
            Todos
          </Button>
          <Button 
            variant={filterStatus === "ACTIVE" ? "default" : "outline"} 
            className={filterStatus === "ACTIVE" ? "bg-slate-800 hover:bg-slate-700 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"}
            size="sm"
            onClick={() => setFilterStatus("ACTIVE")}
          >
            Ativos
          </Button>
          <Button 
            variant={filterStatus === "EXPIRED" ? "default" : "outline"} 
            className={filterStatus === "EXPIRED" ? "bg-slate-800 hover:bg-slate-700 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"}
            size="sm"
            onClick={() => setFilterStatus("EXPIRED")}
          >
            Vencidos
          </Button>
        </div>
      </div>

      {/* Lista de Orçamentos */}
      <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cód / Versão</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cidade</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Validade</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status Validade</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Valor Final</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-sm">
                    Nenhum orçamento encontrado.
                  </td>
                </tr>
              ) : (
                filteredQuotes.map((q) => {
                  const expired = isExpired(q.validade);
                  return (
                    <tr key={q.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4 text-sm font-medium text-slate-700">
                        <span className="font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-xs mr-2">
                          ORC-{q.id.substring(0, 5).toUpperCase()}
                        </span>
                        <span className="text-slate-500">v{q.versao}</span>
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-800 font-semibold">
                        {q.project.client.nome}
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-600">
                        {q.project.client.cidade}
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-600">
                        {formatDate(q.validade)}
                      </td>
                      <td className="py-4 px-4 text-sm">
                        {expired ? (
                          <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-600 px-2 py-0.5 rounded-full text-xs font-medium">
                            <AlertTriangle className="h-3 w-3" />
                            Vencido
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full text-xs font-medium">
                            <Clock className="h-3 w-3" />
                            Ativo
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-800 font-bold">
                        {formatCurrency(q.valor_final)}
                      </td>
                      <td className="py-4 px-4 text-sm text-right">
                        <div className="flex justify-end items-center gap-2">
                          <Link 
                            href={`/quotes/${q.id}/print`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 h-8"
                              title="Visualizar PDF / Imprimir"
                            >
                              <Printer className="h-3.5 w-3.5" />
                              PDF
                            </Button>
                          </Link>
                          
                          <Link href={`/projects/${q.project_id}`}>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 h-8"
                              title="Ver Detalhes do Projeto"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Projeto
                            </Button>
                          </Link>

                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 h-8 px-2"
                            onClick={() => handleDeleteQuote(q.project_id, q.id, q.versao)}
                            title="Excluir Orçamento"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODAL: CRIAR NOVO ORÇAMENTO ─── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}>
          <div className={`bg-white border border-slate-200 w-full rounded-2xl overflow-hidden shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 transition-all max-h-[90vh] overflow-y-auto ${selectedProjectId ? 'max-w-5xl' : 'max-w-xl'}`}>
            
            {/* Título & Fechar */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  {selectedProjectId 
                    ? "Montar Proposta Comercial" 
                    : "Como deseja criar o orçamento?"}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedProjectId 
                    ? "Preencha as especificações, ambientes e adicione itens ao orçamento" 
                    : "Selecione uma das opções abaixo para iniciar a proposta."}
                </p>
              </div>
              <button 
                onClick={handleCancelCreate} 
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold cursor-pointer"
              >
                Cancelar
              </button>
            </div>

            {/* FASE 1: Configuração / Seleção de Alvo */}
            {!selectedProjectId && (
              <div className="space-y-4">
                
                {/* Seletor de Modo (Abas) */}
                <div className="flex gap-2 p-1 bg-slate-100 rounded-lg text-xs font-bold">
                  <button
                    type="button"
                    className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${creationMode === "PROJECT" ? "bg-white shadow-xs text-slate-800" : "text-slate-500 hover:text-slate-800"}`}
                    onClick={() => handleModeChange("PROJECT")}
                    disabled={isGeneratingProject}
                  >
                    Projeto Existente
                  </button>
                  <button
                    type="button"
                    className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${creationMode === "CLIENT" ? "bg-white shadow-xs text-slate-800" : "text-slate-500 hover:text-slate-800"}`}
                    onClick={() => handleModeChange("CLIENT")}
                    disabled={isGeneratingProject}
                  >
                    Apenas Cliente
                  </button>
                  <button
                    type="button"
                    className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${creationMode === "QUICK" ? "bg-white shadow-xs text-slate-800" : "text-slate-500 hover:text-slate-800"}`}
                    onClick={() => handleModeChange("QUICK")}
                    disabled={isGeneratingProject}
                  >
                    Orçamento Avulso
                  </button>
                </div>

                {isGeneratingProject ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Loader2 className="h-8 w-8 animate-spin text-[hsl(28_85%_45%)]" />
                    <span className="text-sm font-semibold">Inicializando ambiente de orçamento...</span>
                  </div>
                ) : (
                  <>
                    {/* Modo 1: Projeto Existente */}
                    {creationMode === "PROJECT" && (
                      <div className="space-y-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                          <Input 
                            placeholder="Filtrar projetos por cliente..." 
                            className="pl-9 bg-slate-50 border-slate-200 text-sm"
                            value={searchProject}
                            onChange={(e) => setSearchProject(e.target.value)}
                          />
                        </div>

                        {loadingProjects ? (
                          <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
                            <Loader2 className="h-6 w-6 animate-spin text-[hsl(28_85%_45%)]" />
                            <span className="text-sm">Carregando projetos...</span>
                          </div>
                        ) : (
                          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-lg">
                            {projects.filter(p => 
                              p.client.nome.toLowerCase().includes(searchProject.toLowerCase())
                            ).length === 0 ? (
                              <p className="p-4 text-center text-sm text-slate-400">Nenhum projeto ativo encontrado.</p>
                            ) : (
                              projects.filter(p => 
                                p.client.nome.toLowerCase().includes(searchProject.toLowerCase())
                              ).map(p => (
                                <div 
                                  key={p.id} 
                                  onClick={() => setSelectedProjectId(p.id)}
                                  className="p-3 flex justify-between items-center hover:bg-slate-50 cursor-pointer transition-colors"
                                >
                                  <div>
                                    <strong className="text-sm text-slate-800 block">{p.client.nome}</strong>
                                    <span className="text-xs text-slate-400 font-mono">ID: {p.id.substring(0, 8).toUpperCase()} // {p.client.cidade}</span>
                                  </div>
                                  <span className="text-[10px] font-bold bg-amber-500/10 text-amber-700 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    {p.status_geral}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Modo 2: Apenas Cliente */}
                    {creationMode === "CLIENT" && (
                      <div className="space-y-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                          <Input 
                            placeholder="Buscar cliente na base..." 
                            className="pl-9 bg-slate-50 border-slate-200 text-sm"
                            value={searchClient}
                            onChange={(e) => setSearchClient(e.target.value)}
                          />
                        </div>

                        {loadingClients ? (
                          <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
                            <Loader2 className="h-6 w-6 animate-spin text-[hsl(28_85%_45%)]" />
                            <span className="text-sm">Carregando clientes...</span>
                          </div>
                        ) : (
                          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-lg">
                            {clientsList.filter(c => 
                              c.nome.toLowerCase().includes(searchClient.toLowerCase()) ||
                              c.email.toLowerCase().includes(searchClient.toLowerCase())
                            ).length === 0 ? (
                              <p className="p-4 text-center text-sm text-slate-400">Nenhum cliente encontrado.</p>
                            ) : (
                              clientsList.filter(c => 
                                c.nome.toLowerCase().includes(searchClient.toLowerCase()) ||
                                c.email.toLowerCase().includes(searchClient.toLowerCase())
                              ).map(c => (
                                <div 
                                  key={c.id} 
                                  onClick={() => handleSelectClient(c.id)}
                                  className="p-3 flex justify-between items-center hover:bg-slate-50 cursor-pointer transition-colors"
                                >
                                  <div>
                                    <strong className="text-sm text-slate-800 block">{c.nome}</strong>
                                    <span className="text-xs text-slate-400">{c.cidade} {c.telefone && `// ${c.telefone}`}</span>
                                  </div>
                                  <span className="text-[10px] font-semibold text-slate-400">
                                    Selecionar
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Modo 3: Orçamento Avulso */}
                    {creationMode === "QUICK" && (
                      <form onSubmit={handleCreateQuickClient} className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 block">Nome do Cliente *</label>
                            <Input 
                              required 
                              placeholder="Ex: Pedro Henrique" 
                              value={quickNome}
                              onChange={e => setQuickNome(e.target.value)}
                              className="border-slate-200 bg-slate-50 text-sm h-9 focus:bg-white"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 block">Cidade *</label>
                            <Input 
                              required 
                              placeholder="Ex: Bento Gonçalves" 
                              value={quickCidade}
                              onChange={e => setQuickCidade(e.target.value)}
                              className="border-slate-200 bg-slate-50 text-sm h-9 focus:bg-white"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 block">E-mail (Opcional)</label>
                            <Input 
                              type="email"
                              placeholder="Ex: pedro@email.com" 
                              value={quickEmail}
                              onChange={e => setQuickEmail(e.target.value)}
                              className="border-slate-200 bg-slate-50 text-sm h-9 focus:bg-white"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 block">Telefone (Opcional)</label>
                            <Input 
                              placeholder="Ex: (54) 99999-8888" 
                              value={quickTelefone}
                              onChange={e => setQuickTelefone(e.target.value)}
                              className="border-slate-200 bg-slate-50 text-sm h-9 focus:bg-white"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end pt-2">
                          <Button 
                            type="submit" 
                            className="bg-[hsl(28_85%_45%)] hover:bg-[hsl(28_85%_40%)] text-white text-xs font-bold h-9 px-4"
                          >
                            Avançar para o Construtor
                          </Button>
                        </div>
                      </form>
                    )}
                  </>
                )}
              </div>
            )}

            {/* FASE 2: Construtor do Orçamento */}
            {selectedProjectId && (
              <div className="pt-2">
                <QuoteBuilder 
                  projectId={selectedProjectId}
                  onSuccess={handleCreateSuccess}
                  onCancel={handleCancelCreate}
                />
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
