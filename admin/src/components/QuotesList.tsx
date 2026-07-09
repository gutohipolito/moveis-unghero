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
  Clock,
  AlertTriangle,
  Plus,
  Loader2,
  ChevronLeft,
  FolderKanban,
  UserRound,
  UserPlus,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ActionDialogHost, useActionDialog } from "@/components/ActionDialogHost";
import { Dialog } from "@/components/ui/dialog";
import { PHONE_PLACEHOLDER } from "@/lib/phone";
import { 
  deleteQuote,
  getProjectsForQuotes, 
  getQuotes,
  createProjectForClient,
  createQuickClientAndProject
} from "@/app/actions/quotes";
import { getClients } from "@/app/actions/cliente";
import QuoteBuilder from "@/components/QuoteBuilder";
import PageHeader from "@/components/PageHeader";

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
  bairro?: string | null;
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
  const dialog = useActionDialog();
  const { showSuccess, showError, confirmAction } = dialog;
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
      showSuccess("Projeto vinculado", "Orçamento iniciado para o cliente selecionado.");
    } else {
      showError("Erro ao vincular", res.error || "Erro ao inicializar orçamento para o cliente.");
    }
    setIsGeneratingProject(false);
  };

  const handleCreateQuickClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNome || !quickCidade) {
      showError("Campos obrigatórios", "Preencha o nome e a cidade do cliente.");
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
      showSuccess("Cadastro criado", `${quickNome} foi cadastrado e o orçamento foi iniciado.`);
    } else {
      showError("Erro ao cadastrar", res.error || "Erro ao criar cadastro avulso.");
    }
    setIsGeneratingProject(false);
  };

  const handleCreateSuccess = async (newQuoteData?: any) => {
    const res = await getQuotes();
    if (res.success) {
      setQuotes(res.data as any || []);
    }

    if (newQuoteData?.quote?.id) {
      window.open(`/quotes/${newQuoteData.quote.id}/print`, "_blank");
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

  const handleBackToSelection = () => {
    setSelectedProjectId(null);
  };

  const creationModes = [
    { id: "PROJECT" as const, label: "Projeto", icon: FolderKanban },
    { id: "CLIENT" as const, label: "Cliente", icon: UserRound },
    { id: "QUICK" as const, label: "Avulso", icon: UserPlus },
  ];

  const handleDeleteQuote = (projectId: string, quoteId: string, version: number) => {
    confirmAction({
      title: "Excluir orçamento?",
      message: `A versão ${version} será removida permanentemente. Esta ação não pode ser desfeita.`,
      confirmLabel: "Sim, excluir",
      onConfirm: async () => {
        const res = await deleteQuote(projectId, quoteId, version);
        if (res.success) {
          setQuotes((prev) => prev.filter((q) => q.id !== quoteId));
          showSuccess("Orçamento excluído", `A versão ${version} foi removida com sucesso.`);
        } else {
          showError("Erro ao excluir", (res as { error?: string }).error || "Erro ao excluir orçamento.");
        }
      },
    });
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
      `orc-${q.id.substring(0, 5)}`.toLowerCase().includes(search.toLowerCase()) ||
      q.project.client.cidade.toLowerCase().includes(search.toLowerCase()) ||
      (q.project.client.bairro && q.project.client.bairro.toLowerCase().includes(search.toLowerCase()));

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
      <PageHeader
        title="Orçamentos"
        description="Propostas comerciais e orçamentos emitidos para clientes."
        actions={
          <Button onClick={handleOpenCreateModal} className="btn-metallic gap-1.5">
            <Plus className="h-4 w-4" />
            Novo orçamento
          </Button>
        }
      />

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
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Bairro</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Validade</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status Validade</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Valor Final</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-sm">
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
                        {q.project.client.bairro || "Não informado"}
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
      <Dialog
        isOpen={isCreateOpen}
        onClose={handleCancelCreate}
        className={selectedProjectId ? "max-w-5xl modal-panel-quote" : "max-w-lg"}
        viewportClassName={selectedProjectId ? "modal-viewport-quote" : undefined}
        bodyClassName="px-4 py-4 sm:px-5 sm:py-5"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 border-b border-slate-100 pb-4 pr-8">
            {selectedProjectId ? (
              <button
                type="button"
                onClick={handleBackToSelection}
                className="mt-0.5 shrink-0 rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 transition-colors"
                aria-label="Voltar para seleção"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            ) : null}
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-bold text-slate-800 leading-tight">
                {selectedProjectId ? "Montar proposta comercial" : "Novo orçamento"}
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {selectedProjectId
                  ? "Adicione itens, defina validade e salve para gerar o PDF."
                  : "Escolha como vincular o orçamento antes de montar a proposta."}
              </p>
            </div>
          </div>

          {!selectedProjectId && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {creationModes.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-all cursor-pointer ${
                      creationMode === id
                        ? "border-primary/30 bg-primary/5 text-foreground shadow-xs"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800"
                    }`}
                    onClick={() => handleModeChange(id)}
                    disabled={isGeneratingProject}
                  >
                    <Icon className={`h-4 w-4 ${creationMode === id ? "text-primary" : ""}`} />
                    <span className="text-[11px] font-bold leading-tight">{label}</span>
                  </button>
                ))}
              </div>

              {isGeneratingProject ? (
                <div className="py-10 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                  <span className="text-sm font-semibold">Preparando orçamento...</span>
                </div>
              ) : (
                <>
                  {creationMode === "PROJECT" && (
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          placeholder="Buscar projeto por cliente..."
                          className="pl-9 bg-slate-50 border-slate-200 text-sm h-10"
                          value={searchProject}
                          onChange={(e) => setSearchProject(e.target.value)}
                        />
                      </div>

                      {loadingProjects ? (
                        <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          <span className="text-sm">Carregando projetos...</span>
                        </div>
                      ) : (
                        <ul className="max-h-56 sm:max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                          {projects.filter((p) =>
                            p.client.nome.toLowerCase().includes(searchProject.toLowerCase())
                          ).length === 0 ? (
                            <li className="p-4 text-center text-sm text-slate-400">
                              Nenhum projeto encontrado.
                            </li>
                          ) : (
                            projects
                              .filter((p) =>
                                p.client.nome.toLowerCase().includes(searchProject.toLowerCase())
                              )
                              .map((p) => (
                                <li key={p.id}>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedProjectId(p.id)}
                                    className="w-full p-3 sm:p-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50 transition-colors"
                                  >
                                    <div className="min-w-0">
                                      <strong className="text-sm text-slate-800 block truncate">
                                        {p.client.nome}
                                      </strong>
                                      <span className="text-xs text-slate-400">
                                        {p.client.cidade}
                                      </span>
                                    </div>
                                    <span className="shrink-0 text-[10px] font-bold bg-amber-500/10 text-amber-700 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase">
                                      {p.status_geral}
                                    </span>
                                  </button>
                                </li>
                              ))
                          )}
                        </ul>
                      )}
                    </div>
                  )}

                  {creationMode === "CLIENT" && (
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          placeholder="Buscar cliente..."
                          className="pl-9 bg-slate-50 border-slate-200 text-sm h-10"
                          value={searchClient}
                          onChange={(e) => setSearchClient(e.target.value)}
                        />
                      </div>

                      {loadingClients ? (
                        <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          <span className="text-sm">Carregando clientes...</span>
                        </div>
                      ) : (
                        <ul className="max-h-56 sm:max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                          {clientsList.filter(
                            (c) =>
                              c.nome.toLowerCase().includes(searchClient.toLowerCase()) ||
                              c.email.toLowerCase().includes(searchClient.toLowerCase())
                          ).length === 0 ? (
                            <li className="p-4 text-center text-sm text-slate-400">
                              Nenhum cliente encontrado.
                            </li>
                          ) : (
                            clientsList
                              .filter(
                                (c) =>
                                  c.nome.toLowerCase().includes(searchClient.toLowerCase()) ||
                                  c.email.toLowerCase().includes(searchClient.toLowerCase())
                              )
                              .map((c) => (
                                <li key={c.id}>
                                  <button
                                    type="button"
                                    onClick={() => handleSelectClient(c.id)}
                                    className="w-full p-3 sm:p-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50 transition-colors"
                                  >
                                    <div className="min-w-0">
                                      <strong className="text-sm text-slate-800 block truncate">
                                        {c.nome}
                                      </strong>
                                      <span className="text-xs text-slate-400 truncate block">
                                        {c.cidade}
                                        {c.telefone ? ` · ${c.telefone}` : ""}
                                      </span>
                                    </div>
                                    <span className="shrink-0 text-[10px] font-semibold text-primary">
                                      Selecionar
                                    </span>
                                  </button>
                                </li>
                              ))
                          )}
                        </ul>
                      )}
                    </div>
                  )}

                  {creationMode === "QUICK" && (
                    <form
                      onSubmit={handleCreateQuickClient}
                      className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500">Nome *</label>
                          <Input
                            required
                            placeholder="Nome do cliente"
                            value={quickNome}
                            onChange={(e) => setQuickNome(e.target.value)}
                            className="bg-white border-slate-200 text-sm h-10"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500">Cidade *</label>
                          <Input
                            required
                            placeholder="Cidade"
                            value={quickCidade}
                            onChange={(e) => setQuickCidade(e.target.value)}
                            className="bg-white border-slate-200 text-sm h-10"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500">E-mail</label>
                          <Input
                            type="email"
                            placeholder="Opcional"
                            value={quickEmail}
                            onChange={(e) => setQuickEmail(e.target.value)}
                            className="bg-white border-slate-200 text-sm h-10"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500">Telefone</label>
                          <Input
                            type="tel"
                            placeholder={PHONE_PLACEHOLDER}
                            value={quickTelefone}
                            onChange={(e) => setQuickTelefone(e.target.value)}
                            className="bg-white border-slate-200 text-sm h-10"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <Button type="submit" className="w-full sm:w-auto font-semibold">
                          Continuar para o construtor
                        </Button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </div>
          )}

          {selectedProjectId && (
            <QuoteBuilder
              embedded
              projectId={selectedProjectId}
              companyId={companyId}
              onSuccess={handleCreateSuccess}
              onCancel={handleCancelCreate}
            />
          )}
        </div>
      </Dialog>
      <ActionDialogHost dialog={dialog} />
    </div>
  );
}
