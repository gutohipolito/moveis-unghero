"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, Users } from "lucide-react";
import { HighlightAnimatedIcon, LibraryIcon } from "@/components/icons";
import type { PartnerPortalData, PartnerPortalProject } from "@/lib/partnerPortal";
import { partnerProjectValueVisible } from "@/lib/partnerPortal";
import {
  formatPartnerProjectEnvironmentsLine,
  matchesPartnerProjectFilter,
  PARTNER_PROJECT_STEPS,
  partnerProjectNextMilestone,
  partnerProjectStageLabel,
  partnerProjectStepIndex,
  partnerProjectsHref,
  type PartnerProjectStatusFilter,
} from "@/lib/partnerProjectLabels";
import ParceiroPortalShell from "@/app/parceiro/ParceiroPortalShell";
import { cn } from "@/lib/utils";

const moneyFmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function ProjectCard({ project }: { project: PartnerPortalProject }) {
  const current = partnerProjectStepIndex(project.status_geral);
  const isLost = project.status_geral === "PERDIDO";
  const stageLabel = partnerProjectStageLabel(project.status_geral);
  const environmentsLine = formatPartnerProjectEnvironmentsLine(project.environments);
  const nextMilestone = partnerProjectNextMilestone({
    statusGeral: project.status_geral,
    dataEntregaPrevista: project.data_entrega_prevista,
    environmentReadyDates: project.environments.map((env) => env.data_entrega_acordada),
  });

  return (
    <Link
      href={`/parceiro/projetos/${project.id}`}
      className="parceiro-project-card block w-full text-left no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(210_10%_68%/0.45)]"
    >
      <div className="parceiro-project-card-sheen" aria-hidden />
      <div className="parceiro-project-card-body">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <h3 className="font-display font-semibold text-[1.15rem] leading-snug truncate text-[#f7f0e6]">
                {project.client.nome}
              </h3>
              <span
                className={cn(
                  "parceiro-project-stage-chip",
                  isLost && "is-lost"
                )}
              >
                {stageLabel}
              </span>
            </div>
            {environmentsLine ? (
              <p className="text-[11px] font-medium text-white/55 mt-0.5 truncate">
                {environmentsLine}
              </p>
            ) : null}
            <p className="text-[11px] font-medium text-white/45 mt-0.5 inline-flex items-center gap-1 min-w-0">
              <MapPin className="h-3 w-3 shrink-0 opacity-70" />
              <span className="truncate">{project.client.cidade || "Cidade não informada"}</span>
            </p>
          </div>
          <p
            className="text-sm font-display font-semibold tabular-nums shrink-0 text-[hsl(36_55%_72%)]"
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

        {!isLost ? (
          <div className="space-y-2">
            <div className="flex gap-1" aria-hidden>
              {PARTNER_PROJECT_STEPS.map((step, idx) => (
                <div
                  key={step.id}
                  title={step.label}
                  className={`parceiro-project-step ${
                    idx <= current ? "parceiro-project-step-done" : ""
                  }`}
                />
              ))}
            </div>
            {nextMilestone ? (
              <p className="text-[11px] font-medium text-white/45">{nextMilestone}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </Link>
  );
}

interface ParceiroProjetosClientProps {
  partner: PartnerPortalData;
  isAdminPreview?: boolean;
  initialFilter?: PartnerProjectStatusFilter;
  initialClientId?: string | null;
}

export default function ParceiroProjetosClient({
  partner,
  isAdminPreview = false,
  initialFilter = "ATIVOS",
  initialClientId = null,
}: ParceiroProjetosClientProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<PartnerProjectStatusFilter>(initialFilter);
  const [clientId, setClientId] = useState<string | null>(initialClientId);
  const [groupByClient, setGroupByClient] = useState(false);

  React.useEffect(() => {
    setFilter(initialFilter);
  }, [initialFilter]);

  React.useEffect(() => {
    setClientId(initialClientId);
  }, [initialClientId]);

  const clientFilterName = useMemo(() => {
    if (!clientId) return null;
    return (
      partner.projects.find((p) => p.client.id === clientId)?.client.nome ??
      "este cliente"
    );
  }, [clientId, partner.projects]);

  const filtered = useMemo(
    () =>
      partner.projects.filter((p) => {
        if (clientId && p.client.id !== clientId) return false;
        return matchesPartnerProjectFilter(p.status_geral, filter);
      }),
    [partner.projects, filter, clientId]
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

  const filters: { id: PartnerProjectStatusFilter; label: string }[] = [
    { id: "ATIVOS", label: "Em andamento" },
    { id: "TODOS", label: "Todos" },
    { id: "FINALIZADOS", label: "Finalizados" },
    { id: "PERDIDOS", label: "Perdidos" },
  ];

  function syncUrl(nextFilter: PartnerProjectStatusFilter, nextClientId: string | null) {
    router.replace(partnerProjectsHref(nextFilter, nextClientId), { scroll: false });
  }

  function applyFilter(next: PartnerProjectStatusFilter) {
    setFilter(next);
    syncUrl(next, clientId);
  }

  function clearClientFilter() {
    setClientId(null);
    syncUrl(filter, null);
  }

  return (
    <ParceiroPortalShell partner={partner} isAdminPreview={isAdminPreview}>
      <div className="space-y-6">
        <div className="parceiro-projects-intro">
          <h1 className="parceiro-veio-title">Projetos</h1>
          <p className="parceiro-veio-subtitle">
            Acompanhe etapa, ambientes e arquivos dos trabalhos vinculados a você.
          </p>
        </div>

        {clientId ? (
          <div className="parceiro-veio-client-filter-bar">
            <p className="parceiro-veio-client-filter-label">
              Filtrando por <strong>{clientFilterName}</strong>
              <span className="parceiro-veio-client-filter-count">
                · {filtered.length} projeto{filtered.length === 1 ? "" : "s"}
              </span>
            </p>
            <button
              type="button"
              className="parceiro-veio-text-btn"
              onClick={clearClientFilter}
            >
              Limpar filtro
            </button>
          </div>
        ) : null}

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="parceiro-chip-scroll" role="toolbar" aria-label="Filtrar projetos">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => applyFilter(f.id)}
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
          <div className="parceiro-empty-state">
            <div className="parceiro-empty-state-icon">
              <HighlightAnimatedIcon icon={LibraryIcon} size={24} playOnMount />
            </div>
            <h2 className="parceiro-empty-state-title">Nenhuma obra na vitrine ainda</h2>
            <p className="parceiro-empty-state-desc">
              Quando um cliente usar seu link de indicação ou a Móveis Unghero vincular um projeto, ele
              aparece aqui com etapa, ambientes e arquivos.
            </p>
            <div className="mt-5">
              <Link href="/parceiro/marketing" className="parceiro-home-cta">
                Indicar cliente
              </Link>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="parceiro-empty-state parceiro-empty-state--compact">
            <p className="parceiro-empty-state-desc">Nenhum projeto neste filtro.</p>
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
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filtered.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </ParceiroPortalShell>
  );
}
