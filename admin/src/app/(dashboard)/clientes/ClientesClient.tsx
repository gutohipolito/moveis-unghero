"use client";

import React, { useState, useRef, useMemo } from "react";
import PrivacyToggle from "@/components/PrivacyToggle";
import Link from "next/link";
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Edit, 
  Trash2, 
  MessageSquare, 
  Mail, 
  Phone, 
  MapPin, 
  ExternalLink,
  PlusCircle,
  HelpCircle
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  createClientAction, 
  updateClientAction, 
  deleteClientAction, 
  importClientsAction
} from "@/app/actions/cliente";
import { createLead, type Origin } from "@/app/actions/kanban";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getClientTab,
  CLIENT_TAB_LABELS,
  type ClientTab,
} from "@/lib/clientLifecycle";
import { labelOrigin, labelStatus } from "@/lib/navLabels";
import {
  resolveClientDocument,
  type TipoPessoa,
} from "@/lib/clientDocument";

interface ProjectSummary {
  id: string;
  status_geral: string;
  valor_previsto: number;
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
  projects?: ProjectSummary[];
}

interface ClientesClientProps {
  initialClients: Client[];
  companyId: string;
}

const ORIGINS: Origin[] = ["SITE", "INSTAGRAM", "INDICACAO", "GOOGLE", "WHATSAPP", "FACEBOOK"];
const STATUS_OPTIONS = ["LEAD", "EM_CONTATO", "NEGOCIACAO", "APROVADO", "INATIVO"];

const ORIGIN_BADGES: Record<Origin, { bg: string; text: string }> = {
  SITE: { bg: "bg-blue-500/10", text: "text-blue-600" },
  INSTAGRAM: { bg: "bg-pink-500/10", text: "text-pink-600" },
  INDICACAO: { bg: "bg-purple-500/10", text: "text-purple-600" },
  GOOGLE: { bg: "bg-cyan-500/10", text: "text-cyan-600" },
  WHATSAPP: { bg: "bg-emerald-500/10", text: "text-emerald-600" },
  FACEBOOK: { bg: "bg-indigo-500/10", text: "text-indigo-600" }
};

const STATUS_BADGES: Record<string, { bg: string; text: string }> = {
  LEAD: { bg: "bg-amber-500/10", text: "text-amber-600" },
  EM_CONTATO: { bg: "bg-cyan-500/10", text: "text-cyan-600" },
  NEGOCIACAO: { bg: "bg-blue-500/10", text: "text-blue-600" },
  APROVADO: { bg: "bg-emerald-500/10", text: "text-emerald-600" },
  INATIVO: { bg: "bg-rose-500/10", text: "text-rose-600" }
};

export default function ClientesClient({ initialClients, companyId }: ClientesClientProps) {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [search, setSearch] = useState("");
  const [filterOrigin, setFilterOrigin] = useState<string>("ALL");
  const [filterTipoPessoa, setFilterTipoPessoa] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<ClientTab>("leads");
  
  // Estados para Modais
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Estados de Formulários
  const [tipoPessoa, setTipoPessoa] = useState<TipoPessoa>("PF");
  const [documento, setDocumento] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cidade, setCidade] = useState("");
  const [origem, setOrigem] = useState<Origin>("INSTAGRAM");
  const [status, setStatus] = useState("LEAD");
  const [observacoes, setObservacoes] = useState("");
  const [valorPrevisto, setValorPrevisto] = useState("");

  // Campos cadastrais de endereço e imóvel
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [uf, setUf] = useState("");
  const [tipoImovel, setTipoImovel] = useState("CASA");
  const [obsImovel, setObsImovel] = useState("");
  const [obsEntrega, setObsEntrega] = useState("");
  const [loading, setLoading] = useState(false);

  // Funções de autocompletar via API
  const fetchAddressByCep = async (cepValue: string) => {
    const cleanCep = cepValue.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setEndereco(data.logradouro || "");
          setBairro(data.bairro || "");
          setCidade(data.localidade || "");
          setUf(data.uf || "");
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
          setNome(data.nome_fantasia || data.razao_social || "");
          setEmail(data.email || email || "");
          setTelefone(data.ddd_telefone_1 || data.telefone || telefone || "");
          setCep(data.cep || cep || "");
          setEndereco(data.logradouro || endereco || "");
          setNumero(data.numero || numero || "");
          setBairro(data.bairro || bairro || "");
          setCidade(data.municipio || cidade || "");
          setUf(data.uf || uf || "");
          
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabCounts = useMemo(() => {
    const counts: Record<ClientTab, number> = {
      leads: 0,
      negociacoes: 0,
      clientes: 0,
    };
    for (const c of clients) {
      counts[getClientTab(c)]++;
    }
    return counts;
  }, [clients]);

  const filteredClients = clients.filter((c) => {
    const doc = resolveClientDocument(c);
    const searchLower = search.toLowerCase();
    const matchesSearch =
      c.nome.toLowerCase().includes(searchLower) ||
      c.email.toLowerCase().includes(searchLower) ||
      c.telefone.includes(search) ||
      (doc.cpf || "").includes(search) ||
      (doc.cnpj || "").includes(search);
    const matchesOrigin = filterOrigin === "ALL" || c.origem === filterOrigin;
    const matchesTipo =
      filterTipoPessoa === "ALL" || doc.tipo_pessoa === filterTipoPessoa;
    const matchesTab = getClientTab(c) === activeTab;
    return matchesSearch && matchesOrigin && matchesTipo && matchesTab;
  });

  // Salvar Novo Cliente
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !email || !telefone || !cidade) return;

    const data = { 
      nome, 
      email, 
      telefone, 
      cidade, 
      origem, 
      status, 
      observacoes,
      company_id: companyId,
      tipo_pessoa: tipoPessoa,
      cpf: tipoPessoa === "PF" ? documento : undefined,
      cnpj: tipoPessoa === "PJ" ? documento : undefined,
      cep,
      endereco,
      numero,
      bairro,
      uf,
      tipo_imovel: tipoImovel,
      obs_imovel: obsImovel,
      obs_entrega: obsEntrega
    };
    const res = await createClientAction(data);

    if (res.success) {
      const newCli = { 
        id: res.client.id || `cli-${Date.now()}`, 
        ...data, 
        projects: [] 
      };
      setClients([newCli, ...clients]);
      setIsCreateOpen(false);
      resetForm();
    }
  };

  // Carregar dados no form para editar
  const openEditModal = (client: Client) => {
    setSelectedClient(client);
    setNome(client.nome);
    setEmail(client.email);
    setTelefone(client.telefone);
    setCidade(client.cidade);
    setOrigem(client.origem);
    setStatus(client.status);
    
    const doc = resolveClientDocument(client);
    setTipoPessoa(doc.tipo_pessoa);
    setDocumento(doc.documento);
    setObservacoes(doc.observacoes);

    // Carregar campos de endereço
    setCep(client.cep || "");
    setEndereco(client.endereco || "");
    setNumero(client.numero || "");
    setBairro(client.bairro || "");
    setUf(client.uf || "");
    setTipoImovel(client.tipo_imovel || "CASA");
    setObsImovel(client.obs_imovel || "");
    setObsEntrega(client.obs_entrega || "");
    
    setIsEditOpen(true);
  };

  // Salvar Edição do Cliente
  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !nome || !email || !telefone || !cidade) return;

    const data = { 
      nome, 
      email, 
      telefone, 
      cidade, 
      origem, 
      status, 
      observacoes,
      tipo_pessoa: tipoPessoa,
      cpf: tipoPessoa === "PF" ? documento : undefined,
      cnpj: tipoPessoa === "PJ" ? documento : undefined,
      cep,
      endereco,
      numero,
      bairro,
      uf,
      tipo_imovel: tipoImovel,
      obs_imovel: obsImovel,
      obs_entrega: obsEntrega
    };
    const res = await updateClientAction(selectedClient.id, data);

    if (res.success) {
      setClients(clients.map(c => c.id === selectedClient.id ? { ...c, ...data } : c));
      setIsEditOpen(false);
      resetForm();
    }
  };

  // Excluir Cliente
  const handleDeleteClient = async (clientId: string) => {
    if (confirm("Tem certeza que deseja excluir este cliente? Todos os seus projetos vinculados serão removidos do sistema.")) {
      const res = await deleteClientAction(clientId);
      if (res.success) {
        setClients(clients.filter(c => c.id !== clientId));
      }
    }
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
      alert("Novo projeto iniciado com sucesso para este cliente e adicionado ao CRM Kanban!");
      // Atualiza localmente a lista de projetos do cliente correspondente
      const newProj: ProjectSummary = {
        id: res.data?.project?.id || `proj-${Date.now()}`,
        status_geral: "LEAD",
        valor_previsto: Number(valorPrevisto)
      };
      setClients(clients.map(c => {
        if (c.id === selectedClient.id) {
          return {
            ...c,
            projects: [...(c.projects || []), newProj]
          };
        }
        return c;
      }));
      setIsProjectModalOpen(false);
    }
  };

  // Exportar Filtro atual para JSON
  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredClients, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `leads_moveis_unghero_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Importar contatos via JSON
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const imported = JSON.parse(evt.target?.result as string);
        if (!Array.isArray(imported)) {
          alert("O arquivo importado precisa conter uma lista de contatos em formato JSON.");
          return;
        }

        const validClients = imported.map((c: any) => ({
          nome: String(c.nome || "Novo Lead Importado"),
          email: String(c.email || ""),
          telefone: String(c.telefone || ""),
          cidade: String(c.cidade || "Caxias do Sul"),
          origem: (ORIGINS.includes(c.origem) ? c.origem : "INSTAGRAM") as Origin,
          status: String(c.status || "LEAD"),
          observacoes: String(c.observacoes || "Importado via arquivo JSON.")
        }));

        const res = await importClientsAction(validClients, companyId);
        if (res.success) {
          const processed = validClients.map((c, i) => ({
            id: `cli-imported-${Date.now()}-${i}`,
            ...c,
            projects: []
          }));
          setClients([...processed, ...clients]);
          alert(`${validClients.length} contatos importados com sucesso!`);
        }
      } catch (err) {
        alert("Erro ao ler arquivo JSON. Verifique a formatação do arquivo.");
      }
    };
    reader.readAsText(file);
  };

  const resetForm = () => {
    setTipoPessoa("PF");
    setDocumento("");
    setNome("");
    setEmail("");
    setTelefone("");
    setCidade("");
    setOrigem("INSTAGRAM");
    setStatus("LEAD");
    setObservacoes("");
    setSelectedClient(null);
    
    setCep("");
    setEndereco("");
    setNumero("");
    setBairro("");
    setUf("");
    setTipoImovel("CASA");
    setObsImovel("");
    setObsEntrega("");
  };

  return (
    <div className="space-y-6">
      
      {/* Topbar e Ações Gerais */}
      <div className="page-header">
        <div className="page-header-main">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl shrink-0">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="page-title">Contatos</h1>
                <PrivacyToggle />
              </div>
              <p className="page-subtitle">
                {CLIENT_TAB_LABELS[activeTab].description}
              </p>
            </div>
          </div>

          <div className="page-header-actions">
          <Button onClick={handleImportClick} variant="outline" className="text-xs font-bold gap-2">
            <Upload className="h-4 w-4" /> Importar JSON
          </Button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".json" 
            className="hidden" 
          />

          <Button onClick={handleExport} variant="outline" className="text-xs font-bold gap-2">
            <Download className="h-4 w-4" /> Exportar Filtro
          </Button>

          <Button onClick={() => { resetForm(); setIsCreateOpen(true); }} className="font-bold btn-metallic gap-1.5">
            <Plus className="h-4.5 w-4.5" /> Novo contato
          </Button>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <Card className="p-4 glass-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-muted/40 border-border text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Filter className="h-3 w-3" /> Origem:
            </span>
            <select
              value={filterOrigin}
              onChange={(e) => setFilterOrigin(e.target.value)}
              className="bg-muted/40 border border-border rounded-md text-sm p-2 focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="ALL">Todas</option>
              {ORIGINS.map((o) => (
                <option key={o} value={o}>
                  {labelOrigin(o)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Filter className="h-3 w-3" /> Tipo:
            </span>
            <select
              value={filterTipoPessoa}
              onChange={(e) => setFilterTipoPessoa(e.target.value)}
              className="bg-muted/40 border border-border rounded-md text-sm p-2 focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="ALL">Todos</option>
              <option value="PF">Pessoa Física</option>
              <option value="PJ">Pessoa Jurídica</option>
            </select>
          </div>
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ClientTab)}>
        <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1">
          {(["leads", "negociacoes", "clientes"] as ClientTab[]).map((tab) => (
            <TabsTrigger key={tab} value={tab} className="flex-1 min-w-[7rem] gap-1.5">
              {CLIENT_TAB_LABELS[tab].title}
              <span className="text-xs opacity-70 tabular-nums">({tabCounts[tab]})</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Lista de contatos — cards no mobile, tabela no desktop */}
      <Card className="glass-card overflow-hidden">
        {filteredClients.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Nenhum contato nesta aba com os filtros aplicados.
          </p>
        ) : (
          <>
            <div className="md:hidden divide-y divide-border">
              {filteredClients.map((client) => {
                const orgBadge = ORIGIN_BADGES[client.origem] || { bg: "bg-muted", text: "text-muted-foreground" };
                const statBadge = STATUS_BADGES[client.status] || { bg: "bg-muted", text: "text-muted-foreground" };
                const projectList = client.projects || [];
                const docInfo = resolveClientDocument(client);

                return (
                  <article key={client.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link href={`/clientes/${client.id}`} className="font-semibold text-foreground hover:text-primary truncate">
                            {client.nome}
                          </Link>
                          <span className="badge-meta px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            {docInfo.tipo_pessoa}
                          </span>
                        </div>
                        {docInfo.documento && (
                          <p className="detail-text mt-0.5">
                            {docInfo.tipo_pessoa === "PF" ? "CPF" : "CNPJ"}: {docInfo.documento}
                          </p>
                        )}
                      </div>
                      <span className={`badge-meta px-2 py-0.5 rounded-full shrink-0 ${statBadge.bg} ${statBadge.text}`}>
                        {labelStatus(client.status)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" /> {client.telefone}
                      </span>
                      <span className="inline-flex items-center gap-1 min-w-0 truncate">
                        <Mail className="h-3.5 w-3.5 shrink-0" /> {client.email}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 text-primary" /> {client.cidade}
                      </span>
                      <span className={`badge-meta px-2 py-0.5 rounded-full ${orgBadge.bg} ${orgBadge.text}`}>
                        {labelOrigin(client.origem)}
                      </span>
                    </div>

                    {projectList.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {projectList.map((p) => (
                          <Link
                            key={p.id}
                            href={`/projects/${p.id}`}
                            className="badge-meta px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/20"
                          >
                            {p.status_geral}
                          </Link>
                        ))}
                      </div>
                    )}

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
                        onClick={() => handleDeleteClient(client.id)}
                        className="p-2 rounded-md bg-destructive/10 text-destructive cursor-pointer"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr>
                <th className="p-4 whitespace-nowrap font-bold">Cliente / Contato</th>
                <th className="p-4 text-center whitespace-nowrap font-bold">Cidade</th>
                <th className="p-4 text-center whitespace-nowrap font-bold">Origem</th>
                <th className="p-4 text-center whitespace-nowrap font-bold">Status</th>
                <th className="p-4 whitespace-nowrap font-bold">Projetos / Orçamentos Vinculados</th>
                <th className="p-4 text-right whitespace-nowrap font-bold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {filteredClients.map((client) => {
                  const orgBadge = ORIGIN_BADGES[client.origem] || { bg: "bg-slate-100", text: "text-slate-600" };
                  const statBadge = STATUS_BADGES[client.status] || { bg: "bg-slate-100", text: "text-slate-600" };
                  const projectList = client.projects || [];

                  return (
                    <tr key={client.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Cliente & Contato */}
                      <td className="p-4">
                        {(() => {
                          const docInfo = resolveClientDocument(client);
                          return (
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <Link href={`/clientes/${client.id}`} className="text-sm font-bold text-slate-900 hover:underline hover:text-primary transition-all">
                                  {client.nome}
                                </Link>
                                <span className={`text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded-md ${docInfo.tipo_pessoa === "PF" ? "bg-indigo-55 bg-opacity-10 text-indigo-700 border border-indigo-200" : "bg-purple-55 bg-opacity-10 text-purple-700 border border-purple-200"}`}>
                                  {docInfo.tipo_pessoa}
                                </span>
                              </div>
                              {docInfo.documento && (
                                <span className="text-[11px] font-bold text-slate-600 mt-0.5">
                                  {docInfo.tipo_pessoa === "PF" ? "CPF" : "CNPJ"}: {docInfo.documento}
                                </span>
                              )}
                              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground font-semibold">
                                <span className="flex items-center gap-1 whitespace-nowrap">
                                  <Phone className="h-3 w-3 text-slate-500" /> {client.telefone}
                                </span>
                                <span className="flex items-center gap-1 whitespace-nowrap">
                                  <Mail className="h-3 w-3 text-slate-500" /> {client.email}
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Cidade */}
                      <td className="p-4 text-center text-xs font-bold text-slate-700">
                        <span className="inline-flex items-center gap-1 whitespace-nowrap">
                          <MapPin className="h-3.5 w-3.5 text-rose-500" /> {client.cidade}
                        </span>
                      </td>

                      {/* Origem */}
                      <td className="p-4 text-center">
                        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${orgBadge.bg} ${orgBadge.text} whitespace-nowrap`}>
                          {labelOrigin(client.origem)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-4 text-center">
                        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${statBadge.bg} ${statBadge.text} whitespace-nowrap`}>
                          {labelStatus(client.status)}
                        </span>
                      </td>

                      {/* Projetos / Orçamentos Vinculados */}
                      <td className="p-4">
                        {projectList.length === 0 ? (
                          <span className="text-xs text-muted-foreground italic font-semibold">Nenhum projeto iniciado</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                            {projectList.map(p => (
                              <Link 
                                key={p.id}
                                href={`/projects/${p.id}`}
                                className="text-[10px] bg-primary/5 hover:bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-lg flex items-center gap-1 font-extrabold transition-all whitespace-nowrap"
                              >
                                {p.status_geral} <ExternalLink className="h-2 w-2" />
                              </Link>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openProjectModal(client)}
                            className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 transition-all cursor-pointer"
                            title="Iniciar Novo Projeto no CRM"
                          >
                            <PlusCircle className="h-4.5 w-4.5" />
                          </button>
                          <button
                            onClick={() => openEditModal(client)}
                            className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-all cursor-pointer"
                            title="Editar informações do lead"
                          >
                            <Edit className="h-4.5 w-4.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClient(client.id)}
                            className="p-2 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive transition-all cursor-pointer"
                            title="Excluir lead"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
            </div>
          </>
        )}
      </Card>

      {/* ─── MODAL: CADASTRAR CLIENTE ─── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}>
          <div className="bg-white border border-border w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-foreground">Cadastrar Novo Lead / Cliente</h3>
                <p className="text-xs text-muted-foreground">Preencha os dados cadastrais, endereço e imóvel do cliente.</p>
              </div>
              
              {/* Alternador de abas PF/PJ */}
              <div className="flex gap-2 p-1 bg-slate-100 rounded-lg text-xs font-bold w-64">
                <button
                  type="button"
                  className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${tipoPessoa === "PF" ? "bg-white shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => { setTipoPessoa("PF"); setDocumento(""); }}
                >
                  Pessoa Física (PF)
                </button>
                <button
                  type="button"
                  className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${tipoPessoa === "PJ" ? "bg-white shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => { setTipoPessoa("PJ"); setDocumento(""); }}
                >
                  Pessoa Jurídica (PJ)
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Coluna 1: Informações do Cliente */}
                <div className="space-y-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-100 pb-1.5">
                    1. Dados do Cliente
                  </span>
                  
                  {/* CNPJ se for PJ ou CPF se for PF */}
                  {tipoPessoa === "PJ" ? (
                    <div className="p-3 bg-[hsl(28_85%_98%)] border border-[hsl(28_85%_85%)] rounded-xl space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                      <label className="text-xs font-bold text-slate-750 flex items-center gap-1">
                        CNPJ da Empresa
                        <span title="Digite o CNPJ para preencher os dados cadastrais da empresa no ato.">
                          <HelpCircle className="h-3.5 w-3.5 text-slate-400 cursor-help" />
                        </span>
                      </label>
                      <Input 
                        required 
                        value={documento} 
                        onChange={e => {
                          const val = e.target.value;
                          setDocumento(val);
                          fetchCompanyByCnpj(val);
                        }} 
                         
                        className="border-slate-350 bg-white text-xs h-9 font-semibold text-slate-900 focus:border-primary" 
                      />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-750 flex items-center gap-1">
                        CPF do Cliente
                        <span title="Insira o CPF para identificação e contratos.">
                          <HelpCircle className="h-3.5 w-3.5 text-slate-400 cursor-help" />
                        </span>
                      </label>
                      <Input 
                        required 
                        value={documento} 
                        onChange={e => setDocumento(e.target.value)} 
                         
                        className="border-slate-350 bg-slate-50/50 text-xs h-9 font-semibold text-slate-900 focus:border-primary focus:bg-white" 
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-750 flex items-center gap-1">
                      {tipoPessoa === "PF" ? "Nome Completo" : "Razão Social / Nome Fantasia"}
                    </label>
                    <Input 
                      required 
                      value={nome} 
                      onChange={e => setNome(e.target.value)} 
                       
                      className="border-slate-350 bg-slate-50/50 text-xs h-9 font-semibold text-slate-900 focus:border-primary focus:bg-white" 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-750">E-mail</label>
                    <Input 
                      required 
                      type="email" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                       
                      className="border-slate-350 bg-slate-50/50 text-xs h-9 font-semibold text-slate-900 focus:border-primary focus:bg-white" 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-750">Telefone / WhatsApp</label>
                    <Input 
                      required 
                      value={telefone} 
                      onChange={e => setTelefone(e.target.value)} 
                       
                      className="border-slate-350 bg-slate-50/50 text-xs h-9 font-semibold text-slate-900 focus:border-primary focus:bg-white" 
                    />
                  </div>
                </div>

                {/* Coluna 2: Endereço & CEP */}
                <div className="space-y-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-100 pb-1.5">
                    2. Localização & Entrega
                  </span>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1 space-y-1">
                      <label className="text-xs font-bold text-slate-750 flex items-center gap-1">
                        CEP
                        <span title="Preenche o endereço automaticamente ao digitar.">
                          <HelpCircle className="h-3.5 w-3.5 text-slate-400 cursor-help" />
                        </span>
                      </label>
                      <Input 
                        value={cep} 
                        onChange={e => {
                          const val = e.target.value;
                          setCep(val);
                          fetchAddressByCep(val);
                        }} 
                         
                        className="border-slate-350 bg-slate-50/50 text-xs h-9 font-semibold text-slate-900 focus:border-primary focus:bg-white" 
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-xs font-bold text-slate-750">Rua / Logradouro</label>
                      <Input 
                        value={endereco} 
                        onChange={e => setEndereco(e.target.value)} 
                         
                        className="border-slate-350 bg-slate-50/50 text-xs h-9 font-semibold text-slate-900 focus:border-primary focus:bg-white" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1 space-y-1">
                      <label className="text-xs font-bold text-slate-750">Número</label>
                      <Input 
                        value={numero} 
                        onChange={e => setNumero(e.target.value)} 
                         
                        className="border-slate-350 bg-slate-50/50 text-xs h-9 font-semibold text-slate-900 focus:border-primary focus:bg-white" 
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-xs font-bold text-slate-750">Bairro</label>
                      <Input 
                        value={bairro} 
                        onChange={e => setBairro(e.target.value)} 
                         
                        className="border-slate-350 bg-slate-50/50 text-xs h-9 font-semibold text-slate-900 focus:border-primary focus:bg-white" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2 space-y-1">
                      <label className="text-xs font-bold text-slate-750">Cidade</label>
                      <Input 
                        required 
                        value={cidade} 
                        onChange={e => setCidade(e.target.value)} 
                         
                        className="border-slate-350 bg-slate-50/50 text-xs h-9 font-semibold text-slate-900 focus:border-primary focus:bg-white" 
                      />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <label className="text-xs font-bold text-slate-750">UF</label>
                      <Input 
                        value={uf} 
                        onChange={e => setUf(e.target.value)} 
                         
                        className="border-slate-350 bg-slate-50/50 text-xs h-9 font-semibold text-slate-900 uppercase focus:border-primary focus:bg-white" 
                      />
                    </div>
                  </div>
                </div>

                {/* Coluna 3: Ficha Técnica & Comercial */}
                <div className="space-y-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-100 pb-1.5">
                    3. Imóvel & Comercial
                  </span>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-750">Tipo de Imóvel</label>
                    <select 
                      value={tipoImovel} 
                      onChange={e => setTipoImovel(e.target.value)} 
                      className="w-full h-9 bg-slate-50 border border-slate-350 rounded-lg text-xs font-semibold px-2.5 focus:ring-1 focus:ring-primary focus:bg-white outline-none cursor-pointer text-slate-900"
                    >
                      <option value="CASA">Casa Residencial</option>
                      <option value="APARTAMENTO">Apartamento</option>
                      <option value="COMERCIAL">Comercial / Escritório</option>
                      <option value="SOBRADO">Sobrado / Triplex</option>
                      <option value="OUTRO">Outro</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-750">Origem</label>
                      <select 
                        value={origem} 
                        onChange={e => setOrigem(e.target.value as Origin)} 
                        className="w-full h-9 bg-slate-50 border border-slate-350 rounded-lg text-xs font-semibold px-2.5 focus:ring-1 focus:ring-primary focus:bg-white outline-none cursor-pointer text-slate-900"
                      >
                        {ORIGINS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-750">Status</label>
                      <select 
                        value={status} 
                        onChange={e => setStatus(e.target.value)} 
                        className="w-full h-9 bg-slate-50 border border-slate-350 rounded-lg text-xs font-semibold px-2.5 focus:ring-1 focus:ring-primary focus:bg-white outline-none cursor-pointer text-slate-900"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {labelStatus(s)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-750">Observações da Obra / Imóvel</label>
                    <textarea 
                      value={obsImovel} 
                      onChange={e => setObsImovel(e.target.value)} 
                       
                      className="w-full h-14 p-2 text-xs bg-slate-50 border border-slate-350 rounded-lg focus:ring-1 focus:ring-primary focus:bg-white outline-none font-semibold resize-none text-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-750">Observações na Entrega</label>
                    <textarea 
                      value={obsEntrega} 
                      onChange={e => setObsEntrega(e.target.value)} 
                       
                      className="w-full h-14 p-2 text-xs bg-slate-50 border border-slate-350 rounded-lg focus:ring-1 focus:ring-primary focus:bg-white outline-none font-semibold resize-none text-slate-900"
                    />
                  </div>
                </div>

              </div>

              {/* Notas Gerais */}
              <div className="space-y-1.5 border-t border-slate-100 pt-4">
                <label className="text-xs font-bold text-slate-750 flex items-center gap-1">
                  Observações Gerais / Briefing Comercial
                  <span title="Móveis que o cliente procura, estilo, preferências de cores.">
                    <HelpCircle className="h-3.5 w-3.5 text-slate-400 cursor-help" />
                  </span>
                </label>
                <textarea
                  value={observacoes}
                  onChange={e => setObservacoes(e.target.value)}
                  
                  className="w-full h-16 bg-slate-50 border border-slate-350 rounded-lg text-xs p-2 outline-none focus:ring-1 focus:ring-primary focus:bg-white font-semibold resize-none text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="text-xs font-bold cursor-pointer h-9 px-4">
                  Cancelar
                </Button>
                <Button type="submit" className="font-bold text-xs h-9 px-5 bg-[hsl(28_85%_45%)] hover:bg-[hsl(28_85%_40%)] text-white border-none cursor-pointer shadow-sm">
                  Cadastrar Cliente
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: EDITAR CLIENTE ─── */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}>
          <div className="bg-white border border-border w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-foreground">Editar Dados de Lead</h3>
                <p className="text-xs text-muted-foreground">Atualize as informações cadastrais, endereço e imóvel do cliente.</p>
              </div>
              
              {/* Alternador de abas PF/PJ */}
              <div className="flex gap-2 p-1 bg-slate-100 rounded-lg text-xs font-bold w-64">
                <button
                  type="button"
                  className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${tipoPessoa === "PF" ? "bg-white shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => { setTipoPessoa("PF"); }}
                >
                  Pessoa Física (PF)
                </button>
                <button
                  type="button"
                  className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${tipoPessoa === "PJ" ? "bg-white shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => { setTipoPessoa("PJ"); }}
                >
                  Pessoa Jurídica (PJ)
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdateClient} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Coluna 1: Informações do Cliente */}
                <div className="space-y-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-100 pb-1.5">
                    1. Dados do Cliente
                  </span>
                  
                  {/* CNPJ se for PJ ou CPF se for PF */}
                  {tipoPessoa === "PJ" ? (
                    <div className="p-3 bg-[hsl(28_85%_98%)] border border-[hsl(28_85%_85%)] rounded-xl space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                      <label className="text-xs font-bold text-slate-750 flex items-center gap-1">
                        CNPJ da Empresa
                        <span title="Digite o CNPJ para puxar dados da empresa automaticamente.">
                          <HelpCircle className="h-3.5 w-3.5 text-slate-400 cursor-help" />
                        </span>
                      </label>
                      <Input 
                        required 
                        value={documento} 
                        onChange={e => {
                          const val = e.target.value;
                          setDocumento(val);
                          fetchCompanyByCnpj(val);
                        }} 
                         
                        className="border-slate-350 bg-white text-xs h-9 font-semibold text-slate-900 focus:border-primary" 
                      />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-750 flex items-center gap-1">
                        CPF do Cliente
                        <span title="Insira o CPF para identificação e contratos.">
                          <HelpCircle className="h-3.5 w-3.5 text-slate-400 cursor-help" />
                        </span>
                      </label>
                      <Input 
                        required 
                        value={documento} 
                        onChange={e => setDocumento(e.target.value)} 
                         
                        className="border-slate-350 bg-slate-50/50 text-xs h-9 font-semibold text-slate-900 focus:border-primary focus:bg-white" 
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-755 flex items-center gap-1">
                      {tipoPessoa === "PF" ? "Nome Completo" : "Razão Social / Nome Fantasia"}
                    </label>
                    <Input 
                      required 
                      value={nome} 
                      onChange={e => setNome(e.target.value)} 
                       
                      className="border-slate-350 bg-slate-50/50 text-xs h-9 font-semibold text-slate-900 focus:border-primary focus:bg-white" 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-750">E-mail</label>
                    <Input 
                      required 
                      type="email" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                       
                      className="border-slate-350 bg-slate-50/50 text-xs h-9 font-semibold text-slate-900 focus:border-primary focus:bg-white" 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-750">Telefone / WhatsApp</label>
                    <Input 
                      required 
                      value={telefone} 
                      onChange={e => setTelefone(e.target.value)} 
                       
                      className="border-slate-350 bg-slate-50/50 text-xs h-9 font-semibold text-slate-900 focus:border-primary focus:bg-white" 
                    />
                  </div>
                </div>

                {/* Coluna 2: Endereço & CEP */}
                <div className="space-y-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-100 pb-1.5">
                    2. Localização & Entrega
                  </span>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1 space-y-1">
                      <label className="text-xs font-bold text-slate-750 flex items-center gap-1">
                        CEP
                        <span title="Preenche o endereço automaticamente ao digitar.">
                          <HelpCircle className="h-3.5 w-3.5 text-slate-400 cursor-help" />
                        </span>
                      </label>
                      <Input 
                        value={cep} 
                        onChange={e => {
                          const val = e.target.value;
                          setCep(val);
                          fetchAddressByCep(val);
                        }} 
                         
                        className="border-slate-350 bg-slate-50/50 text-xs h-9 font-semibold text-slate-900 focus:border-primary focus:bg-white" 
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-xs font-bold text-slate-750">Rua / Logradouro</label>
                      <Input 
                        value={endereco} 
                        onChange={e => setEndereco(e.target.value)} 
                         
                        className="border-slate-350 bg-slate-50/50 text-xs h-9 font-semibold text-slate-900 focus:border-primary focus:bg-white" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1 space-y-1">
                      <label className="text-xs font-bold text-slate-750">Número</label>
                      <Input 
                        value={numero} 
                        onChange={e => setNumero(e.target.value)} 
                         
                        className="border-slate-350 bg-slate-50/50 text-xs h-9 font-semibold text-slate-900 focus:border-primary focus:bg-white" 
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-xs font-bold text-slate-750">Bairro</label>
                      <Input 
                        value={bairro} 
                        onChange={e => setBairro(e.target.value)} 
                         
                        className="border-slate-350 bg-slate-50/50 text-xs h-9 font-semibold text-slate-900 focus:border-primary focus:bg-white" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2 space-y-1">
                      <label className="text-xs font-bold text-slate-750">Cidade</label>
                      <Input 
                        required 
                        value={cidade} 
                        onChange={e => setCidade(e.target.value)} 
                         
                        className="border-slate-350 bg-slate-50/50 text-xs h-9 font-semibold text-slate-900 focus:border-primary focus:bg-white" 
                      />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <label className="text-xs font-bold text-slate-750">UF</label>
                      <Input 
                        value={uf} 
                        onChange={e => setUf(e.target.value)} 
                         
                        className="border-slate-350 bg-slate-50/50 text-xs h-9 font-semibold text-slate-900 uppercase focus:border-primary focus:bg-white" 
                      />
                    </div>
                  </div>
                </div>

                {/* Coluna 3: Ficha Técnica & Comercial */}
                <div className="space-y-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-100 pb-1.5">
                    3. Imóvel & Comercial
                  </span>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-750">Tipo de Imóvel</label>
                    <select 
                      value={tipoImovel} 
                      onChange={e => setTipoImovel(e.target.value)} 
                      className="w-full h-9 bg-slate-50 border border-slate-350 rounded-lg text-xs font-semibold px-2.5 focus:ring-1 focus:ring-primary focus:bg-white outline-none cursor-pointer text-slate-900"
                    >
                      <option value="CASA">Casa Residencial</option>
                      <option value="APARTAMENTO">Apartamento</option>
                      <option value="COMERCIAL">Comercial / Escritório</option>
                      <option value="SOBRADO">Sobrado / Triplex</option>
                      <option value="OUTRO">Outro</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-750">Origem</label>
                      <select 
                        value={origem} 
                        onChange={e => setOrigem(e.target.value as Origin)} 
                        className="w-full h-9 bg-slate-50 border border-slate-350 rounded-lg text-xs font-semibold px-2.5 focus:ring-1 focus:ring-primary focus:bg-white outline-none cursor-pointer text-slate-900"
                      >
                        {ORIGINS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-750">Status</label>
                      <select 
                        value={status} 
                        onChange={e => setStatus(e.target.value)} 
                        className="w-full h-9 bg-slate-50 border border-slate-350 rounded-lg text-xs font-semibold px-2.5 focus:ring-1 focus:ring-primary focus:bg-white outline-none cursor-pointer text-slate-900"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {labelStatus(s)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-750">Observações da Obra / Imóvel</label>
                    <textarea 
                      value={obsImovel} 
                      onChange={e => setObsImovel(e.target.value)} 
                       
                      className="w-full h-14 p-2 text-xs bg-slate-50 border border-slate-350 rounded-lg focus:ring-1 focus:ring-primary focus:bg-white outline-none font-semibold resize-none text-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-750">Observações na Entrega</label>
                    <textarea 
                      value={obsEntrega} 
                      onChange={e => setObsEntrega(e.target.value)} 
                       
                      className="w-full h-14 p-2 text-xs bg-slate-50 border border-slate-350 rounded-lg focus:ring-1 focus:ring-primary focus:bg-white outline-none font-semibold resize-none text-slate-900"
                    />
                  </div>
                </div>

              </div>

              {/* Notas Gerais */}
              <div className="space-y-1.5 border-t border-slate-100 pt-4">
                <label className="text-xs font-bold text-slate-750 flex items-center gap-1">
                  Observações Gerais / Briefing Comercial
                  <span title="Móveis que o cliente procura, estilo, preferências de cores.">
                    <HelpCircle className="h-3.5 w-3.5 text-slate-400 cursor-help" />
                  </span>
                </label>
                <textarea
                  value={observacoes}
                  onChange={e => setObservacoes(e.target.value)}
                  
                  className="w-full h-16 bg-slate-50 border border-slate-350 rounded-lg text-xs p-2 outline-none focus:ring-1 focus:ring-primary focus:bg-white font-semibold resize-none text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="text-xs font-bold cursor-pointer h-9 px-4">
                  Cancelar
                </Button>
                <Button type="submit" className="font-bold text-xs h-9 px-5 bg-[hsl(28_85%_45%)] hover:bg-[hsl(28_85%_40%)] text-white border-none cursor-pointer shadow-sm">
                  Salvar Alterações
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: INICIAR PROJETO NO CRM ─── */}
      {isProjectModalOpen && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}>
          <div className="bg-white border border-border w-full max-w-md rounded-2xl overflow-hidden shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
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
        </div>
      )}

    </div>
  );
}
