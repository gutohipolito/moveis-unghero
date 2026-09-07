"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Users } from "lucide-react";
import { HighlightAnimatedIcon, LibraryIcon } from "@/components/icons";
import type { PartnerPortalData, PartnerPortalProject } from "@/lib/partnerPortal";
import {
  formatPartnerProjectEnvironmentsLine,
  formatPartnerRelativeTime,
  matchesPartnerProjectFilter,
  partnerProjectStageFamily,
  partnerProjectStageLabel,
  partnerProjectsHref,
  type PartnerProjectStatusFilter,
} from "@/lib/partnerProjectLabels";
import ParceiroPortalShell from "@/app/parceiro/ParceiroPortalShell";
import ParceiroFilterPills from "@/app/parceiro/ParceiroFilterPills";
import { cn } from "@/lib/utils";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function ProjectRow({ project }: { project: PartnerPortalProject }) {
  const family = partnerProjectStageFamily(project.status_geral);
  const envs =
    formatPartnerProjectEnvironmentsLine(project.environments) || "Sem ambientes";
  const filesLabel =
    project.filesCount > 0
      ? `${project.filesCount} arquivo${project.filesCount === 1 ? "" : "s"}`
      : project.hasQuotePdf
        ? "PDF disponível"
        : null;
  const isLost = project.status_geral === "PERDIDO";

  return (
    <Link href={`/parceiro/projetos/${project.id}`} className="parceiro-veio-project-row">
      <span className="parceiro-veio-thumb" aria-hidden>
        {initials(project.client.nome)}
      </span>
      <span className="parceiro-veio-project-row-main min-w-0">
        <span className="parceiro-veio-project-name">{project.client.nome}</span>
        <span className="parceiro-veio-project-meta">
          {envs}
          {project.client.cidade ? ` · ${project.client.cidade}` : ""}
        </span>
      </span>
      <span className="parceiro-veio-project-row-side">
        <span
          className={cn(
            "parceiro-veio-stage",
            family && `is-${family}`,
            isLost && "is-lost"
          )}
        >
          <span className="parceiro-veio-stage-dot" aria-hidden />
          {partnerProjectStageLabel(project.status_geral)}
        </span>
        <span className="parceiro-veio-project-row-foot">
          <span className="parceiro-veio-mono">
            {formatPartnerRelativeTime(project.updatedAt)}
          </span>
          {filesLabel ? (
            <span className="parceiro-veio-project-files">{filesLabel}</span>
          ) : null}
        </span>
      </span>
      <ChevronRight
        className="parceiro-veio-project-chevron h-4 w-4 shrink-0"
        aria-hidden
      />
    </Link>
  );
}

function ProjectList({ projects }: { projects: PartnerPortalProject[] }) {
  return (
    <ul className="parceiro-veio-project-list">
      {projects.map((project) => (
        <li key={project.id}>
          <ProjectRow project={project} />
        </li>
      ))}
    </ul>
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
      <div className="parceiro-veio-home">
        <header className="parceiro-veio-page-header">
          <div className="min-w-0">
            <h1 className="parceiro-veio-title">Projetos</h1>
            <p className="parceiro-veio-subtitle">
              Acompanhe etapa, ambientes e arquivos dos trabalhos vinculados a você.
            </p>
          </div>
        </header>

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
          <ParceiroFilterPills
            aria-label="Filtrar projetos"
            value={filter}
            onChange={(id) => applyFilter(id as PartnerProjectStatusFilter)}
            options={filters.map((f) => ({ id: f.id, label: f.label }))}
          />
          <button
            type="button"
            onClick={() => setGroupByClient((v) => !v)}
            className={cn(
              "parceiro-filter-chip inline-flex items-center gap-1.5 self-stretch sm:self-start justify-center",
              groupByClient && "is-active"
            )}
          >
            <Users className="h-3.5 w-3.5" />
            Por cliente
          </button>
        </div>

        {partner.projects.length === 0 ? (
          <section className="parceiro-veio-empty">
            <div className="parceiro-veio-empty-mark" aria-hidden>
              <HighlightAnimatedIcon icon={LibraryIcon} size={24} playOnMount />
            </div>
            <h2 className="parceiro-veio-empty-title">Nenhuma obra na vitrine ainda</h2>
            <p className="parceiro-veio-empty-desc">
              Quando um cliente usar seu link de indicação ou a Móveis Unghero vincular um
              projeto, ele aparece aqui com etapa, ambientes e arquivos.
            </p>
            <Link href="/parceiro/marketing" className="parceiro-veio-cta">
              Indicar cliente
            </Link>
          </section>
        ) : filtered.length === 0 ? (
          <section className="parceiro-veio-panel">
            <p className="parceiro-veio-muted">Nenhum projeto neste filtro.</p>
          </section>
        ) : groupByClient && grouped ? (
          <div className="space-y-4">
            {grouped.map(([groupClientId, group]) => (
              <section
                key={groupClientId}
                className="parceiro-veio-panel parceiro-veio-panel--stack"
              >
                <div className="parceiro-veio-panel-head">
                  <h2 className="parceiro-veio-panel-title">{group.clientNome}</h2>
                  <span className="parceiro-veio-muted">
                    {group.projects.length} projeto
                    {group.projects.length === 1 ? "" : "s"}
                  </span>
                </div>
                <ProjectList projects={group.projects} />
              </section>
            ))}
          </div>
        ) : (
          <section
            className="parceiro-veio-panel parceiro-veio-panel--stack"
            aria-label="Lista de projetos"
          >
            <ProjectList projects={filtered} />
          </section>
        )}
      </div>
    </ParceiroPortalShell>
  );
}
