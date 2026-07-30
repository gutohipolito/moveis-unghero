"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  ChevronRight,
  DollarSign,
  Layers,
  Loader2,
  Lock,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { labelProjectStatus } from "@/lib/navLabels";
import { getProjectDetailsAction } from "@/app/actions/project";
import { createLead, type Origin } from "@/app/actions/kanban";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import ProjectDetails from "@/components/ProjectDetails";
import type { ProjectDetailsPayload } from "@/lib/formatProjectDetails";
import type { ProjectSlaView } from "@/lib/productionSla";

export interface ClientProjectSummary {
  id: string;
  status_geral: string;
  valor_previsto: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  quotes?: { id: string; valor_final: number; versao: number }[];
  briefing?: {
    score: number | null;
    estilo: string;
    faixa_investimento: string | null;
  } | null;
  environments_count?: number;
}

interface ClienteProjectsTabProps {
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientTelefone: string;
  clientCidade: string;
  clientOrigem: string;
  companyId: string;
  projects: ClientProjectSummary[];
  onProjectsChange: (projects: ClientProjectSummary[]) => void;
  initialProjectId?: string | null;
  initialCreateQuote?: boolean;
  /** Projetista/Fábrica: oculta valores e criação comercial de projeto. */
  hideValues?: boolean;
}

function ProjectStatusBadge({ status, blocked }: { status: string; blocked?: boolean }) {
  if (blocked) {
    return (
      <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-700">
        Aguardando orçamento
      </span>
    );
  }

  const colors: Record<string, string> = {
    LEAD: "bg-amber-500/10 text-amber-700",
    ORCAMENTO: "bg-blue-500/10 text-blue-700",
    NEGOCIACAO: "bg-indigo-500/10 text-indigo-700",
    APROVADO: "bg-emerald-500/10 text-emerald-700",
    PRODUCAO: "bg-purple-500/10 text-purple-700",
    INSTALACAO: "bg-cyan-500/10 text-cyan-700",
    FINALIZADO: "bg-slate-500/10 text-slate-700",
    PERDIDO: "bg-rose-500/10 text-rose-700",
  };

  return (
    <span
      className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
        colors[status] ?? "bg-muted text-muted-foreground"
      }`}
    >
      {labelProjectStatus(status)}
    </span>
  );
}

export default function ClienteProjectsTab({
  clientId,
  clientName,
  clientEmail,
  clientTelefone,
  clientCidade,
  clientOrigem,
  companyId,
  projects,
  onProjectsChange,
  initialProjectId = null,
  initialCreateQuote = false,
  hideValues = false,
}: ClienteProjectsTabProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialProjectId);
  const [openCreateQuote, setOpenCreateQuote] = useState(initialCreateQuote);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [valorPrevisto, setValorPrevisto] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function handleCreateProject(event: React.FormEvent) {
    event.preventDefault();
    const valor = Number(valorPrevisto);
    if (!valorPrevisto || Number.isNaN(valor) || valor <= 0) {
      setCreateError("Informe um valor previsto válido.");
      return;
    }

    setCreating(true);
    setCreateError(null);

    const res = await createLead({
      nome: clientName,
      email: clientEmail,
      telefone: clientTelefone,
      cidade: clientCidade,
      origem: clientOrigem as Origin,
      valor_previsto: valor,
      company_id: companyId,
      client_id: clientId,
    });

    setCreating(false);

    if (res.success && res.data?.project) {
      const project = res.data.project;
      const now = new Date().toISOString();
      const newSummary: ClientProjectSummary = {
        id: project.id,
        status_geral: project.status_geral,
        valor_previsto: Number(project.valor_previsto),
        createdAt: now,
        updatedAt: now,
        quotes: [],
        briefing: null,
        environments_count: 0,
      };
      onProjectsChange([newSummary, ...projects]);
      setIsCreateModalOpen(false);
      setValorPrevisto("");
      setSelectedProjectId(project.id);
      setOpenCreateQuote(false);
    } else {
      setCreateError(res.error ?? "Não foi possível criar o projeto.");
    }
  }

  return (
    <>
      <Card className="p-5 glass-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
              <Layers className="h-4.5 w-4.5 text-primary" /> Projetos do cliente
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {hideValues
                ? "Clique em um projeto para ver status, arquivos e produção."
                : "Clique em um projeto para ver briefing, orçamentos, arquivos e produção."}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-muted-foreground bg-slate-100 px-2.5 py-0.5 rounded-full">
              {projects.length} projeto{projects.length === 1 ? "" : "s"}
            </span>
            {!hideValues && (
              <Button
                type="button"
                className="text-xs font-bold gap-1.5 btn-metallic"
                onClick={() => {
                  setCreateError(null);
                  setValorPrevisto("");
                  setIsCreateModalOpen(true);
                }}
              >
                <Plus className="h-4 w-4" /> Novo projeto
              </Button>
            )}
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground border-2 border-dashed border-border/60 rounded-2xl space-y-4">
            <p>Nenhum projeto vinculado a este cliente ainda.</p>
            {!hideValues && (
              <Button
                type="button"
                className="text-xs font-bold gap-1.5 btn-metallic"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <Plus className="h-4 w-4" /> Criar primeiro projeto
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {projects.map((project) => {
              const isFormLead = clientOrigem === "FORMULARIO";
              const hasNoQuote = !project.quotes || project.quotes.length === 0;
              const isBlocked = isFormLead && hasNoQuote;
              const latestQuote = project.quotes?.[0];
              const isApproved = project.status_geral === "APROVADO";

              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => {
                    setOpenCreateQuote(isBlocked);
                    setSelectedProjectId(project.id);
                  }}
                  className={`group relative flex flex-col text-left p-4 rounded-2xl border bg-white transition-all hover:shadow-md hover:-translate-y-0.5 ${
                    isBlocked
                      ? "border-rose-200 hover:border-rose-300"
                      : isApproved
                        ? "border-emerald-300 ring-1 ring-emerald-500/20 hover:border-emerald-400"
                        : "border-border/70 hover:border-primary/40"
                  }`}
                >
                  {/* Cabeçalho: identificação + status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Projeto</span>
                      <p className="text-sm font-black text-foreground font-mono tracking-tight truncate">
                        #{project.id.slice(0, 8).toUpperCase()}
                      </p>
                    </div>
                    <ProjectStatusBadge status={project.status_geral} blocked={isBlocked} />
                  </div>

                  {/* Valor em destaque (oculto para cargos operacionais) */}
                  {!hideValues && (
                    <div className={`mt-3 rounded-xl px-3 py-2 border ${isBlocked ? "bg-rose-50/60 border-rose-100" : "bg-slate-50 border-border/50"}`}>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                        <DollarSign className="h-3 w-3" /> Valor previsto
                      </span>
                      {isBlocked ? (
                        <p className="text-sm font-bold text-rose-600 mt-0.5">Sem orçamento</p>
                      ) : (
                        <p className="text-lg font-black text-foreground mt-0.5 privacy-value">
                          {project.valor_previsto.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </p>
                      )}
                      {latestQuote ? (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Orçamento v{latestQuote.versao}:{" "}
                          <span className="privacy-value font-semibold text-foreground">
                            {latestQuote.valor_final.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </span>
                        </p>
                      ) : null}
                    </div>
                  )}

                  {/* Chips de metadados */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-slate-100 rounded-full px-2 py-0.5">
                      <Calendar className="h-3 w-3" />
                      {project.updatedAt
                        ? new Date(project.updatedAt).toLocaleDateString("pt-BR")
                        : "—"}
                    </span>
                    {(project.environments_count ?? 0) > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-slate-100 rounded-full px-2 py-0.5">
                        <Layers className="h-3 w-3" />
                        {project.environments_count} ambiente{project.environments_count === 1 ? "" : "s"}
                      </span>
                    ) : null}
                    {project.briefing ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5">
                        <Sparkles className="h-3 w-3" />
                        {project.briefing.estilo}
                        {project.briefing.score != null ? ` · ${project.briefing.score}` : ""}
                      </span>
                    ) : null}
                    {isBlocked ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full uppercase">
                        <Lock className="h-3 w-3" /> Bloqueado
                      </span>
                    ) : null}
                  </div>

                  {/* Rodapé: ação */}
                  <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-end gap-1 text-[11px] font-bold text-primary transition-opacity opacity-70 group-hover:opacity-100">
                    Ver detalhes <ChevronRight className="h-4 w-4" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {selectedProjectId ? (
        <ClienteProjectDrawer
          projectId={selectedProjectId}
          clientId={clientId}
          companyId={companyId}
          openCreateQuote={openCreateQuote}
          onClose={() => {
            setSelectedProjectId(null);
            setOpenCreateQuote(false);
          }}
        />
      ) : null}

      <Dialog
        isOpen={!hideValues && isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        className="max-w-md w-full"
      >
        <div className="space-y-4 pr-6">
            <div>
              <h3 className="text-lg font-bold text-foreground">Novo projeto</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Inicie um projeto para <strong>{clientName}</strong>. Ele entrará no funil comercial como Lead.
              </p>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground block">
                  Valor previsto do fechamento (R$)
                </label>
                <Input
                  required
                  type="number"
                  min="1"
                  step="0.01"
                  value={valorPrevisto}
                  onChange={(e) => setValorPrevisto(e.target.value)}
                  className="border-border bg-slate-50 text-sm"
                />
              </div>

              {createError ? (
                <p className="text-xs text-destructive font-medium">{createError}</p>
              ) : null}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="text-xs font-bold"
                  disabled={creating}
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={creating} className="font-bold btn-metallic gap-1.5">
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {creating ? "Criando..." : "Criar projeto"}
                </Button>
              </div>
            </form>
        </div>
      </Dialog>
    </>
  );
}

function ClienteProjectDrawer({
  projectId,
  clientId,
  companyId,
  openCreateQuote,
  onClose,
}: {
  projectId: string;
  clientId: string;
  companyId: string;
  openCreateQuote?: boolean;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectDetailsPayload | null>(null);
  const [colaboradores, setColaboradores] = useState<
    { id: string; name: string; cargo: string }[]
  >([]);
  const [sla, setSla] = useState<ProjectSlaView | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    getProjectDetailsAction(projectId).then((res) => {
      if (!active) return;
      if (res.success && res.project) {
        setProject(res.project);
        setColaboradores(res.colaboradores ?? []);
        setSla(res.sla ?? null);
      } else {
        setError(res.error ?? "Não foi possível carregar o projeto.");
      }
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [projectId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[150] flex flex-col bg-background h-[100dvh] max-h-[100dvh] overflow-hidden">
      <div className="shrink-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-background/95 backdrop-blur px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-muted-foreground">Projeto do cliente</p>
          <p className="text-sm font-bold text-foreground truncate">
            {project?.client.nome ?? "Carregando..."} · {projectId.slice(0, 8).toUpperCase()}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={`/projects/${projectId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold hidden sm:inline-flex items-center justify-center rounded-[var(--radius-sm)] border border-border bg-transparent hover:bg-muted/60 min-h-9 px-3"
          >
            Abrir em nova aba
          </a>
          <Button
            type="button"
            variant="outline"
            className="text-xs font-bold gap-1.5"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
            Fechar
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-auto overscroll-contain px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Carregando projeto completo...</p>
          </div>
        ) : error ? (
          <div className="max-w-lg mx-auto p-6 text-center space-y-3">
            <p className="text-sm text-destructive font-medium">{error}</p>
            <Button type="button" variant="outline" onClick={onClose} className="text-xs font-bold">
              Voltar
            </Button>
          </div>
        ) : project ? (
          <ProjectDetails
            initialProject={project as any}
            companyId={companyId}
            colaboradores={colaboradores}
            isMock={false}
            initialSla={sla}
            embedded
            backHref={`/clientes/${clientId}`}
            backLabel="Voltar ao cliente"
            onClose={onClose}
            initialOpenCreateQuote={openCreateQuote}
          />
        ) : null}
      </div>
    </div>,
    document.body
  );
}
