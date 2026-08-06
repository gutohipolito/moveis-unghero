"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Layers, MapPin, Users } from "lucide-react";
import { HighlightAnimatedIcon, LibraryIcon } from "@/components/icons";
import type { PartnerPortalData, PartnerPortalProject } from "@/lib/partnerPortal";
import ParceiroPortalShell from "@/app/parceiro/ParceiroPortalShell";
import { cn } from "@/lib/utils";

const PROJECT_STEPS = [
  { id: "LEAD", label: "Briefing" },
  { id: "ORCAMENTO", label: "Orçamento" },
  { id: "NEGOCIACAO", label: "Negociação" },
  { id: "CONFERENCIA_TECNICA", label: "Detalhe" },
  { id: "APROVADO", label: "Aprovado" },
  { id: "PRODUCAO", label: "Fábrica" },
  { id: "INSTALACAO", label: "Montagem" },
  { id: "FINALIZADO", label: "Entregue" },
] as const;

type StatusFilter = "TODOS" | "ATIVOS" | "FINALIZADOS" | "PERDIDOS";

const moneyFmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function stepIndex(status: string) {
  if (status === "PERDIDO") return -1;
  const idx = PROJECT_STEPS.findIndex((s) => s.id === status);
  return idx >= 0 ? idx : 0;
}

function matchesFilter(project: PartnerPortalProject, filter: StatusFilter) {
  if (filter === "TODOS") return true;
  if (filter === "PERDIDOS") return project.status_geral === "PERDIDO";
  if (filter === "FINALIZADOS") return project.status_geral === "FINALIZADO";
  return project.status_geral !== "PERDIDO" && project.status_geral !== "FINALIZADO";
}

function ProjectCard({ project }: { project: PartnerPortalProject }) {
  const current = stepIndex(project.status_geral);
  const isLost = project.status_geral === "PERDIDO";

  return (
    <Link
      href={`/parceiro/projetos/${project.id}`}
      className="parceiro-project-card block no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-[inherit]"
    >
      <div className="parceiro-project-card-sheen" aria-hidden />
      <div className="parceiro-project-card-body">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="min-w-0">
            <h3 className="font-display font-bold text-[1.05rem] leading-snug truncate text-[#1a1208]">
              {project.client.nome}
            </h3>
            <p className="text-[11px] font-semibold text-black/70 mt-0.5 inline-flex items-center gap-1 min-w-0">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{project.client.cidade || "Cidade não informada"}</span>
            </p>
          </div>
          <p className="text-sm font-display font-extrabold tabular-nums shrink-0 text-[#1a1208]">
            {moneyFmt.format(project.valor_previsto)}
          </p>
        </div>

        {isLost ? (
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#5c1a1a]">
            Projeto perdido
          </p>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-1">
              {PROJECT_STEPS.map((step, idx) => (
                <div
                  key={step.id}
                  title={step.label}
                  className={`parceiro-project-step ${
                    idx <= current ? "parceiro-project-step-done" : ""
                  }`}
                />
              ))}
            </div>
            <p className="text-[11px] font-semibold text-black/70">
              Etapa atual:{" "}
              <span className="font-bold text-[#1a1208]">
                {PROJECT_STEPS[current]?.label ?? project.status_geral}
              </span>
            </p>
          </div>
        )}

        {project.environments.length > 0 && (
          <div className="rounded-xl border border-black/10 bg-black/[0.06] p-3 space-y-2">
            <p className="text-[9px] font-black uppercase tracking-widest text-black/60 flex items-center gap-1.5">
              <Layers className="h-3 w-3" />
              Ambientes ({project.environments.length})
            </p>
            <ul className="space-y-1">
              {project.environments.slice(0, 4).map((env) => (
                <li
                  key={env.id}
                  className="flex items-center justify-between gap-2 text-[11px]"
                >
                  <span className="font-semibold text-[#1a1208] truncate">{env.nome}</span>
                  <span className="text-black/55 shrink-0 text-[10px] font-medium">
                    {env.status.replace(/_/g, " ").toLowerCase()}
                  </span>
                </li>
              ))}
              {project.environments.length > 4 && (
                <li className="text-[10px] text-black/50 font-semibold">
                  +{project.environments.length - 4} ambientes
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </Link>
  );
}

interface ParceiroProjetosClientProps {
  partner: PartnerPortalData;
  isAdminPreview?: boolean;
}

export default function ParceiroProjetosClient({
  partner,
  isAdminPreview = false,
}: ParceiroProjetosClientProps) {
  const [filter, setFilter] = useState<StatusFilter>("TODOS");
  const [groupByClient, setGroupByClient] = useState(false);

  const filtered = useMemo(
    () => partner.projects.filter((p) => matchesFilter(p, filter)),
    [partner.projects, filter]
  );

  const grouped = useMemo(() => {
    if (!groupByClient) return null;
    const map = new Map<string, { clientNome: string; projects: PartnerPortalProject[] }>();
    for (const p of filtered) {
      const key = p.client.id;
      const existing = map.get(key);
      if (existing) {
        existing.projects.push(p);
      } else {
        map.set(key, { clientNome: p.client.nome, projects: [p] });
      }
    }
    return Array.from(map.entries()).sort((a, b) =>
      a[1].clientNome.localeCompare(b[1].clientNome, "pt-BR")
    );
  }, [filtered, groupByClient]);

  const filters: { id: StatusFilter; label: string }[] = [
    { id: "TODOS", label: "Todos" },
    { id: "ATIVOS", label: "Ativos" },
    { id: "FINALIZADOS", label: "Finalizados" },
    { id: "PERDIDOS", label: "Perdidos" },
  ];

  return (
    <ParceiroPortalShell partner={partner} isAdminPreview={isAdminPreview}>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight">
              Meus projetos
            </h1>
            <p className="text-xs text-white/60 mt-1 max-w-lg">
              Indicações e projetos vinculados a você — abra um card para ver orçamento, arquivos e
              notas.
            </p>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-white/70 bg-white/10 border border-white/15 px-2.5 py-1 rounded-full self-start sm:self-auto">
            {filtered.length}
            {filter !== "TODOS" ? ` / ${partner.projects.length}` : ""}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="flex flex-wrap gap-1.5">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "h-9 px-3 rounded-full text-[11px] font-bold border transition-colors",
                  filter === f.id
                    ? "bg-white text-slate-900 border-white"
                    : "bg-white/5 text-white/75 border-white/15 hover:bg-white/10"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setGroupByClient((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-[11px] font-bold border transition-colors self-start",
              groupByClient
                ? "bg-primary/20 text-white border-primary/40"
                : "bg-white/5 text-white/75 border-white/15 hover:bg-white/10"
            )}
          >
            <Users className="h-3.5 w-3.5" />
            Agrupar por cliente
          </button>
        </div>

        {partner.projects.length === 0 ? (
          <div className="partner-card p-10 text-center">
            <div className="partner-card-accent" />
            <div className="inline-flex p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-4">
              <HighlightAnimatedIcon icon={LibraryIcon} size={24} playOnMount />
            </div>
            <h2 className="font-display font-bold text-slate-900 text-base">
              Nenhum projeto vinculado ainda
            </h2>
            <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
              Quando um cliente usar o seu link de indicação ou a Móveis Unghero vincular um projeto
              ao seu nome, ele aparece aqui com o andamento atualizado.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="partner-card p-8 text-center">
            <div className="partner-card-accent" />
            <p className="text-sm text-slate-600 font-semibold">
              Nenhum projeto neste filtro.
            </p>
          </div>
        ) : groupByClient && grouped ? (
          <div className="space-y-6">
            {grouped.map(([clientId, group]) => (
              <section key={clientId} className="space-y-3">
                <h2 className="text-sm font-bold text-white/85 tracking-tight flex items-center gap-2">
                  <Users className="h-4 w-4 text-white/50" />
                  {group.clientNome}
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/45">
                    {group.projects.length}
                  </span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {group.projects.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </ParceiroPortalShell>
  );
}
