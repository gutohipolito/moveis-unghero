"use client";

import React, { useState, useCallback } from "react";
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
  ArrowUpAZ,
  ArrowDownZA,
  Bookmark,
  CheckCircle2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ActionDialogHost, useActionDialog } from "@/components/ActionDialogHost";
import { Dialog } from "@/components/ui/dialog";
import { 
  approveQuote,
  deleteQuote,
  getProjectsForQuotes, 
  getQuotes,
  createProjectForClient,
  createQuickClientAndProject
} from "@/app/actions/quotes";
import { getQuotesLiveSnapshot } from "@/app/actions/liveSnapshots";
import { useLiveEntity } from "@/context/LiveSyncContext";
import { getClients } from "@/app/actions/cliente";
import QuoteBuilder from "@/components/QuoteBuilder";
import QuoteItemPresetsManager from "@/components/quotes/QuoteItemPresetsManager";
import PageHeader from "@/components/PageHeader";
import { TooltipBody } from "@/components/ui/InfoTooltip";
import PrivacyToggle from "@/components/PrivacyToggle";

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
  aprovado_em?: string | Date | null;
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
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ACTIVE" | "EXPIRED" | "APPROVED">("ALL");
  const [sortBy, setSortBy] = useState<"client" | "bairro" | "validade" | "status" | "valor">("validade");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Estados para criação direta de Orçamento
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
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

  const syncQuotes = useCallback(async () => {
    const result = await getQuotesLiveSnapshot();
    if (result.success && result.quotes) {
      setQuotes(result.quotes as Quote[]);
    }
  }, []);

  useLiveEntity("quotes", {
    sync: syncQuotes,
    enabled: !isCreateOpen && !isGeneratingProject,
  });

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

  const handleDeleteQuote = (
    projectId: string,
    quoteId: string,
    version: number,
    isApproved?: boolean
  ) => {
    if (isApproved) {
      showError("Não permitido", "Orçamentos aprovados não podem ser excluídos.");
      return;
    }
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

  const handleApproveQuote = (quote: Quote) => {
    if (quote.aprovado_em || approvingId) return;

    confirmAction({
      title: "Aprovar proposta?",
      message: `A versão ${quote.versao} de ${quote.project.client.nome} será aprovada e o projeto passará para o status Aprovado.`,
      confirmLabel: "Sim, aprovar",
      onConfirm: async () => {
        setApprovingId(quote.id);
        const approvedAt = new Date().toISOString();
        // Atualização otimista: aprova este e desaprova os demais do mesmo projeto.
        setQuotes((prev) =>
          prev.map((q) =>
            q.project_id === quote.project_id
              ? { ...q, aprovado_em: q.id === quote.id ? approvedAt : null }
              : q
          )
        );

        const res = await approveQuote(quote.project_id, quote.id, quote.versao);
        setApprovingId(null);

        if (res.success) {
          showSuccess("Proposta aprovada", `Versão ${quote.versao} aprovada com sucesso.`);
          syncQuotes();
        } else {
          showError("Erro ao aprovar", res.error ?? "Não foi possível aprovar a proposta.");
          syncQuotes();
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

  // Dias restantes até a validade (0 = vence hoje, negativo = vencido)
  const getDaysUntilExpiry = (dateInput: Date | string) => {
    const d = new Date(dateInput);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
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
      (filterStatus === "APPROVED" && q.aprovado_em !== null && q.aprovado_em !== undefined) ||
      (filterStatus === "ACTIVE" && !expired && !q.aprovado_em) ||
      (filterStatus === "EXPIRED" && expired && !q.aprovado_em);

    return matchesSearch && matchesStatus;
  });

  // Ordenação
  const sortedQuotes = [...filteredQuotes].sort((a, b) => {
    let valA: any = "";
    let valB: any = "";

    if (sortBy === "client") {
      valA = a.project.client.nome.toLowerCase();
      valB = b.project.client.nome.toLowerCase();
    } else if (sortBy === "bairro") {
      valA = (a.project.client.bairro || "").toLowerCase();
      valB = (b.project.client.bairro || "").toLowerCase();
    } else if (sortBy === "validade") {
      valA = new Date(a.validade).getTime();
      valB = new Date(b.validade).getTime();
    } else if (sortBy === "status") {
      const getStatusPriority = (q: Quote) => {
        if (q.aprovado_em) return 3;
        if (isExpired(q.validade)) return 1;
        return 2;
      };
      valA = getStatusPriority(a);
      valB = getStatusPriority(b);
    } else if (sortBy === "valor") {
      valA = a.valor_final;
      valB = b.valor_final;
    }

    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Métricas
  const totalValue = filteredQuotes.reduce((acc, q) => acc + q.valor_final, 0);
  
  const approvedQuotes = filteredQuotes.filter(q => q.aprovado_em !== null && q.aprovado_em !== undefined);
  const totalApprovedValue = approvedQuotes.reduce((acc, q) => acc + q.valor_final, 0);
  
  const averageValue = approvedQuotes.length > 0 ? totalApprovedValue / approvedQuotes.length : 0;
  const expiredCount = filteredQuotes.filter(q => isExpired(q.validade) && !q.aprovado_em).length;
  const activeCount = filteredQuotes.filter(q => !isExpired(q.validade) && !q.aprovado_em).length;
  const approvedCount = approvedQuotes.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orçamentos"
        description="Propostas comerciais e orçamentos emitidos para clientes."
        help={
          <TooltipBody
            title="Propostas comerciais"
            items={[
              "Crie orçamentos com itens livres ou reutilizando itens salvos.",
              "Vincule um arquiteto e escolha o modelo antes de gerar o PDF.",
              "Aprovar um orçamento gera as parcelas em Contas a Receber.",
              "A validade muda de cor conforme se aproxima do vencimento.",
            ]}
          />
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsPresetsOpen(true)}
              variant="outline"
              className="gap-1.5"
              title="Gerenciar itens salvos para reutilizar nos orçamentos"
            >
              <Bookmark className="h-4 w-4" />
              <span className="hidden sm:inline">Itens salvos</span>
            </Button>
            <Button onClick={handleOpenCreateModal} className="btn-metallic gap-1.5">
              <Plus className="h-4 w-4" />
              Novo orçamento
            </Button>
          </div>
        }
      >
        <PrivacyToggle />
      </PageHeader>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-4 bg-white border border-slate-100 shadow-sm">
          <div className="p-3 bg-amber-500/10 rounded-lg text-amber-600">
            <Calculator className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Emitido</p>
            <p className="text-xl font-bold text-slate-800">{filteredQuotes.length} orçamentos</p>
            <p className="text-xs text-slate-400">{activeCount} ativos / {expiredCount} vencidos / {approvedCount} aprovados</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 bg-white border border-slate-100 shadow-sm">
          <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-600">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor Total</p>
            <p className="text-xl font-bold text-slate-800 privacy-value">{formatCurrency(totalValue)}</p>
            <p className="text-xs text-emerald-650">Soma de propostas filtradas</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 bg-white border border-slate-100 shadow-sm">
          <div className="p-3 bg-indigo-500/10 rounded-lg text-indigo-650">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor Aprovados</p>
            <p className="text-xl font-bold text-slate-800 privacy-value">{formatCurrency(totalApprovedValue)}</p>
            <p className="text-xs text-indigo-600 font-medium">Soma de propostas fechadas</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 bg-white border border-slate-100 shadow-sm">
          <div className="p-3 bg-blue-500/10 rounded-lg text-blue-600">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ticket Médio (Aprovados)</p>
            <p className="text-xl font-bold text-slate-800 privacy-value">{formatCurrency(averageValue)}</p>
            <p className="text-xs text-slate-400">Média por proposta aprovada</p>
          </div>
        </Card>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col gap-3 bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar por cliente ou ID do orçamento..." 
              className="pl-9 bg-slate-50 border-slate-200 focus:bg-white focus:border-[hsl(28_85%_45%)]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
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
              className={filterStatus === "ACTIVE" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"}
              size="sm"
              onClick={() => setFilterStatus("ACTIVE")}
            >
              Ativos
            </Button>
            <Button 
              variant={filterStatus === "EXPIRED" ? "default" : "outline"} 
              className={filterStatus === "EXPIRED" ? "bg-rose-600 hover:bg-rose-700 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"}
              size="sm"
              onClick={() => setFilterStatus("EXPIRED")}
            >
              Vencidos
            </Button>
            <Button 
              variant={filterStatus === "APPROVED" ? "default" : "outline"} 
              className={filterStatus === "APPROVED" ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "border-slate-200 text-indigo-600 hover:bg-indigo-50"}
              size="sm"
              onClick={() => setFilterStatus("APPROVED")}
            >
              Aprovados
            </Button>
          </div>
        </div>

        {/* Ordenação */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Organizar por:</span>
          {([
            { key: "client", label: "Cliente" },
            { key: "bairro", label: "Bairro" },
            { key: "validade", label: "Validade" },
            { key: "status", label: "Status" },
            { key: "valor", label: "Valor" },
          ] as const).map(opt => (
            <button
              key={opt.key}
              onClick={() => {
                if (sortBy === opt.key) {
                  setSortOrder(prev => prev === "asc" ? "desc" : "asc");
                } else {
                  setSortBy(opt.key);
                  setSortOrder("asc");
                }
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
                sortBy === opt.key
                  ? "bg-[hsl(28_85%_45%)]/10 border-[hsl(28_85%_45%)]/40 text-[hsl(28_85%_30%)]"
                  : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
              }`}
            >
              {opt.label}
              {sortBy === opt.key ? (
                sortOrder === "asc" ? <ArrowUpAZ className="h-3 w-3" /> : <ArrowDownZA className="h-3 w-3" />
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Orçamentos */}
      <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">COD</th>
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
              {sortedQuotes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-sm">
                    Nenhum orçamento encontrado.
                  </td>
                </tr>
              ) : (
                sortedQuotes.map((q) => {
                  const expired = isExpired(q.validade);
                  const daysLeft = getDaysUntilExpiry(q.validade);
                  const isApproved = !!q.aprovado_em;
                  // Alerta de validade apenas para orçamentos ainda em aberto
                  const rowExpired = expired && !isApproved;
                  const nearDanger = !isApproved && !expired && daysLeft <= 3;
                  const nearWarning = !isApproved && !expired && daysLeft > 3 && daysLeft <= 7;

                  let dateClass = "text-slate-600";
                  if (rowExpired) dateClass = "text-rose-700 font-bold";
                  else if (nearDanger) dateClass = "text-rose-600 font-bold";
                  else if (nearWarning) dateClass = "text-amber-600 font-bold";

                  return (
                    <tr
                      key={q.id}
                      className={rowExpired ? "bg-rose-500/10" : undefined}
                      style={{ WebkitTapHighlightColor: "transparent" }}
                    >
                      <td className="py-4 px-4 text-sm font-medium text-slate-700">
                        <span className="font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-xs">
                          ORC-{q.id.substring(0, 5).toUpperCase()}
                        </span>
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
                      <td className={`py-4 px-4 text-sm ${isApproved ? "text-slate-400" : dateClass}`}>
                        {isApproved ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5">
                            {formatDate(q.validade)}
                            {nearWarning && (
                              <span className="text-[11px] font-semibold text-amber-600">
                                ({daysLeft}d)
                              </span>
                            )}
                            {nearDanger && (
                              <span className="text-[11px] font-semibold text-rose-600">
                                ({daysLeft <= 0 ? "hoje" : `${daysLeft}d`})
                              </span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-sm">
                        {q.aprovado_em ? (
                          <span className="inline-flex items-center gap-1 bg-indigo-500/10 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-bold">
                            ✓ Aprovado
                          </span>
                        ) : expired ? (
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
                        <span className="privacy-value">{formatCurrency(q.valor_final)}</span>
                      </td>
                      <td className="py-4 px-4 text-sm text-right">
                        {/* Largura fixa mantém o bloco de ações alinhado entre linhas aprovadas e ativas */}
                        <div className="flex items-center gap-2 w-[20.5rem] max-w-full ml-auto">
                          {!isApproved && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 hover:text-emerald-700 flex items-center gap-1.5 h-8 shrink-0 disabled:opacity-50"
                              onClick={() => handleApproveQuote(q)}
                              disabled={approvingId === q.id}
                              title="Aprovar proposta"
                            >
                              <CheckCircle2 className={`h-3.5 w-3.5 ${approvingId === q.id ? "animate-pulse" : ""}`} />
                              {approvingId === q.id ? "Aprovando..." : "Aprovar"}
                            </Button>
                          )}

                          <Link
                            href={`/quotes/${q.id}/print`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={isApproved ? "min-w-0 flex-1" : "shrink-0"}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className={`border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 h-8 ${
                                isApproved ? "w-full justify-center" : ""
                              }`}
                              title="Visualizar PDF / Imprimir"
                            >
                              <Printer className="h-3.5 w-3.5" />
                              PDF
                            </Button>
                          </Link>

                          <Link
                            href={`/projects/${q.project_id}`}
                            className={isApproved ? "min-w-0 flex-1" : "shrink-0"}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className={`border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 h-8 ${
                                isApproved ? "w-full justify-center" : ""
                              }`}
                              title="Ver Detalhes do Projeto"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Projeto
                            </Button>
                          </Link>

                          {!isApproved && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 h-8 px-2 shrink-0"
                              onClick={() => handleDeleteQuote(q.project_id, q.id, q.versao, isApproved)}
                              title="Excluir Orçamento"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
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
                            value={quickNome}
                            onChange={(e) => setQuickNome(e.target.value)}
                            className="bg-white border-slate-200 text-sm h-10"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500">Cidade *</label>
                          <Input
                            required
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
                            value={quickEmail}
                            onChange={(e) => setQuickEmail(e.target.value)}
                            className="bg-white border-slate-200 text-sm h-10"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500">Telefone</label>
                          <Input
                            type="tel"
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
      <QuoteItemPresetsManager isOpen={isPresetsOpen} onClose={() => setIsPresetsOpen(false)} />
      <ActionDialogHost dialog={dialog} />
    </div>
  );
}
