"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  ChevronRight,
  DollarSign,
  Layers,
  Loader2,
  Lock,
  Sparkles,
  X,
} from "lucide-react";
import { labelProjectStatus } from "@/lib/navLabels";
import { getProjectDetailsAction } from "@/app/actions/project";
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
  clientOrigem: string;
  companyId: string;
  projects: ClientProjectSummary[];
  initialProjectId?: string | null;
  initialCreateQuote?: boolean;
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
  clientOrigem,
  companyId,
  projects,
  initialProjectId = null,
  initialCreateQuote = false,
}: ClienteProjectsTabProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialProjectId);
  const [openCreateQuote, setOpenCreateQuote] = useState(initialCreateQuote);

  return (
    <>
      <Card className="p-5 glass-card space-y-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
              <Layers className="h-4.5 w-4.5 text-primary" /> Projetos do cliente
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Clique em um projeto para ver briefing, orçamentos, arquivos e produção.
            </p>
          </div>
          <span className="text-xs font-bold text-muted-foreground bg-slate-100 px-2.5 py-0.5 rounded-full shrink-0">
            {projects.length} projeto{projects.length === 1 ? "" : "s"}
          </span>
        </div>

        {projects.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground border-2 border-dashed border-border/60 rounded-2xl">
            Nenhum projeto vinculado a este cliente ainda.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {projects.map((project) => {
              const isFormLead = clientOrigem === "FORMULARIO";
              const hasNoQuote = !project.quotes || project.quotes.length === 0;
              const isBlocked = isFormLead && hasNoQuote;
              const latestQuote = project.quotes?.[0];

              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => {
                    setOpenCreateQuote(isBlocked);
                    setSelectedProjectId(project.id);
                  }}
                  className={`text-left p-4 rounded-xl border transition-all hover:shadow-md ${
                    isBlocked
                      ? "border-rose-200 bg-rose-50/30 hover:bg-rose-50/50"
                      : "border-border/60 bg-slate-50 hover:bg-slate-100/70"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground flex items-center gap-1.5 flex-wrap">
                        Projeto {project.id.slice(0, 8).toUpperCase()}
                        {isBlocked ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded uppercase">
                            <Lock className="h-3 w-3" /> Bloqueado
                          </span>
                        ) : null}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {project.updatedAt
                            ? new Date(project.updatedAt).toLocaleDateString("pt-BR")
                            : "—"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <DollarSign className="h-3.5 w-3.5" />
                          {isBlocked ? (
                            <span className="text-rose-600 font-semibold">Sem orçamento</span>
                          ) : (
                            <span className="privacy-value">
                              {project.valor_previsto.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })}
                            </span>
                          )}
                        </span>
                      </div>
                      {project.briefing ? (
                        <p className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-primary" />
                          {project.briefing.estilo}
                          {project.briefing.score != null ? ` · Score ${project.briefing.score}` : ""}
                        </p>
                      ) : null}
                      {latestQuote ? (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Orçamento v{latestQuote.versao}:{" "}
                          <span className="privacy-value font-semibold">
                            {latestQuote.valor_final.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </span>
                        </p>
                      ) : null}
                      {(project.environments_count ?? 0) > 0 ? (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {project.environments_count} ambiente
                          {project.environments_count === 1 ? "" : "s"}
                        </p>
                      ) : null}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  </div>
                  <div className="mt-3">
                    <ProjectStatusBadge status={project.status_geral} blocked={isBlocked} />
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

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-background/95 backdrop-blur px-4 py-3">
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

      <div className="flex-1 overflow-y-auto px-4 py-6">
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
    </div>
  );
}
