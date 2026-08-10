"use client";

import React, { useMemo, useState } from "react";
import { MapPin, Users } from "lucide-react";
import { HighlightAnimatedIcon, LibraryIcon } from "@/components/icons";
import type { PartnerPortalData, PartnerPortalProject } from "@/lib/partnerPortal";
import { partnerProjectValueVisible } from "@/lib/partnerPortal";
import ParceiroPortalShell from "@/app/parceiro/ParceiroPortalShell";
import ParceiroProjetoModal from "@/app/parceiro/projetos/ParceiroProjetoModal";
import InfoTooltip, { TooltipBody } from "@/components/ui/InfoTooltip";
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

function ProjectCard({
  project,
  onOpen,
}: {
  project: PartnerPortalProject;
  onOpen: (id: string) => void;
}) {
  const current = stepIndex(project.status_geral);
  const isLost = project.status_geral === "PERDIDO";
  const stageLabel = PROJECT_STEPS[current]?.label ?? project.status_geral;

  return (
    <button
      type="button"
      onClick={() => onOpen(project.id)}
      className="parceiro-project-card block w-full text-left no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(210_10%_68%/0.45)]"
    >
      <div className="parceiro-project-card-sheen" aria-hidden />
      <div className="parceiro-project-card-body">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="min-w-0">
            <h3 className="font-display font-semibold text-[1.05rem] leading-snug truncate text-[#f7f0e6]">
              {project.client.nome}
            </h3>
            <p className="text-[11px] font-medium text-white/50 mt-0.5 inline-flex items-center gap-1 min-w-0">
              <MapPin className="h-3 w-3 shrink-0 opacity-70" />
              <span className="truncate">{project.client.cidade || "Cidade não informada"}</span>
            </p>
          </div>
          <p
            className="text-sm font-display font-semibold tabular-nums shrink-0 text-[hsl(210_12%_78%)]"
            title={
              partnerProjectValueVisible(project.status_geral)
                ? undefined
                : "Valor liberado após aprovação do orçamento"
            }
          >
            {partnerProjectValueVisible(project.status_geral)
              ? moneyFmt.format(project.valor_previsto)
              : "Após aprovação"}
          </p>
        </div>

        {isLost ? (
          <p className="text-[11px] font-medium text-rose-300/90">Projeto perdido</p>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-1" aria-label={`Etapa: ${stageLabel}`}>
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
            <p className="text-[11px] font-medium text-white/45">{stageLabel}</p>
          </div>
        )}

        {project.environments.length > 0 && (
          <p className="text-[11px] font-medium text-white/40">
            {project.environments.length} ambiente
            {project.environments.length === 1 ? "" : "s"}
            {project.environments.length <= 3
              ? ` · ${project.environments.map((e) => e.nome).join(", ")}`
              : ""}
          </p>
        )}
      </div>
    </button>
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
  const [filter, setFilter] = useState<StatusFilter>("ATIVOS");
  const [groupByClient, setGroupByClient] = useState(false);
  const [openProjectId, setOpenProjectId] = useState<string | null>(null);

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
    { id: "ATIVOS", label: "Em andamento" },
    { id: "TODOS", label: "Todos" },
    { id: "FINALIZADOS", label: "Finalizados" },
    { id: "PERDIDOS", label: "Perdidos" },
  ];

  return (
    <ParceiroPortalShell partner={partner} isAdminPreview={isAdminPreview}>
      <div className="space-y-6">
        <div>
          <p className="parceiro-page-kicker">Acompanhe</p>
          <div className="flex items-center gap-2">
            <h1 className="parceiro-page-title">
              {partner.projects.length} projeto
              {partner.projects.length === 1 ? "" : "s"}
            </h1>
            <InfoTooltip label="Sobre projetos">
              <TooltipBody
                title="Projetos no portal"
                items={[
                  "Toque em um card para ver detalhes, PDFs, arquivos e notas",
                  "O valor comercial só aparece depois da aprovação do orçamento",
                  "Arquivos e notas ficam visíveis também para a equipe da Móveis Unghero",
                ]}
              />
            </InfoTooltip>
          </div>
          <p className="parceiro-page-desc">
            Status e arquivos dos trabalhos vinculados a você. O valor
            comercial aparece a partir da aprovação do orçamento.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="flex flex-wrap gap-1.5">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn("parceiro-filter-chip", filter === f.id && "is-active")}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setGroupByClient((v) => !v)}
            className={cn(
              "parceiro-filter-chip inline-flex items-center gap-1.5 self-start",
              groupByClient && "is-active"
            )}
          >
            <Users className="h-3.5 w-3.5" />
            Por cliente
          </button>
        </div>

        {partner.projects.length === 0 ? (
          <div className="partner-card p-10 text-center">
            <div className="inline-flex p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-4">
              <HighlightAnimatedIcon icon={LibraryIcon} size={24} playOnMount />
            </div>
            <h2 className="font-display font-semibold text-slate-900 text-base">
              Nenhum projeto ainda
            </h2>
            <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
              Quando um cliente usar seu link de indicação ou a Móveis Unghero vincular um projeto, ele
              aparece aqui.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="partner-card p-8 text-center">
            <p className="text-sm text-slate-600 font-medium">Nenhum projeto neste filtro.</p>
          </div>
        ) : groupByClient && grouped ? (
          <div className="space-y-6">
            {grouped.map(([clientId, group]) => (
              <section key={clientId} className="space-y-3">
                <h2 className="text-sm font-medium text-white/70 tracking-tight flex items-center gap-2">
                  {group.clientNome}
                  <span className="text-[10px] text-white/40">{group.projects.length}</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {group.projects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onOpen={setOpenProjectId}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filtered.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpen={setOpenProjectId}
              />
            ))}
          </div>
        )}
      </div>

      <ParceiroProjetoModal
        projectId={openProjectId}
        currentPartnerId={partner.id}
        onClose={() => setOpenProjectId(null)}
      />
    </ParceiroPortalShell>
  );
}
