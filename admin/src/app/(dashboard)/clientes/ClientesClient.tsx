"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import InfoTooltip, { TooltipBody } from "@/components/ui/InfoTooltip";
import Link from "next/link";
import { 
  Plus, 
  Search, 
  Filter, 
  ChevronDown, 
  Edit, 
  Trash2, 
  MessageSquare, 
  Mail, 
  Phone, 
  MapPin, 
  PlusCircle,
  UserPlus,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  createClientAction, 
  updateClientAction, 
  deleteClientAction,
  getClientsPage,
  type ClientsListFacets,
} from "@/app/actions/cliente";
import { createLead, type Origin } from "@/app/actions/kanban";
import FilterPills from "@/components/FilterPills";
import { labelOrigin, labelStatus, labelProjectStatus, projectStatusChipClass, shortProjectCode } from "@/lib/navLabels";
import {
  resolveClientDocument,
  type TipoPessoa,
} from "@/lib/clientDocument";
import { ActionDialogHost, useActionDialog } from "@/components/ActionDialogHost";
import { Dialog } from "@/components/ui/dialog";
import { formatPhoneDisplay } from "@/lib/phone";
import { resolveClientLocation } from "@/lib/clientLocation";
import { useLiveEntity } from "@/context/LiveSyncContext";
import { usePrivacy } from "@/context/PrivacyContext";
import { maskPhone, maskEmail, maskDocument } from "@/lib/maskSensitive";
import { formatClientEmailDisplay, hasRealClientEmail } from "@/lib/clientMatch";
import { buildWhatsAppUrl, getFirstName } from "@/lib/google-review";
import { Pagination } from "@/components/ui/pagination";
import { updateUserPreference } from "@/app/actions/preferences";
import ClientWizard, { type ClientWizardData } from "./ClientWizard";
import ClienteEditWideForm from "@/components/clientes/ClienteEditWideForm";
import { usePermissions } from "@/context/PermissionsContext";
import { canManageClients } from "@/lib/permissions";
import { BlurSurnameName, ViewerBlurBox } from "@/components/ViewerPrivacy";

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100];
const NEW_CLIENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

interface ProjectSummary {
  id: string;
  status_geral: string;
  valor_previsto: number;
  quotes_count?: number;
}

function LinkedProjectChip({
  project,
  href,
  hideQuotesHint,
  blur,
}: {
  project: ProjectSummary;
  href?: string;
  hideQuotesHint?: boolean;
  blur?: boolean;
}) {
  const title = hideQuotesHint
    ? labelProjectStatus(project.status_geral)
    : `${labelProjectStatus(project.status_geral)}${
        (project.quotes_count ?? 0) > 0 ? ` · ${project.quotes_count} orçamento(s)` : ""
      }`;
  const chip = (
    <Link
      href={blur ? "#" : href ?? `/projects/${project.id}`}
      title={blur ? "Projeto oculto" : title}
      onClick={blur ? (e) => e.preventDefault() : undefined}
      tabIndex={blur ? -1 : undefined}
      className={`inline-flex items-center font-mono text-[10px] font-bold tracking-wide px-2 py-1 rounded-md border ${projectStatusChipClass(project.status_geral)}`}
    >
      #{shortProjectCode(project.id)}
    </Link>
  );
  return blur ? <ViewerBlurBox enabled>{chip}</ViewerBlurBox> : chip;
}

interface Client {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cidade: string;
  origem: Origin;
  status: string;
  tipo_pessoa?: TipoPessoa;
  cpf?: string | null;
  cnpj?: string | null;
  observacoes: string;
  cep?: string | null;
  endereco?: string | null;
  numero?: string | null;
  bairro?: string | null;
  uf?: string | null;
  tipo_imovel?: string | null;
  obs_imovel?: string | null;
  obs_entrega?: string | null;
  createdAt?: string | null;
  projects?: ProjectSummary[];
}

interface ClientesClientProps {
  initialClients: Client[];
  initialTotal: number;
  initialFacets: ClientsListFacets;
  companyId: string;
  initialPageSize?: number;
}

const ORIGINS: Origin[] = ["SITE", "INSTAGRAM", "INDICACAO", "GOOGLE", "WHATSAPP", "FACEBOOK", "FORMULARIO"];

const ORIGIN_BADGES: Record<Origin, { bg: string; text: string }> = {
  SITE: { bg: "bg-blue-500/10", text: "text-blue-600" },
  INSTAGRAM: { bg: "bg-pink-500/10", text: "text-pink-600" },
  INDICACAO: { bg: "bg-purple-500/10", text: "text-purple-600" },
  GOOGLE: { bg: "bg-cyan-500/10", text: "text-cyan-600" },
  WHATSAPP: { bg: "bg-emerald-500/10", text: "text-emerald-600" },
  FACEBOOK: { bg: "bg-indigo-500/10", text: "text-indigo-600" },
  FORMULARIO: { bg: "bg-orange-500/10", text: "text-orange-600" }
};

const STATUS_BADGES: Record<string, { bg: string; text: string }> = {
  LEAD: { bg: "bg-amber-500/10", text: "text-amber-600" },
  EM_CONTATO: { bg: "bg-cyan-500/10", text: "text-cyan-600" },
  NEGOCIACAO: { bg: "bg-blue-500/10", text: "text-blue-600" },
  APROVADO: { bg: "bg-emerald-500/10", text: "text-emerald-600" },
  INATIVO: { bg: "bg-rose-500/10", text: "text-rose-600" }
};

function isNewClient(client: { createdAt?: string | null }, now: number) {
  if (!client.createdAt) return false;
  const created = new Date(client.createdAt).getTime();
  if (!Number.isFinite(created)) return false;
  return now - created <= NEW_CLIENT_WINDOW_MS;
}

export default function ClientesClient({
  initialClients,
  initialTotal,
  initialFacets,
  companyId,
  initialPageSize = 20,
}: ClientesClientProps) {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [total, setTotal] = useState(initialTotal);
  const [facets, setFacets] = useState<ClientsListFacets>(initialFacets);
  const [listLoading, setListLoading] = useState(false);
  const { sensitiveHidden } = usePrivacy();
  const { role, isOpsLimited, isReadOnly } = usePermissions();
  /** Marceneiro: lista só nome, bairro, cidade e projetos. */
  const isFactoryRole = role === "PRODUCAO";
  /** Projetista e Marceneiro: sem cadastro/edição/exclusão nem origem. */
  const canManage = canManageClients(role);
  /** Projetista e Marceneiro: sem telefone/e-mail na lista. */
  const hideClientContact = isOpsLimited;
  /** VIEWER: sobrenome e projetos vinculados com blur. */
  const blurViewerPrivacy = isReadOnly;
  const dialog = useActionDialog();
  const { showSuccess, showError, confirmAction } = dialog;
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterOrigin, setFilterOrigin] = useState<string>("ALL");
  const [filterCidade, setFilterCidade] = useState<string>("ALL");
  const [filterBairro, setFilterBairro] = useState<string>("ALL");
  const [activeTipoTab, setActiveTipoTab] = useState<"todos" | "PF" | "PJ">("todos");
  const [filterRecency, setFilterRecency] = useState<"all" | "new">("all");
  // Mobile: busca e filtros começam minimizados
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount = [
    search.trim() !== "",
    canManage && filterOrigin !== "ALL",
    filterCidade !== "ALL",
    filterBairro !== "ALL",
    filterRecency !== "all",
  ].filter(Boolean).length;

  // Paginação (pageSize salvo na conta do usuário)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  
  // Estados para Modais
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Projeto (modal de iniciar projeto no CRM)
  const [valorPrevisto, setValorPrevisto] = useState("");
  const [loading, setLoading] = useState(false);

  const requestIdRef = useRef(0);
  const skipInitialFetch = useRef(true);
  const queryRef = useRef({
    page,
    pageSize,
    search: debouncedSearch,
    origin: filterOrigin,
    cidade: filterCidade,
    bairro: filterBairro,
    tipo: activeTipoTab,
    recency: filterRecency,
  });
  queryRef.current = {
    page,
    pageSize,
    search: debouncedSearch,
    origin: filterOrigin,
    cidade: filterCidade,
    bairro: filterBairro,
    tipo: activeTipoTab,
    recency: filterRecency,
  };

  const fetchList = useCallback(async (options?: { silent?: boolean }) => {
    const q = queryRef.current;
    const id = ++requestIdRef.current;
    if (!options?.silent) setListLoading(true);
    const result = await getClientsPage({
      companyId,
      page: q.page,
      pageSize: q.pageSize,
      search: q.search,
      origin: q.origin,
      cidade: q.cidade,
      bairro: q.bairro,
      tipo: q.tipo,
      recency: q.recency,
    });
    if (id !== requestIdRef.current) return;
    if (!options?.silent) setListLoading(false);
    if (result.success) {
      setClients(result.clients as Client[]);
      setTotal(result.total);
      setFacets(result.facets);
      const lastPage = Math.max(1, Math.ceil(result.total / q.pageSize));
      if (q.page > lastPage) setPage(lastPage);
    }
  }, [companyId]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const filtersKey = `${debouncedSearch}|${filterOrigin}|${filterCidade}|${filterBairro}|${activeTipoTab}|${filterRecency}|${pageSize}`;
  const prevFiltersKey = useRef(filtersKey);

  useEffect(() => {
    const filtersChanged = prevFiltersKey.current !== filtersKey;
    prevFiltersKey.current = filtersKey;
    if (filtersChanged && page !== 1) {
      setPage(1);
      return;
    }
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }
    void fetchList();
  }, [fetchList, filtersKey, page]);

  useLiveEntity("clients", {
    sync: () => fetchList({ silent: true }),
    enabled: !loading && !listLoading && !isCreateOpen && !isEditOpen && !isProjectModalOpen,
    skipInitialSync: true,
  });

  const now = Date.now();
  const tipoCounts = facets.tipoCounts;
  const newClientsCount = facets.newClientsCount;
  const cidadeOptions = facets.cidades;
  const bairroOptions = facets.bairros;

  useEffect(() => {
    if (filterBairro !== "ALL" && !bairroOptions.includes(filterBairro)) {
      setFilterBairro("ALL");
    }
  }, [filterBairro, bairroOptions]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedClients = clients;

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
    // Persiste na conta do usuário (não bloqueia a UI)
    void updateUserPreference("clientesPageSize", size);
  };

  // Converte um cliente da lista para os dados iniciais do wizard (edição)
  const clientToWizardData = (client: Client): Partial<ClientWizardData> => {
    const doc = resolveClientDocument(client);
    return {
      tipo_pessoa: doc.tipo_pessoa,
      documento: doc.documento,
      nome: client.nome,
      email: hasRealClientEmail(client.email) ? client.email : "",
      telefone: client.telefone,
      cep: client.cep || "",
      endereco: client.endereco || "",
      numero: client.numero || "",
      bairro: client.bairro || "",
      cidade: client.cidade,
      uf: client.uf || "",
      tipo_imovel: client.tipo_imovel || "CASA",
      origem: client.origem,
      status: client.status,
      observacoes: doc.observacoes,
      obs_imovel: client.obs_imovel || "",
      obs_entrega: client.obs_entrega || "",
    };
  };

  // Salvar Novo Cliente (a partir do wizard)
  const submitCreate = async (form: ClientWizardData) => {
    setLoading(true);
    const data = {
      nome: form.nome,
      email: form.email,
      telefone: form.telefone,
      cidade: form.cidade,
      origem: form.origem,
      status: form.status,
      observacoes: form.observacoes,
      company_id: companyId,
      tipo_pessoa: form.tipo_pessoa,
      cpf: form.tipo_pessoa === "PF" ? form.documento : undefined,
      cnpj: form.tipo_pessoa === "PJ" ? form.documento : undefined,
      cep: form.cep,
      endereco: form.endereco,
      numero: form.numero,
      bairro: form.bairro,
      uf: form.uf,
      tipo_imovel: form.tipo_imovel,
      obs_imovel: form.obs_imovel,
      obs_entrega: form.obs_entrega,
    };
    const res = await createClientAction(data);
    setLoading(false);

    if (res.success && res.client) {
      setIsCreateOpen(false);
      showSuccess("Cliente cadastrado", `${form.nome} foi adicionado à base de clientes.`);
      void fetchList();
      return { success: true };
    }
    const errMsg =
      res.error || "Ocorreu um erro ao salvar o cliente. Tente novamente.";
    showError("Não foi possível cadastrar", errMsg);
    return { success: false, error: errMsg };
  };

  // Abrir modal de edição
  const openEditModal = (client: Client) => {
    setSelectedClient(client);
    setIsEditOpen(true);
  };

  // Salvar edição do cliente (mesmo formulário da ficha)
  const submitUpdate = async (form: ClientWizardData) => {
    if (!selectedClient) return { success: false, error: "Cliente não selecionado." };
    setLoading(true);
    const data = {
      nome: form.nome,
      email: form.email,
      telefone: form.telefone,
      cidade: form.cidade,
      origem: form.origem,
      status: form.status,
      observacoes: form.observacoes,
      tipo_pessoa: form.tipo_pessoa,
      cpf: form.tipo_pessoa === "PF" ? form.documento : undefined,
      cnpj: form.tipo_pessoa === "PJ" ? form.documento : undefined,
      cep: form.cep,
      endereco: form.endereco,
      numero: form.numero,
      bairro: form.bairro,
      uf: form.uf,
      tipo_imovel: form.tipo_imovel,
      obs_imovel: form.obs_imovel,
      obs_entrega: form.obs_entrega,
    };
    const res = await updateClientAction(selectedClient.id, data);
    setLoading(false);

    if (res.success) {
      setIsEditOpen(false);
      showSuccess("Cliente atualizado", `As informações de ${form.nome} foram salvas.`);
      void fetchList();
      return { success: true };
    }
    const errMsg =
      res.error || "Ocorreu um erro ao atualizar o cliente. Tente novamente.";
    showError("Não foi possível salvar", errMsg);
    return { success: false, error: errMsg };
  };

  // Excluir Cliente
  const handleDeleteClient = (clientId: string, clientName: string) => {
    confirmAction({
      title: "Excluir cliente?",
      message: `${clientName} e todos os projetos vinculados serão removidos permanentemente do sistema.`,
      confirmLabel: "Sim, excluir",
      onConfirm: async () => {
        const res = await deleteClientAction(clientId);
        if (res.success) {
          showSuccess("Cliente excluído", `${clientName} foi removido da base de clientes.`);
          void fetchList();
        } else {
          showError(
            "Não foi possível excluir",
            res.error || "Erro ao remover o cliente. Tente novamente."
          );
        }
      },
    });
  };

  // Abrir Modal para Iniciar Projeto Associado ao Cliente
  const openProjectModal = (client: Client) => {
    setSelectedClient(client);
    setValorPrevisto("");
    setIsProjectModalOpen(true);
  };

  // Salvar Novo Projeto para o Cliente Existente
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !valorPrevisto) return;

    const res = await createLead({
      nome: selectedClient.nome,
      email: selectedClient.email,
      telefone: selectedClient.telefone,
      cidade: selectedClient.cidade,
      origem: selectedClient.origem,
      valor_previsto: Number(valorPrevisto),
      company_id: companyId
    });

    if (res.success) {
      showSuccess(
        "Projeto iniciado",
        `Novo projeto de R$ ${Number(valorPrevisto).toLocaleString("pt-BR")} foi adicionado ao Funil Comercial para ${selectedClient.nome}.`
      );
      setIsProjectModalOpen(false);
      void fetchList();
    } else {
      showError("Não foi possível criar o projeto", "Erro ao iniciar projeto no funil comercial.");
    }
  };

  // Abre o modal de cadastro (wizard multi-step)
  const openCreateModal = () => {
    setSelectedClient(null);
    setIsCreateOpen(true);
  };

  // Mensagem de saudação para abrir a conversa no WhatsApp
  const buildGreeting = (nome: string) =>
    `Olá ${getFirstName(nome)}, tudo bem? Aqui é da Móveis Unghero. 😊`;

  // Telefone: oculto por padrão; quando liberado, vira link do WhatsApp com saudação
  const renderPhone = (client: Client) => {
    if (sensitiveHidden) {
      return <span onClick={(e) => e.stopPropagation()} className="tracking-wide select-none">{maskPhone(client.telefone)}</span>;
    }
    const url = buildWhatsAppUrl(client.telefone, buildGreeting(client.nome));
    const display = formatPhoneDisplay(client.telefone);
    if (!url) return <span>{display}</span>;
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-emerald-600 hover:text-emerald-700 hover:underline"
      >
        {display}
      </a>
    );
  };

  // E-mail: oculto por padrão; quando liberado e real, vira link mailto
  const renderEmail = (client: Client) => {
    const display = formatClientEmailDisplay(client.email);
    if (sensitiveHidden) {
      return (
        <span onClick={(e) => e.stopPropagation()} className="select-none">
          {hasRealClientEmail(client.email) ? maskEmail(client.email) : display}
        </span>
      );
    }
    if (!hasRealClientEmail(client.email)) {
      return (
        <span onClick={(e) => e.stopPropagation()} className="text-muted-foreground">
          {display}
        </span>
      );
    }
    return (
      <a
        href={`mailto:${client.email}`}
        onClick={(e) => e.stopPropagation()}
        className="text-primary hover:underline"
      >
        {display}
      </a>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Topbar e Ações Gerais */}
      <div className="page-header">
        <div className="page-header-main">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="page-title">Clientes</h1>
              <InfoTooltip label="Sobre Clientes">
                <TooltipBody
                  title="Base de clientes"
                  items={[
                    "Cadastre clientes Pessoa Física ou Jurídica escolhendo o tipo antes.",
                    "Use a aba Novos para ver cadastros dos últimos 7 dias.",
                    "Clique em qualquer parte da linha (fora dos botões) para abrir o cliente.",
                    "Os olhos do topo do painel ocultam telefone, e-mail, documento e totais financeiros (revelação temporária).",
                    "Ajuste quantos itens aparecem por página no rodapé da lista.",
                  ]}
                />
              </InfoTooltip>
            </div>
            <p className="page-subtitle">
              {!canManage
                ? "Consulte clientes por nome, localização e projetos vinculados."
                : "Gerencie sua base de clientes — Pessoas Físicas e Jurídicas."}
            </p>
          </div>

          <div className="page-header-actions w-full sm:w-auto">
            {canManage && (
              <Button
                onClick={openCreateModal}
                className="font-bold btn-metallic gap-2 w-full sm:w-auto justify-center h-11 px-5 shadow-sm"
              >
                <Plus className="h-5 w-5" /> Novo cliente
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <Card className="p-4 glass-card">
        {/* Mobile: alternar exibição de busca e filtros */}
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className="md:hidden w-full flex items-center justify-between gap-2 text-sm font-bold text-foreground cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            Buscar e filtrar
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-primary text-white text-[10px] font-black tabular-nums">
                {activeFilterCount}
              </span>
            )}
          </span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
        </button>

        <div className={`${filtersOpen ? "flex" : "hidden"} md:flex flex-col md:flex-row md:items-center gap-4 mt-4 md:mt-0`}>
        <div className="relative w-full md:flex-1 md:min-w-[12rem] md:max-w-md shrink-0">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={
              hideClientContact
                ? isFactoryRole
                  ? "Buscar por nome..."
                  : "Buscar por nome, cidade ou bairro..."
                : "Buscar por nome, e-mail ou telefone..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 bg-muted/40 border-border text-sm"
          />
        </div>

        <div className="flex flex-col gap-3 w-full md:flex-row md:flex-wrap md:items-center md:gap-3 md:w-auto md:ml-auto">
          {canManage && (
            <div className="flex flex-col gap-1 w-full md:flex-row md:items-center md:gap-2 md:w-auto">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Filter className="h-3 w-3" /> Origem:
              </span>
              <select
                value={filterOrigin}
                onChange={(e) => setFilterOrigin(e.target.value)}
                className="w-full md:w-auto md:min-w-[8rem] bg-muted/40 border border-border rounded-md text-sm p-2 focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="ALL">Todas</option>
                {ORIGINS.map((o) => (
                  <option key={o} value={o}>
                    {labelOrigin(o)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1 w-full md:flex-row md:items-center md:gap-2 md:w-auto">
            <span className="text-xs font-semibold text-muted-foreground">Cidade:</span>
            <select
              value={filterCidade}
              onChange={(e) => setFilterCidade(e.target.value)}
              className="w-full md:w-auto md:min-w-[8rem] md:max-w-[10rem] bg-muted/40 border border-border rounded-md text-sm p-2 focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="ALL">Todas</option>
              {cidadeOptions.map((cidade) => (
                <option key={cidade} value={cidade}>
                  {cidade}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 w-full md:flex-row md:items-center md:gap-2 md:w-auto">
            <span className="text-xs font-semibold text-muted-foreground">Bairro:</span>
            <select
              value={filterBairro}
              onChange={(e) => setFilterBairro(e.target.value)}
              className="w-full md:w-auto md:min-w-[8rem] md:max-w-[10rem] bg-muted/40 border border-border rounded-md text-sm p-2 focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="ALL">Todos</option>
              {bairroOptions.map((bairro) => (
                <option key={bairro} value={bairro}>
                  {bairro}
                </option>
              ))}
            </select>
          </div>
        </div>
        </div>
      </Card>

      <div className="space-y-2">
      <FilterPills
        variant="segmented"
        ariaLabel="Filtrar por recência do cadastro"
        value={filterRecency}
        onChange={setFilterRecency}
        options={[
          { value: "all", label: `Todos (${tipoCounts.todos})` },
          { value: "new", label: `Novos (${newClientsCount})` },
        ]}
      />

      {!isFactoryRole && (
      <FilterPills
        variant="segmented"
        ariaLabel="Filtrar por tipo de pessoa"
        value={activeTipoTab}
        onChange={setActiveTipoTab}
        options={[
          { value: "todos", label: `Todos (${tipoCounts.todos})` },
          { value: "PF", label: `Pessoa Física – PF (${tipoCounts.PF})` },
          { value: "PJ", label: `Pessoa Jurídica – PJ (${tipoCounts.PJ})` },
        ]}
      />
      )}
      </div>

      {/* Lista de clientes — cards no mobile, tabela no desktop */}
      {total === 0 && !listLoading ? (
        <Card className="glass-card p-8">
          <p className="text-center text-sm text-muted-foreground">
            Nenhum cliente nesta aba com os filtros aplicados.
          </p>
        </Card>
      ) : total === 0 && listLoading ? (
        <Card className="glass-card p-8 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm">Carregando clientes...</span>
        </Card>
      ) : (
        <div className={listLoading ? "relative" : undefined}>
          {listLoading ? (
            <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 rounded-full bg-background/90 border border-border px-2.5 py-1 text-[10px] font-semibold text-muted-foreground shadow-sm">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              Atualizando…
            </div>
          ) : null}
          <div className="md:hidden space-y-3">
            {pagedClients.map((client) => {
              const orgBadge = ORIGIN_BADGES[client.origem] || { bg: "bg-muted", text: "text-muted-foreground" };
              const statBadge = STATUS_BADGES[client.status] || { bg: "bg-muted", text: "text-muted-foreground" };
              const projectList = client.projects || [];
              const docInfo = resolveClientDocument(client);
              const location = resolveClientLocation(client);

              return (
                <article
                  key={client.id}
                  className={`rounded-[var(--radius-md)] border bg-card p-4 space-y-3 shadow-sm ${
                    !isFactoryRole && docInfo.tipo_pessoa === "PJ" ? "border-indigo-400/40 shadow-xs" : "border-border"
                  }`}
                >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {blurViewerPrivacy ? (
                            <span className="font-semibold text-foreground truncate">
                              <BlurSurnameName
                                name={client.nome}
                                enabled
                              />
                            </span>
                          ) : (
                            <Link
                              href={`/clientes/${client.id}`}
                              className="font-semibold text-foreground truncate hover:text-primary transition-colors"
                            >
                              {client.nome}
                            </Link>
                          )}
                          {isNewClient(client, now) && (
                            <span className="badge-meta inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md">
                              <UserPlus className="h-3 w-3 opacity-70" />
                              Novo
                            </span>
                          )}
                          {!isFactoryRole && (
                            <span className="badge-meta px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {docInfo.tipo_pessoa}
                            </span>
                          )}
                        </div>
                        {!isFactoryRole && docInfo.documento && (
                          <p className="detail-text mt-0.5">
                            {docInfo.tipo_pessoa === "PF" ? "CPF" : "CNPJ"}: {sensitiveHidden ? maskDocument(docInfo.documento) : docInfo.documento}
                          </p>
                        )}
                      </div>
                      {!isFactoryRole && (
                        <span className={`badge-meta px-2 py-0.5 rounded-full shrink-0 ${statBadge.bg} ${statBadge.text}`}>
                          {labelStatus(client.status)}
                        </span>
                      )}
                    </div>

                    {!hideClientContact && (
                      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" /> {renderPhone(client)}
                        </span>
                        <span className="inline-flex items-center gap-1 min-w-0 truncate">
                          <Mail className="h-3.5 w-3.5 shrink-0" /> {renderEmail(client)}
                        </span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                        {location.cidade}
                        {location.bairro ? ` · ${location.bairro}` : ""}
                      </span>
                      {canManage && (
                        <span className={`badge-meta px-2 py-0.5 rounded-full ${orgBadge.bg} ${orgBadge.text}`}>
                          {labelOrigin(client.origem)}
                        </span>
                      )}
                    </div>

                    {projectList.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {projectList.map((p) => (
                          <LinkedProjectChip
                            key={p.id}
                            project={p}
                            href={isFactoryRole ? `/clientes/${client.id}?tab=projects` : undefined}
                            hideQuotesHint={isFactoryRole}
                            blur={blurViewerPrivacy}
                          />
                        ))}
                      </div>
                    )}

                    {canManage && (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => openProjectModal(client)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md bg-emerald-500/10 text-emerald-700 text-sm font-medium cursor-pointer"
                        >
                          <PlusCircle className="h-4 w-4" /> Projeto
                        </button>
                        <button
                          onClick={() => openEditModal(client)}
                          className="p-2 rounded-md bg-primary/10 text-primary cursor-pointer"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClient(client.id, client.nome)}
                          className="p-2 rounded-md bg-destructive/10 text-destructive cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            <Card className="hidden md:block glass-card overflow-hidden">
            <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr>
                <th className="p-4 whitespace-nowrap font-bold">Cliente</th>
                <th className="p-4 text-center whitespace-nowrap font-bold">Cidade</th>
                <th className="p-4 text-center whitespace-nowrap font-bold">Bairro</th>
                {canManage && (
                  <th className="p-4 text-center whitespace-nowrap font-bold">Origem</th>
                )}
                {!isFactoryRole && (
                  <th className="p-4 text-center whitespace-nowrap font-bold">Status</th>
                )}
                <th className="p-4 whitespace-nowrap font-bold">
                  {isFactoryRole ? "Projetos" : "Projetos / Orçamentos Vinculados"}
                </th>
                {canManage && (
                  <th className="p-4 text-right whitespace-nowrap font-bold">Ações</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {pagedClients.map((client) => {
                  const orgBadge = ORIGIN_BADGES[client.origem] || { bg: "bg-slate-100", text: "text-slate-600" };
                  const statBadge = STATUS_BADGES[client.status] || { bg: "bg-slate-100", text: "text-slate-600" };
                  const projectList = client.projects || [];
                  const location = resolveClientLocation(client);

                  return (
                    <tr key={client.id} className="bg-transparent">
                      {/* Cliente */}
                      <td className={`p-4 ${!isFactoryRole && resolveClientDocument(client).tipo_pessoa === "PJ" ? "border-l-4 border-l-indigo-500/80 bg-indigo-50/10" : ""}`}>
                        {(() => {
                          const docInfo = resolveClientDocument(client);
                          return (
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                {blurViewerPrivacy ? (
                                  <span className="text-sm font-bold text-slate-900">
                                    <BlurSurnameName name={client.nome} enabled />
                                  </span>
                                ) : (
                                  <Link
                                    href={`/clientes/${client.id}`}
                                    className="text-sm font-bold text-slate-900 hover:text-primary transition-colors"
                                  >
                                    {client.nome}
                                  </Link>
                                )}
                                {isNewClient(client, now) && (
                                  <span className="badge-meta inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md">
                                    <UserPlus className="h-3 w-3 opacity-70" />
                                    Novo
                                  </span>
                                )}
                                {!isFactoryRole && (
                                  <span className={`text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded-md ${docInfo.tipo_pessoa === "PF" ? "bg-indigo-55 bg-opacity-10 text-indigo-700 border border-indigo-200" : "bg-purple-55 bg-opacity-10 text-purple-700 border border-purple-200"}`}>
                                    {docInfo.tipo_pessoa}
                                  </span>
                                )}
                              </div>
                              {!isFactoryRole && docInfo.documento && (
                                <span className="text-[11px] font-bold text-slate-600 mt-0.5">
                                  {docInfo.tipo_pessoa === "PF" ? "CPF" : "CNPJ"}: {sensitiveHidden ? maskDocument(docInfo.documento) : docInfo.documento}
                                </span>
                              )}
                              {!hideClientContact && (
                                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground font-semibold">
                                  <span className="flex items-center gap-1 whitespace-nowrap">
                                    <Phone className="h-3 w-3 text-slate-500" /> {renderPhone(client)}
                                  </span>
                                  <span className="flex items-center gap-1 whitespace-nowrap">
                                    <Mail className="h-3 w-3 text-slate-500" /> {renderEmail(client)}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Cidade */}
                      <td className="p-4 text-center text-xs font-bold text-slate-700">
                        <span className="inline-flex items-center justify-center gap-1 whitespace-nowrap">
                          <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" /> {location.cidade}
                        </span>
                      </td>

                      {/* Bairro */}
                      <td className="p-4 text-center text-xs font-semibold text-slate-600">
                        {location.bairro || "—"}
                      </td>

                      {canManage && (
                        <td className="p-4 text-center">
                          <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${orgBadge.bg} ${orgBadge.text} whitespace-nowrap`}>
                            {labelOrigin(client.origem)}
                          </span>
                        </td>
                      )}

                      {!isFactoryRole && (
                        <td className="p-4 text-center">
                          <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${statBadge.bg} ${statBadge.text} whitespace-nowrap`}>
                            {labelStatus(client.status)}
                          </span>
                        </td>
                      )}

                      {/* Projetos */}
                      <td className="p-4">
                        {projectList.length === 0 ? (
                          <span className="text-xs text-muted-foreground italic font-semibold">Nenhum projeto iniciado</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-w-[320px]">
                            {projectList.map((p) => (
                              <LinkedProjectChip
                                key={p.id}
                                project={p}
                                href={isFactoryRole ? `/clientes/${client.id}?tab=projects` : undefined}
                                hideQuotesHint={isFactoryRole}
                                blur={blurViewerPrivacy}
                              />
                            ))}
                          </div>
                        )}
                      </td>

                      {canManage && (
                        <td className="p-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openProjectModal(client)}
                              className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 transition-colors cursor-pointer"
                              title="Iniciar Novo Projeto no CRM"
                            >
                              <PlusCircle className="h-4.5 w-4.5" />
                            </button>
                            <button
                              onClick={() => openEditModal(client)}
                              className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors cursor-pointer"
                              title="Editar informações do lead"
                            >
                              <Edit className="h-4.5 w-4.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteClient(client.id, client.nome)}
                              className="p-2 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors cursor-pointer"
                              title="Excluir lead"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
            </tbody>
          </table>
            </div>
            </Card>

            <Pagination
              page={currentPage}
              pageSize={pageSize}
              total={total}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={setPage}
              onPageSizeChange={handlePageSizeChange}
              itemLabel="clientes"
            />
        </div>
      )}

      {/* ─── MODAL: CADASTRAR CLIENTE ─── */}
      <Dialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} className="max-w-2xl w-full">
        <ClientWizard
          mode="create"
          onCancel={() => setIsCreateOpen(false)}
          onSubmit={submitCreate}
        />
      </Dialog>

      {/* ─── MODAL: EDITAR CLIENTE (mesmo formulário da ficha) ─── */}
      <Dialog
        isOpen={isEditOpen}
        onClose={() => {
          if (loading) return;
          setIsEditOpen(false);
        }}
        className="w-[min(96vw,56rem)] max-w-[56rem]"
        bodyClassName="max-h-[min(78vh,36rem)] overflow-y-auto"
      >
        {selectedClient ? (
          <ClienteEditWideForm
            key={`list-edit-${selectedClient.id}-${isEditOpen ? "open" : "closed"}`}
            initial={clientToWizardData(selectedClient)}
            saving={loading}
            onCancel={() => setIsEditOpen(false)}
            onSubmit={submitUpdate}
          />
        ) : null}
      </Dialog>

      {/* ─── MODAL: INICIAR PROJETO NO CRM ─── */}
      <Dialog
        isOpen={isProjectModalOpen && !!selectedClient}
        onClose={() => setIsProjectModalOpen(false)}
        className="max-w-md w-full"
      >
        {selectedClient ? (
        <div className="space-y-4 pr-6">
            <div>
              <h3 className="text-lg font-bold text-foreground">Iniciar Novo Projeto</h3>
              <p className="text-xs text-muted-foreground">Inicie um projeto de marcenaria fina no CRM para <strong>{selectedClient.nome}</strong>.</p>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground block">Valor Previsto do Fechamento (R$)</label>
                <Input
                  required
                  type="number"
                  
                  value={valorPrevisto}
                  onChange={e => setValorPrevisto(e.target.value)}
                  className="border-border bg-slate-50 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsProjectModalOpen(false)} className="text-xs font-bold">
                  Cancelar
                </Button>
                <Button type="submit" className="font-bold btn-metallic">
                  Lançar no Kanban CRM
                </Button>
              </div>
            </form>
        </div>
        ) : null}
      </Dialog>

      <ActionDialogHost dialog={dialog} />
    </div>
  );
}
