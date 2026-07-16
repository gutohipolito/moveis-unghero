"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  FileSignature,
  Plus,
  Search,
  Printer,
  Pencil,
  Trash2,
  FileText,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { TooltipBody } from "@/components/ui/InfoTooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { ActionDialogHost, useActionDialog } from "@/components/ActionDialogHost";
import {
  createContract,
  createContractTemplate,
  deleteContract,
  deleteContractTemplate,
  getContractFormOptions,
  updateContract,
  updateContractTemplate,
  type ContractDTO,
  type ContractFormInput,
  type ContractTemplateDTO,
} from "@/app/actions/contracts";
import { DEFAULT_CONTRACT_TEMPLATE } from "@/lib/contractTemplates";
import { formatContractCurrency, formatContractDateShort } from "@/lib/contractTemplates";

type ClientOption = {
  id: string;
  nome: string;
  documento: string;
  endereco: string;
};

type ProjectOption = {
  id: string;
  client_id: string;
  client_nome: string;
  valor_previsto: number;
  status_geral: string;
  data_entrega_prevista: Date | string | null;
};

type Tab = "contratos" | "templates";

function toDateInput(value: Date | string | null | undefined) {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
}

function emptyContractForm(template?: ContractTemplateDTO | null): ContractFormInput {
  return {
    template_id: template?.id ?? null,
    client_id: null,
    project_id: null,
    titulo: template?.titulo ?? DEFAULT_CONTRACT_TEMPLATE.titulo,
    cliente_nome: "",
    cliente_documento: "",
    cliente_endereco: "",
    servicos: "",
    valor: 0,
    entrada_pct: 50,
    clausula_local: template?.clausula_local ?? DEFAULT_CONTRACT_TEMPLATE.clausula_local,
    clausula_pagamento:
      template?.clausula_pagamento ?? DEFAULT_CONTRACT_TEMPLATE.clausula_pagamento,
    clausula_prazo: template?.clausula_prazo ?? DEFAULT_CONTRACT_TEMPLATE.clausula_prazo,
    clausula_extra: template?.clausula_extra ?? null,
    data_entrega: "",
    data_contrato: toDateInput(new Date()),
    cidade_emissao: "Farroupilha",
    status: "RASCUNHO",
    observacoes: null,
  };
}

export default function ContratosClient({
  companyId,
  initialContracts,
  initialTemplates,
}: {
  companyId: string;
  initialContracts: ContractDTO[];
  initialTemplates: ContractTemplateDTO[];
}) {
  const dialog = useActionDialog();
  const { showSuccess, showError, confirmAction } = dialog;

  const [tab, setTab] = useState<Tab>("contratos");
  const [contracts, setContracts] = useState(initialContracts);
  const [templates, setTemplates] = useState(initialTemplates);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);

  const [isContractOpen, setIsContractOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<ContractDTO | null>(null);
  const [form, setForm] = useState<ContractFormInput>(emptyContractForm(initialTemplates[0]));

  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplateDTO | null>(null);
  const [templateForm, setTemplateForm] = useState({
    nome: DEFAULT_CONTRACT_TEMPLATE.nome,
    titulo: DEFAULT_CONTRACT_TEMPLATE.titulo,
    clausula_local: DEFAULT_CONTRACT_TEMPLATE.clausula_local,
    clausula_pagamento: DEFAULT_CONTRACT_TEMPLATE.clausula_pagamento,
    clausula_prazo: DEFAULT_CONTRACT_TEMPLATE.clausula_prazo,
    clausula_extra: "",
  });

  useEffect(() => {
    getContractFormOptions(companyId).then((res) => {
      if (res.success) {
        setClients(res.clients);
        setProjects(
          res.projects.map((p) => ({
            ...p,
            data_entrega_prevista: p.data_entrega_prevista,
          }))
        );
      }
    });
  }, [companyId]);

  const filteredContracts = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return contracts;
    return contracts.filter(
      (c) =>
        c.cliente_nome.toLowerCase().includes(q) ||
        c.titulo.toLowerCase().includes(q) ||
        c.servicos.toLowerCase().includes(q) ||
        (c.client?.nome.toLowerCase().includes(q) ?? false)
    );
  }, [contracts, search]);

  const projectsForClient = useMemo(() => {
    if (!form.client_id) return projects;
    return projects.filter((p) => p.client_id === form.client_id);
  }, [projects, form.client_id]);

  const openCreateContract = () => {
    const tpl = templates.find((t) => t.ativo) ?? templates[0] ?? null;
    setEditingContract(null);
    setForm(emptyContractForm(tpl));
    setIsContractOpen(true);
  };

  const openEditContract = (c: ContractDTO) => {
    setEditingContract(c);
    setForm({
      template_id: c.template_id,
      client_id: c.client_id,
      project_id: c.project_id,
      titulo: c.titulo,
      cliente_nome: c.cliente_nome,
      cliente_documento: c.cliente_documento,
      cliente_endereco: c.cliente_endereco,
      servicos: c.servicos,
      valor: c.valor,
      entrada_pct: c.entrada_pct,
      clausula_local: c.clausula_local,
      clausula_pagamento: c.clausula_pagamento,
      clausula_prazo: c.clausula_prazo,
      clausula_extra: c.clausula_extra,
      data_entrega: toDateInput(c.data_entrega),
      data_contrato: toDateInput(c.data_contrato),
      cidade_emissao: c.cidade_emissao,
      status: c.status,
      observacoes: c.observacoes,
    });
    setIsContractOpen(true);
  };

  const applyTemplate = (templateId: string) => {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    setForm((prev) => ({
      ...prev,
      template_id: tpl.id,
      titulo: tpl.titulo,
      clausula_local: tpl.clausula_local,
      clausula_pagamento: tpl.clausula_pagamento,
      clausula_prazo: tpl.clausula_prazo,
      clausula_extra: tpl.clausula_extra,
    }));
  };

  const applyClient = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) {
      setForm((prev) => ({ ...prev, client_id: null }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      client_id: client.id,
      project_id: prev.client_id === client.id ? prev.project_id : null,
      cliente_nome: client.nome,
      cliente_documento: client.documento,
      cliente_endereco: client.endereco,
    }));
  };

  const applyProject = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) {
      setForm((prev) => ({ ...prev, project_id: null }));
      return;
    }
    const client = clients.find((c) => c.id === project.client_id);
    setForm((prev) => ({
      ...prev,
      project_id: project.id,
      client_id: project.client_id,
      cliente_nome: client?.nome || project.client_nome,
      cliente_documento: client?.documento || prev.cliente_documento,
      cliente_endereco: client?.endereco || prev.cliente_endereco,
      valor: project.valor_previsto || prev.valor,
      data_entrega: toDateInput(project.data_entrega_prevista) || prev.data_entrega,
    }));
  };

  const handleSaveContract = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingContract) {
        const res = await updateContract(editingContract.id, form);
        if (!res.success || !res.contract) {
          showError("Erro ao salvar", res.error || "Não foi possível atualizar.");
          return;
        }
        setContracts((prev) =>
          prev.map((c) => (c.id === editingContract.id ? res.contract! : c))
        );
        showSuccess("Contrato atualizado", "Alterações salvas com sucesso.");
      } else {
        const res = await createContract(companyId, form);
        if (!res.success || !res.contract) {
          showError("Erro ao cadastrar", res.error || "Não foi possível criar.");
          return;
        }
        setContracts((prev) => [res.contract!, ...prev]);
        showSuccess("Contrato criado", "Contrato salvo como rascunho.");
      }
      setIsContractOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContract = (c: ContractDTO) => {
    confirmAction({
      title: "Excluir contrato?",
      message: `Remover o contrato de ${c.cliente_nome}? Esta ação não pode ser desfeita.`,
      confirmLabel: "Excluir",
      onConfirm: async () => {
        const res = await deleteContract(c.id);
        if (!res.success) {
          showError("Erro", res.error || "Não foi possível excluir.");
          return;
        }
        setContracts((prev) => prev.filter((x) => x.id !== c.id));
        showSuccess("Excluído", "Contrato removido.");
      },
    });
  };

  const openCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      nome: "",
      titulo: DEFAULT_CONTRACT_TEMPLATE.titulo,
      clausula_local: DEFAULT_CONTRACT_TEMPLATE.clausula_local,
      clausula_pagamento: DEFAULT_CONTRACT_TEMPLATE.clausula_pagamento,
      clausula_prazo: DEFAULT_CONTRACT_TEMPLATE.clausula_prazo,
      clausula_extra: "",
    });
    setIsTemplateOpen(true);
  };

  const openEditTemplate = (t: ContractTemplateDTO) => {
    setEditingTemplate(t);
    setTemplateForm({
      nome: t.nome,
      titulo: t.titulo,
      clausula_local: t.clausula_local,
      clausula_pagamento: t.clausula_pagamento,
      clausula_prazo: t.clausula_prazo,
      clausula_extra: t.clausula_extra || "",
    });
    setIsTemplateOpen(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingTemplate) {
        const res = await updateContractTemplate(editingTemplate.id, templateForm);
        if (!res.success || !res.template) {
          showError("Erro", res.error || "Não foi possível atualizar o template.");
          return;
        }
        setTemplates((prev) =>
          prev.map((t) => (t.id === editingTemplate.id ? (res.template as ContractTemplateDTO) : t))
        );
        showSuccess("Template atualizado", "Textos-padrão salvos.");
      } else {
        const res = await createContractTemplate(companyId, templateForm);
        if (!res.success || !res.template) {
          showError("Erro", res.error || "Não foi possível criar o template.");
          return;
        }
        setTemplates((prev) => [...prev, res.template as ContractTemplateDTO]);
        showSuccess("Template criado", "Novo modelo disponível.");
      }
      setIsTemplateOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = (t: ContractTemplateDTO) => {
    confirmAction({
      title: "Remover template?",
      message: `Se já houver contratos usando “${t.nome}”, ele será apenas desativado.`,
      confirmLabel: "Continuar",
      onConfirm: async () => {
        const res = await deleteContractTemplate(t.id);
        if (!res.success) {
          showError("Erro", res.error || "Não foi possível remover.");
          return;
        }
        if (res.deactivated) {
          setTemplates((prev) =>
            prev.map((x) => (x.id === t.id ? { ...x, ativo: false } : x))
          );
          showSuccess("Desativado", res.message || "Template desativado.");
        } else {
          setTemplates((prev) => prev.filter((x) => x.id !== t.id));
          showSuccess("Removido", "Template excluído.");
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      <ActionDialogHost dialog={dialog} />
      <PageHeader
        title="Contratos"
        description="Templates editáveis e emissão de contratos em papel timbrado."
        help={
          <TooltipBody
            title="Contratos"
            items={[
              "Use Templates para ajustar cláusulas padrão.",
              "Ao criar um contrato, vincule cliente/projeto para preencher dados automaticamente.",
              "Imprima ou salve PDF pelo botão Imprimir do contrato.",
            ]}
          />
        }
        actions={
          tab === "contratos" ? (
            <Button onClick={openCreateContract} className="font-bold gap-1.5">
              <Plus className="h-4 w-4" /> Novo Contrato
            </Button>
          ) : (
            <Button onClick={openCreateTemplate} className="font-bold gap-1.5">
              <Plus className="h-4 w-4" /> Novo Template
            </Button>
          )
        }
      />

      <div className="flex gap-2 border-b border-border">
        <button
          type="button"
          onClick={() => setTab("contratos")}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            tab === "contratos"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Contratos
        </button>
        <button
          type="button"
          onClick={() => setTab("templates")}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            tab === "templates"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Templates
        </button>
      </div>

      {tab === "contratos" ? (
        <>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente, título ou serviços..."
              className="pl-9"
            />
          </div>

          {filteredContracts.length === 0 ? (
            <Card className="p-10 text-center space-y-3">
              <FileSignature className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-sm font-semibold text-muted-foreground">
                Nenhum contrato ainda. Crie o primeiro a partir de um template.
              </p>
            </Card>
          ) : (
            <div className="grid gap-3">
              {filteredContracts.map((c) => (
                <Card key={c.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-foreground truncate">{c.cliente_nome}</h3>
                      <span
                        className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                          c.status === "EMITIDO"
                            ? "bg-emerald-500/10 text-emerald-700 border-emerald-200"
                            : "bg-amber-500/10 text-amber-700 border-amber-200"
                        }`}
                      >
                        {c.status === "EMITIDO" ? "Emitido" : "Rascunho"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{c.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatContractCurrency(c.valor)} ·{" "}
                      {formatContractDateShort(c.data_contrato)}
                      {c.template?.nome ? ` · ${c.template.nome}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/contratos/${c.id}/print`}
                      target="_blank"
                      className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md border border-border text-xs font-semibold hover:bg-muted/60"
                    >
                      <Printer className="h-3.5 w-3.5" /> Imprimir
                    </Link>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openEditContract(c)}
                      className="gap-1.5"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteContract(c)}
                      className="text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="grid gap-3">
          {templates.map((t) => (
            <Card key={t.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <h3 className="font-bold truncate">{t.nome}</h3>
                  {!t.ativo ? (
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">
                      Inativo
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground truncate">{t.titulo}</p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => openEditTemplate(t)}>
                  Editar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-rose-600"
                  onClick={() => handleDeleteTemplate(t)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal contrato */}
      <Dialog
        isOpen={isContractOpen}
        onClose={() => !loading && setIsContractOpen(false)}
        className="max-w-2xl"
      >
        <form onSubmit={handleSaveContract} className="space-y-4 pr-4 max-h-[80vh] overflow-y-auto">
          <div>
            <h3 className="text-lg font-bold">
              {editingContract ? "Editar contrato" : "Novo contrato"}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Preencha os campos. Placeholders {"{{valor}}"}, {"{{entrada_pct}}"}, {"{{saldo_pct}}"},{" "}
              {"{{mes_entrega}}"} e {"{{data_entrega}}"} são resolvidos na impressão.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-muted-foreground">Template</label>
              <select
                value={form.template_id || ""}
                onChange={(e) => applyTemplate(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm"
              >
                <option value="">Selecione...</option>
                {templates
                  .filter((t) => t.ativo || t.id === form.template_id)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome}
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">Cliente</label>
              <select
                value={form.client_id || ""}
                onChange={(e) => applyClient(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm"
              >
                <option value="">Manual / sem vínculo</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">Projeto (opcional)</label>
              <select
                value={form.project_id || ""}
                onChange={(e) => applyProject(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm"
              >
                <option value="">Sem projeto</option>
                {projectsForClient.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.client_nome} — {p.status_geral}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-muted-foreground">Título</label>
              <Input
                value={form.titulo}
                onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-muted-foreground">Contratante *</label>
              <Input
                value={form.cliente_nome}
                onChange={(e) => setForm((p) => ({ ...p, cliente_nome: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">CPF / CNPJ</label>
              <Input
                value={form.cliente_documento}
                onChange={(e) => setForm((p) => ({ ...p, cliente_documento: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">Status</label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    status: e.target.value as "RASCUNHO" | "EMITIDO",
                  }))
                }
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm"
              >
                <option value="RASCUNHO">Rascunho</option>
                <option value="EMITIDO">Emitido</option>
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-muted-foreground">Endereço do contratante</label>
              <Input
                value={form.cliente_endereco}
                onChange={(e) => setForm((p) => ({ ...p, cliente_endereco: e.target.value }))}
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-muted-foreground">Serviços *</label>
              <textarea
                required
                value={form.servicos}
                onChange={(e) => setForm((p) => ({ ...p, servicos: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm resize-none"
                placeholder="Ex.: Dormitório da Maria, conforme projeto..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">Valor (R$) *</label>
              <Input
                type="number"
                min={0}
                step="0.01"
                required
                value={form.valor || ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, valor: Number(e.target.value) || 0 }))
                }
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">Entrada (%)</label>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.entrada_pct}
                onChange={(e) =>
                  setForm((p) => ({ ...p, entrada_pct: Number(e.target.value) || 0 }))
                }
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">Data do contrato</label>
              <Input
                type="date"
                value={form.data_contrato}
                onChange={(e) => setForm((p) => ({ ...p, data_contrato: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">Data de entrega</label>
              <Input
                type="date"
                value={form.data_entrega || ""}
                onChange={(e) => setForm((p) => ({ ...p, data_entrega: e.target.value }))}
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-muted-foreground">Cláusula de local</label>
              <textarea
                value={form.clausula_local}
                onChange={(e) => setForm((p) => ({ ...p, clausula_local: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm resize-none"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-muted-foreground">Cláusula de pagamento</label>
              <textarea
                value={form.clausula_pagamento}
                onChange={(e) => setForm((p) => ({ ...p, clausula_pagamento: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm resize-none"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-muted-foreground">Cláusula de prazo</label>
              <textarea
                value={form.clausula_prazo}
                onChange={(e) => setForm((p) => ({ ...p, clausula_prazo: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm resize-none"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-muted-foreground">Cláusula extra (opcional)</label>
              <textarea
                value={form.clausula_extra || ""}
                onChange={(e) => setForm((p) => ({ ...p, clausula_extra: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => setIsContractOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="font-bold">
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal template */}
      <Dialog
        isOpen={isTemplateOpen}
        onClose={() => !loading && setIsTemplateOpen(false)}
        className="max-w-xl"
      >
        <form onSubmit={handleSaveTemplate} className="space-y-4 pr-4 max-h-[80vh] overflow-y-auto">
          <div>
            <h3 className="text-lg font-bold">
              {editingTemplate ? "Editar template" : "Novo template"}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Textos-padrão copiados para novos contratos. Use placeholders {"{{valor}}"},{" "}
              {"{{entrada_pct}}"}, {"{{saldo_pct}}"}, {"{{mes_entrega}}"}, {"{{data_entrega}}"}.
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">Nome *</label>
              <Input
                required
                value={templateForm.nome}
                onChange={(e) => setTemplateForm((p) => ({ ...p, nome: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">Título do documento</label>
              <Input
                value={templateForm.titulo}
                onChange={(e) => setTemplateForm((p) => ({ ...p, titulo: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">Cláusula de local</label>
              <textarea
                value={templateForm.clausula_local}
                onChange={(e) =>
                  setTemplateForm((p) => ({ ...p, clausula_local: e.target.value }))
                }
                rows={2}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm resize-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">Cláusula de pagamento</label>
              <textarea
                value={templateForm.clausula_pagamento}
                onChange={(e) =>
                  setTemplateForm((p) => ({ ...p, clausula_pagamento: e.target.value }))
                }
                rows={3}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm resize-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">Cláusula de prazo</label>
              <textarea
                value={templateForm.clausula_prazo}
                onChange={(e) =>
                  setTemplateForm((p) => ({ ...p, clausula_prazo: e.target.value }))
                }
                rows={3}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm resize-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">Cláusula extra</label>
              <textarea
                value={templateForm.clausula_extra}
                onChange={(e) =>
                  setTemplateForm((p) => ({ ...p, clausula_extra: e.target.value }))
                }
                rows={2}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => setIsTemplateOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="font-bold">
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
