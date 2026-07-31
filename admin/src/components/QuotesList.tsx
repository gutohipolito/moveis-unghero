"use client";

import React, { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { 
  Search, 
  Trash2, 
  ExternalLink, 
  Printer, 
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
  PencilLine,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ActionDialogHost, useActionDialog } from "@/components/ActionDialogHost";
import { Dialog } from "@/components/ui/dialog";
import { Pagination } from "@/components/ui/pagination";
import { PrivacyMoney } from "@/components/privacy/PrivacyMoney";
import { usePermissions } from "@/context/PermissionsContext";
import { 
  deleteQuote,
  getProjectsForQuotes, 
  getQuotes,
  createProjectForClient,
  createQuickClientAndProject
} from "@/app/actions/quotes";
import { updateUserPreference } from "@/app/actions/preferences";
import { getQuotesLiveSnapshot } from "@/app/actions/liveSnapshots";
import { useLiveEntity } from "@/context/LiveSyncContext";
import { formatDateBR, toISODateBR } from "@/lib/brazilDate";
import { getClients } from "@/app/actions/cliente";
import QuoteBuilder from "@/components/QuoteBuilder";
import QuoteItemPresetsManager from "@/components/quotes/QuoteItemPresetsManager";
import QuoteApprovalDialog from "@/components/quotes/QuoteApprovalDialog";
import { formatQuoteCodigo } from "@/lib/quoteCodigo";
import PageHeader from "@/components/PageHeader";
import { TooltipBody } from "@/components/ui/InfoTooltip";
import { summarizeQuoteItems, quoteCommercialLabel } from "@/lib/quoteApproval";

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100];

interface QuoteItem {
  id: string;
  descricao: string;
  quantidade: number;
  tipo_custo: string;
  valor_unitario: number;
  valor_total: number;
  status?: string | null;
  aprovado_em?: string | Date | null;
  subitens?: string[] | null;
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
  codigo?: string | null;
  template_tipo?: string | null;
  subtotal: number;
  desconto: number;
  valor_final: number;
  validade: Date | string;
  createdAt?: Date | string | null;
  aprovado_em?: string | Date | null;
  observacoes: string | null;
  project: Project;
  items: QuoteItem[];
}

interface QuotesListProps {
  initialQuotes: Quote[];
  companyId: string;
  initialPageSize?: number;
}

export default function QuotesList({
  initialQuotes,
  companyId,
  initialPageSize = 20,
}: QuotesListProps) {
  const { isAdmin, isReadOnly } = usePermissions();
  const [quotes, setQuotes] = useState<Quote[]>(initialQuotes);
  const dialog = useActionDialog();
  const { showSuccess, showError, confirmAction } = dialog;
  const [search, setSearch] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ACTIVE" | "EXPIRED" | "APPROVED" | "PARTIAL">("ALL");
  const [sortBy, setSortBy] = useState<"client" | "bairro" | "validade" | "status" | "valor" | "criacao">("validade");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approvalQuote, setApprovalQuote] = useState<Quote | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

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
    if (isApproved && !isAdmin) {
      showError("Não permitido", "Orçamentos aprovados só podem ser excluídos por um administrador.");
      return;
    }
    confirmAction({
      title: isApproved ? "Excluir orçamento aprovado?" : "Excluir orçamento?",
      message: isApproved
        ? `A versão ${version} está aprovada e será removida permanentemente. Esta ação não pode ser desfeita.`
        : `A versão ${version} será removida permanentemente. Esta ação não pode ser desfeita.`,
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
    if (approvingId) return;
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

  const formatDate = (dateInput: Date | string) => formatDateBR(dateInput);

  const isExpired = (dateInput: Date | string) => {
    return toISODateBR(dateInput) < toISODateBR();
  };

  // Dias restantes até a validade (0 = vence hoje, negativo = vencido)
  const getDaysUntilExpiry = (dateInput: Date | string) => {
    const target = toISODateBR(dateInput);
    const today = toISODateBR();
    const [ty, tm, td] = target.split("-").map(Number);
    const [yy, ym, yd] = today.split("-").map(Number);
    const targetUtc = Date.UTC(ty, tm - 1, td);
    const todayUtc = Date.UTC(yy, ym - 1, yd);
    return Math.round((targetUtc - todayUtc) / (1000 * 60 * 60 * 24));
  };

  // Filtragem
  const filteredQuotes = quotes.filter(q => {
    const code = formatQuoteCodigo(q).toLowerCase();
    const matchesSearch = 
      q.project.client.nome.toLowerCase().includes(search.toLowerCase()) ||
      q.id.toLowerCase().includes(search.toLowerCase()) ||
      code.includes(search.toLowerCase()) ||
      q.project.client.cidade.toLowerCase().includes(search.toLowerCase()) ||
      (q.project.client.bairro && q.project.client.bairro.toLowerCase().includes(search.toLowerCase()));

    const expired = isExpired(q.validade);
    const summary = summarizeQuoteItems(
      (q.items || []).map((i) => ({
        id: i.id,
        valor_total: Number(i.valor_total),
        status: i.status,
      }))
    );
    const matchesStatus =
      filterStatus === "ALL" ||
      (filterStatus === "APPROVED" &&
        (summary.isFullyApproved || (Boolean(q.aprovado_em) && !summary.hasPending))) ||
      (filterStatus === "PARTIAL" && summary.isPartiallyApproved) ||
      (filterStatus === "ACTIVE" && !expired && summary.hasPending) ||
      (filterStatus === "EXPIRED" && expired && summary.hasPending);

    const createdKey = q.createdAt ? toISODateBR(q.createdAt) : "";
    const matchesCreatedFrom = !createdFrom || (createdKey !== "" && createdKey >= createdFrom);
    const matchesCreatedTo = !createdTo || (createdKey !== "" && createdKey <= createdTo);

    return matchesSearch && matchesStatus && matchesCreatedFrom && matchesCreatedTo;
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
    } else if (sortBy === "criacao") {
      valA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      valB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    } else if (sortBy === "status") {
      const getStatusPriority = (q: Quote) => {
        const summary = summarizeQuoteItems(
          (q.items || []).map((i) => ({
            id: i.id,
            valor_total: Number(i.valor_total),
            status: i.status,
          }))
        );
        if (summary.isFullyApproved || (Boolean(q.aprovado_em) && !summary.hasPending)) return 4;
        if (summary.isPartiallyApproved) return 3;
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

  useEffect(() => {
    setPage(1);
  }, [search, createdFrom, createdTo, filterStatus, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sortedQuotes.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedQuotes = sortedQuotes.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
    void updateUserPreference("quotesPageSize", size);
  };

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
              "Indicadores de valor ficam em Relatórios.",
            ]}
          />
        }
        actions={
          <div className="flex items-center gap-2">
            {!isReadOnly && (
              <>
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
              </>
            )}
          </div>
        } />

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
            <Button
              variant={filterStatus === "PARTIAL" ? "default" : "outline"}
              className={filterStatus === "PARTIAL" ? "bg-amber-600 hover:bg-amber-700 text-white" : "border-slate-200 text-amber-700 hover:bg-amber-50"}
              size="sm"
              onClick={() => setFilterStatus("PARTIAL")}
            >
              Parciais
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="space-y-1 flex-1 min-w-0">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Data de criação (de)
            </label>
            <Input
              type="date"
              value={createdFrom}
              onChange={(e) => setCreatedFrom(e.target.value)}
              className="bg-slate-50 border-slate-200 focus:bg-white focus:border-[hsl(28_85%_45%)]"
            />
          </div>
          <div className="space-y-1 flex-1 min-w-0">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Data de criação (até)
            </label>
            <Input
              type="date"
              value={createdTo}
              min={createdFrom || undefined}
              onChange={(e) => setCreatedTo(e.target.value)}
              className="bg-slate-50 border-slate-200 focus:bg-white focus:border-[hsl(28_85%_45%)]"
            />
          </div>
          {(createdFrom || createdTo) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-slate-200 text-slate-600 hover:bg-slate-50 shrink-0"
              onClick={() => {
                setCreatedFrom("");
                setCreatedTo("");
              }}
            >
              Limpar datas
            </Button>
          )}
        </div>

        {/* Ordenação */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Organizar por:</span>
          {([
            { key: "client", label: "Cliente" },
            { key: "bairro", label: "Bairro" },
            { key: "criacao", label: "Criação" },
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
          <table className="w-full min-w-0 table-fixed text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="py-2.5 px-2.5 sm:px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[7%]">COD</th>
                <th className="py-2.5 px-2.5 sm:px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[18%]">Cliente</th>
                <th className="py-2.5 px-2.5 sm:px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[10%] hidden lg:table-cell">Cidade</th>
                <th className="py-2.5 px-2.5 sm:px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[10%] hidden xl:table-cell">Bairro</th>
                <th className="py-2.5 px-2.5 sm:px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[9%]">Validade</th>
                <th className="py-2.5 px-2.5 sm:px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[11%]">Status</th>
                <th className="py-2.5 px-2.5 sm:px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[10%]">Valor</th>
                <th className="py-2.5 px-2.5 sm:px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right w-[25%]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedQuotes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-sm">
                    Nenhum orçamento encontrado.
                  </td>
                </tr>
              ) : (
                pagedQuotes.map((q) => {
                  const expired = isExpired(q.validade);
                  const daysLeft = getDaysUntilExpiry(q.validade);
                  const summary = summarizeQuoteItems(
                    (q.items || []).map((i) => ({
                      id: i.id,
                      valor_total: Number(i.valor_total),
                      status: i.status,
                    }))
                  );
                  const hasPending = summary.hasPending;
                  const isPartial = summary.isPartiallyApproved;
                  // Aprovado comercialmente: sem pendências (mesmo com itens recusados) ou marcador legado.
                  const isFullyApproved =
                    summary.isFullyApproved || (Boolean(q.aprovado_em) && !hasPending);
                  const statusLabel = quoteCommercialLabel(summary);
                  // Validade só importa enquanto ainda há o que aprovar.
                  const rowExpired = expired && hasPending && !isFullyApproved;
                  const nearDanger = hasPending && !expired && daysLeft <= 3;
                  const nearWarning = hasPending && !expired && daysLeft > 3 && daysLeft <= 7;

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
                      <td className="py-3 px-2.5 sm:px-3 text-sm font-medium text-slate-700">
                        <span className="font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[11px] truncate inline-block max-w-full">
                          {formatQuoteCodigo(q)}
                        </span>
                      </td>
                      <td className="py-3 px-2.5 sm:px-3 text-sm text-slate-800 font-semibold min-w-0">
                        <span className="block truncate" title={q.project.client.nome}>
                          {q.project.client.nome}
                        </span>
                        <span className="block truncate text-[11px] font-normal text-slate-500 lg:hidden">
                          {q.project.client.cidade}
                          {q.project.client.bairro ? ` · ${q.project.client.bairro}` : ""}
                        </span>
                      </td>
                      <td className="py-3 px-2.5 sm:px-3 text-sm text-slate-600 hidden lg:table-cell min-w-0">
                        <span className="block truncate" title={q.project.client.cidade}>
                          {q.project.client.cidade}
                        </span>
                      </td>
                      <td className="py-3 px-2.5 sm:px-3 text-sm text-slate-600 hidden xl:table-cell min-w-0">
                        <span className="block truncate" title={q.project.client.bairro || "Não informado"}>
                          {q.project.client.bairro || "Não informado"}
                        </span>
                      </td>
                      <td className={`py-3 px-2.5 sm:px-3 text-sm whitespace-nowrap ${!hasPending || isFullyApproved ? "text-slate-400" : dateClass}`}>
                        {!hasPending || isFullyApproved ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            {formatDate(q.validade)}
                            {nearWarning && (
                              <span className="text-[10px] font-semibold text-amber-600">
                                ({daysLeft}d)
                              </span>
                            )}
                            {nearDanger && (
                              <span className="text-[10px] font-semibold text-rose-600">
                                ({daysLeft <= 0 ? "hoje" : `${daysLeft}d`})
                              </span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2.5 sm:px-3 text-sm min-w-0">
                        {isFullyApproved ? (
                          <span className="inline-flex items-center gap-1 bg-indigo-500/10 text-indigo-700 px-2 py-0.5 rounded-full text-[11px] font-bold">
                            ✓ Aprovado
                          </span>
                        ) : isPartial ? (
                          <span className="inline-flex flex-col items-start gap-0.5 min-w-0">
                            <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-800 px-2 py-0.5 rounded-full text-[11px] font-bold">
                              {statusLabel}
                            </span>
                            <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1 flex-wrap">
                              <PrivacyMoney value={summary.approvedTotal} /> aprov.
                              {rowExpired ? (
                                <span className="text-rose-600 font-semibold">· pend. vencido</span>
                              ) : (
                                <>
                                  {" "}
                                  · <PrivacyMoney value={summary.pendingTotal} /> pend.
                                </>
                              )}
                            </span>
                          </span>
                        ) : expired ? (
                          <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-600 px-2 py-0.5 rounded-full text-[11px] font-medium">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            Vencido
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full text-[11px] font-medium">
                            <Clock className="h-3 w-3 shrink-0" />
                            Ativo
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2.5 sm:px-3 text-sm text-slate-800 font-bold whitespace-nowrap">
                        <PrivacyMoney value={q.valor_final} className="inline-block" />
                      </td>
                      <td className="py-3 px-2.5 sm:px-3 text-sm text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {!isReadOnly && hasPending && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 hover:text-emerald-700 inline-flex items-center gap-1 h-8 px-2 shrink-0 disabled:opacity-50 active:scale-100"
                              onClick={() => handleApproveQuote(q)}
                              disabled={approvingId === q.id}
                              title="Registrar aprovação"
                            >
                              <CheckCircle2 className={`h-3.5 w-3.5 ${approvingId === q.id ? "animate-pulse" : ""}`} />
                              <span className="hidden 2xl:inline">{isPartial ? "Aprovar itens" : "Aprovar"}</span>
                            </Button>
                          )}
                          {!isReadOnly && hasPending && (
                            <Link
                              href={`/projects/${q.project_id}?tab=quotes&editQuote=${q.id}`}
                              className="shrink-0"
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-amber-500/30 bg-amber-500/10 text-amber-800 hover:bg-amber-500/20 h-8 px-2"
                                title="Editar proposta completa (mesma versão)"
                              >
                                <PencilLine className="h-3.5 w-3.5" />
                                <span className="hidden 2xl:inline ml-1">Editar</span>
                              </Button>
                            </Link>
                          )}

                          {isReadOnly ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled
                              className="border-slate-200 text-slate-400 h-8 shrink-0 inline-flex items-center gap-1.5 cursor-not-allowed px-2"
                              title="Conta somente leitura: visualização de PDF bloqueada"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                          <Link
                            href={`/quotes/${q.id}/print`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0"
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-slate-200 text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1 h-8 px-2 active:scale-100"
                              title="Visualizar PDF / Imprimir"
                            >
                              <Printer className="h-3.5 w-3.5" />
                              <span className="hidden 2xl:inline">PDF</span>
                            </Button>
                          </Link>
                          )}

                          <Link
                            href={`/projects/${q.project_id}`}
                            className="shrink-0"
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-slate-200 text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1 h-8 px-2 active:scale-100"
                              title="Ver Detalhes do Projeto"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              <span className="hidden 2xl:inline">Projeto</span>
                            </Button>
                          </Link>

                          {!isReadOnly && (!summary.hasApproved || isAdmin) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 h-8 px-2 shrink-0 active:scale-100"
                              onClick={() => handleDeleteQuote(q.project_id, q.id, q.versao, summary.hasApproved)}
                              title={summary.hasApproved ? "Excluir orçamento aprovado (admin)" : "Excluir Orçamento"}
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

      {sortedQuotes.length > 0 ? (
        <Pagination
          page={currentPage}
          pageSize={pageSize}
          total={sortedQuotes.length}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          itemLabel="orçamentos"
        />
      ) : null}

      {/* ─── MODAL: CRIAR NOVO ORÇAMENTO ─── */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={handleCancelCreate}
        className={selectedProjectId ? "max-w-7xl modal-panel-quote" : "max-w-lg"}
        viewportClassName={selectedProjectId ? "modal-viewport-quote" : undefined}
        bodyClassName="px-4 py-4 sm:px-6 sm:py-6"
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
      <QuoteApprovalDialog
        open={!!approvalQuote}
        onClose={() => setApprovalQuote(null)}
        quote={
          approvalQuote
            ? {
                id: approvalQuote.id,
                project_id: approvalQuote.project_id,
                versao: approvalQuote.versao,
                subtotal: approvalQuote.subtotal,
                desconto: approvalQuote.desconto,
                clientName: approvalQuote.project.client.nome,
                template_tipo: approvalQuote.template_tipo,
                items: approvalQuote.items || [],
              }
            : null
        }
        onRequestEdit={
          approvalQuote
            ? () => {
                window.location.href = `/projects/${approvalQuote.project_id}?tab=quotes&editQuote=${approvalQuote.id}`;
              }
            : undefined
        }
        onApproved={({ remainingPending, valorAprovado }) => {
          showSuccess(
            remainingPending > 0 ? "Aprovação parcial registrada" : "Proposta aprovada",
            remainingPending > 0
              ? `R$ ${valorAprovado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} aprovados. Ainda restam ${remainingPending} item(ns).`
              : `Versão ${approvalQuote?.versao ?? ""} aprovada com sucesso.`
          );
          syncQuotes();
        }}
      />
      <ActionDialogHost dialog={dialog} />
    </div>
  );
}
