"use client";

import React, { useState, useRef } from "react";
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
  PlusCircle
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
  observacoes: string;
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
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  
  // Estados para Modais
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Estados de Formulários
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cidade, setCidade] = useState("");
  const [origem, setOrigem] = useState<Origin>("INSTAGRAM");
  const [status, setStatus] = useState("LEAD");
  const [observacoes, setObservacoes] = useState("");
  const [valorPrevisto, setValorPrevisto] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtragem dos Clientes
  const filteredClients = clients.filter(c => {
    const matchesSearch = c.nome.toLowerCase().includes(search.toLowerCase()) || 
                          c.email.toLowerCase().includes(search.toLowerCase()) || 
                          c.telefone.includes(search);
    const matchesOrigin = filterOrigin === "ALL" || c.origem === filterOrigin;
    const matchesStatus = filterStatus === "ALL" || c.status === filterStatus;
    return matchesSearch && matchesOrigin && matchesStatus;
  });

  // Salvar Novo Cliente
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !email || !telefone || !cidade) return;

    const data = { nome, email, telefone, cidade, origem, status, observacoes, company_id: companyId };
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
    setObservacoes(client.observacoes);
    setIsEditOpen(true);
  };

  // Salvar Edição do Cliente
  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !nome || !email || !telefone || !cidade) return;

    const data = { nome, email, telefone, cidade, origem, status, observacoes };
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
    setNome("");
    setEmail("");
    setTelefone("");
    setCidade("");
    setOrigem("INSTAGRAM");
    setStatus("LEAD");
    setObservacoes("");
    setSelectedClient(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Topbar e Ações Gerais */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between p-6 glass-card gap-6 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Módulo de Leads & Clientes</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Gerenciamento completo, importação, exportação e fluxos do CRM.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
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
            <Plus className="h-4.5 w-4.5" /> Novo Lead / Cliente
          </Button>
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
            className="pl-9 bg-slate-50 border-border text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground flex items-center gap-1"><Filter className="h-3 w-3" /> Origem:</span>
            <select
              value={filterOrigin}
              onChange={(e) => setFilterOrigin(e.target.value)}
              className="bg-slate-50 border border-border rounded-lg text-xs p-2 focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="ALL">Todas</option>
              {ORIGINS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground flex items-center gap-1"><Filter className="h-3 w-3" /> Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-50 border border-border rounded-lg text-xs p-2 focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="ALL">Todos os Status</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {/* Tabela de Leads */}
      <Card className="glass-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr>
                <th className="p-4">Cliente / Contato</th>
                <th className="p-4 text-center">Cidade</th>
                <th className="p-4 text-center">Origem</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4">Projetos / Orçamentos Vinculados</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">
                    Nenhum lead ou cliente corresponde aos filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const orgBadge = ORIGIN_BADGES[client.origem] || { bg: "bg-slate-100", text: "text-slate-600" };
                  const statBadge = STATUS_BADGES[client.status] || { bg: "bg-slate-100", text: "text-slate-600" };
                  const projectList = client.projects || [];

                  return (
                    <tr key={client.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Cliente & Contato */}
                      <td className="p-4">
                        <div className="flex flex-col">
                          <strong className="text-sm font-bold text-foreground">{client.nome}</strong>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-muted-foreground/80" /> {client.telefone}
                            </span>
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3 text-muted-foreground/80" /> {client.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Cidade */}
                      <td className="p-4 text-center text-xs font-semibold text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-rose-500" /> {client.cidade}
                        </span>
                      </td>

                      {/* Origem */}
                      <td className="p-4 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${orgBadge.bg} ${orgBadge.text}`}>
                          {client.origem}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-4 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statBadge.bg} ${statBadge.text}`}>
                          {client.status.replace("_", " ")}
                        </span>
                      </td>

                      {/* Projetos / Orçamentos Vinculados */}
                      <td className="p-4">
                        {projectList.length === 0 ? (
                          <span className="text-xs text-muted-foreground italic">Nenhum projeto iniciado</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                            {projectList.map(p => (
                              <Link 
                                key={p.id}
                                href={`/projects/${p.id}`}
                                className="text-[10px] bg-primary/5 hover:bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-lg flex items-center gap-1 font-bold transition-all"
                              >
                                {p.status_geral} <ExternalLink className="h-2 w-2" />
                              </Link>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="p-4 text-right">
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
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ─── MODAL: CADASTRAR CLIENTE ─── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}>
          <div className="bg-white border border-border w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div>
              <h3 className="text-lg font-bold text-foreground">Cadastrar Novo Lead / Cliente</h3>
              <p className="text-xs text-muted-foreground">Preencha as informações do lead para a base.</p>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground block">Nome Completo</label>
                <Input required value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Lucas de Souza" className="border-border bg-slate-50 text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground block">E-mail</label>
                  <Input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Ex: lucas@email.com" className="border-border bg-slate-50 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground block">Telefone / WhatsApp</label>
                  <Input required value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="Ex: (54) 99999-8888" className="border-border bg-slate-50 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground block">Cidade</label>
                  <Input required value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Ex: Bento Gonçalves" className="border-border bg-slate-50 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground block">Origem</label>
                  <select value={origem} onChange={e => setOrigem(e.target.value as Origin)} className="w-full bg-slate-50 border border-border rounded-lg text-sm p-2 focus:ring-1 focus:ring-primary outline-none">
                    {ORIGINS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground block">Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value)} className="w-full bg-slate-50 border border-border rounded-lg text-sm p-2 focus:ring-1 focus:ring-primary outline-none">
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground block">Observações Iniciais</label>
                <textarea
                  value={observacoes}
                  onChange={e => setObservacoes(e.target.value)}
                  placeholder="Quais móveis sob medida o cliente procura? Detalhes do imóvel..."
                  className="w-full h-20 bg-slate-50 border border-border rounded-lg text-sm p-2 outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="text-xs font-bold">
                  Cancelar
                </Button>
                <Button type="submit" className="font-bold btn-metallic">
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
          <div className="bg-white border border-border w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div>
              <h3 className="text-lg font-bold text-foreground">Editar Dados de Lead</h3>
              <p className="text-xs text-muted-foreground">Atualize as informações de contato e notas do lead.</p>
            </div>

            <form onSubmit={handleUpdateClient} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground block">Nome Completo</label>
                <Input required value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Lucas de Souza" className="border-border bg-slate-50 text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground block">E-mail</label>
                  <Input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Ex: lucas@email.com" className="border-border bg-slate-50 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground block">Telefone / WhatsApp</label>
                  <Input required value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="Ex: (54) 99999-8888" className="border-border bg-slate-50 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground block">Cidade</label>
                  <Input required value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Ex: Bento Gonçalves" className="border-border bg-slate-50 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground block">Origem</label>
                  <select value={origem} onChange={e => setOrigem(e.target.value as Origin)} className="w-full bg-slate-50 border border-border rounded-lg text-sm p-2 focus:ring-1 focus:ring-primary outline-none">
                    {ORIGINS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground block">Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value)} className="w-full bg-slate-50 border border-border rounded-lg text-sm p-2 focus:ring-1 focus:ring-primary outline-none">
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground block">Observações Iniciais</label>
                <textarea
                  value={observacoes}
                  onChange={e => setObservacoes(e.target.value)}
                  placeholder="Observações do projeto..."
                  className="w-full h-20 bg-slate-50 border border-border rounded-lg text-sm p-2 outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="text-xs font-bold">
                  Cancelar
                </Button>
                <Button type="submit" className="font-bold btn-metallic">
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
                  placeholder="Ex: 55000"
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
