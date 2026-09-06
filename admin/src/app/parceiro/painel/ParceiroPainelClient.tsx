"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  ChevronRight,
  Factory,
  FileText,
  Image as ImageIcon,
  Paperclip,
  Plus,
} from "lucide-react";
import type { PartnerPortalData } from "@/lib/partnerPortal";
import {
  buildPartnerProjectFlow,
  buildPartnerRecentUpdates,
  formatPartnerProjectEnvironmentsLine,
  formatPartnerRelativeTime,
  partnerOverviewMetrics,
  partnerProjectStageFamily,
  partnerProjectStageLabel,
  partnerProjectsHref,
  PARTNER_PROJECT_STEPS,
  type PartnerProjectStepId,
  type PartnerProjectUpdateKind,
} from "@/lib/partnerProjectLabels";
import ParceiroPortalShell from "@/app/parceiro/ParceiroPortalShell";
import { cn } from "@/lib/utils";

interface ParceiroPainelClientProps {
  partner: PartnerPortalData;
  isAdminPreview?: boolean;
}

function updateIcon(kind: PartnerProjectUpdateKind) {
  if (kind === "quote") return FileText;
  if (kind === "schedule") return Calendar;
  if (kind === "stage") return Factory;
  if (kind === "image") return ImageIcon;
  return Paperclip;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function ParceiroPainelClient({
  partner: initialPartner,
  isAdminPreview = false,
}: ParceiroPainelClientProps) {
  const [partner, setPartner] = useState(initialPartner);
  const [flowFilter, setFlowFilter] = useState<PartnerProjectStepId | null>(null);

  const flow = useMemo(
    () => buildPartnerProjectFlow(partner.projects),
    [partner.projects]
  );
  const updates = useMemo(
    () => buildPartnerRecentUpdates(partner.projects),
    [partner.projects]
  );
  const metrics = useMemo(
    () => partnerOverviewMetrics(partner.projects),
    [partner.projects]
  );

  const tracked = useMemo(() => {
    const list = [...partner.projects]
      .filter((p) => p.status_geral !== "PERDIDO")
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const filtered = flowFilter
      ? list.filter((p) => p.status_geral === flowFilter)
      : list;
    return filtered.slice(0, 5);
  }, [partner.projects, flowFilter]);

  const filterAnnouncement = useMemo(() => {
    if (!flowFilter) return "Mostrando todos os projetos acompanhados.";
    const step = PARTNER_PROJECT_STEPS.find((s) => s.id === flowFilter);
    const count = partner.projects.filter((p) => p.status_geral === flowFilter).length;
    return `Filtrado: ${step?.label || flowFilter} · ${count} projeto${count === 1 ? "" : "s"}.`;
  }, [flowFilter, partner.projects]);

  const hasProjects = partner.projects.some((p) => p.status_geral !== "PERDIDO");

  return (
    <ParceiroPortalShell
      partner={partner}
      isAdminPreview={isAdminPreview}
      onFotoUrlChange={(fotoUrl) => setPartner((prev) => ({ ...prev, fotoUrl }))}
      onPartnerChange={(profile) => setPartner((prev) => ({ ...prev, ...profile }))}
    >
      <div className="parceiro-veio-home">
        <header className="parceiro-veio-page-header">
          <div className="min-w-0">
            <h1 className="parceiro-veio-title">Acompanhe seus projetos.</h1>
            <p className="parceiro-veio-subtitle">
              Veja o andamento dos projetos vinculados a você.
            </p>
          </div>
          <Link href="/parceiro/marketing" className="parceiro-veio-cta-outline">
            <Plus className="h-4 w-4" aria-hidden />
            Indicar cliente
          </Link>
        </header>

        {!hasProjects ? (
          <section className="parceiro-veio-empty">
            <div className="parceiro-veio-empty-mark" aria-hidden />
            <h2 className="parceiro-veio-empty-title">Nenhum projeto vinculado ainda.</h2>
            <p className="parceiro-veio-empty-desc">
              Quando a Móveis Unghero vincular um projeto ao seu cadastro, você poderá
              acompanhar todas as etapas por aqui.
            </p>
            <Link href="/parceiro/marketing" className="parceiro-veio-cta-outline">
              Indicar cliente
            </Link>
          </section>
        ) : (
          <>
            <p className="sr-only" aria-live="polite">
              {filterAnnouncement}
            </p>
            <div className="parceiro-veio-top-grid">
              <section className="parceiro-veio-panel parceiro-veio-flow" aria-label="Andamento dos projetos">
                <div className="parceiro-veio-panel-head">
                  <h2 className="parceiro-veio-panel-title">Andamento dos projetos</h2>
                  {flowFilter ? (
                    <button
                      type="button"
                      className="parceiro-veio-text-btn"
                      onClick={() => setFlowFilter(null)}
                    >
                      Limpar filtro
                    </button>
                  ) : null}
                </div>
                <div className="parceiro-veio-flow-track" aria-hidden>
                  <svg className="parceiro-veio-flow-line" viewBox="0 0 800 40" preserveAspectRatio="none">
                    <path
                      d="M0 22 C 80 8, 140 34, 220 18 S 360 6, 420 24 S 560 36, 640 14 S 740 28, 800 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                </div>
                <ol className="parceiro-veio-flow-steps">
                  {flow.map((step) => {
                    const active = flowFilter === step.id;
                    return (
                      <li key={step.id}>
                        <button
                          type="button"
                          onClick={() =>
                            setFlowFilter((prev) => (prev === step.id ? null : step.id))
                          }
                          className={cn(
                            "parceiro-veio-flow-step",
                            `is-${step.family}`,
                            active && "is-active",
                            step.count === 0 && "is-empty"
                          )}
                          aria-pressed={active}
                        >
                          <span className="parceiro-veio-flow-count">
                            {String(step.count).padStart(2, "0")}
                          </span>
                          <span className="parceiro-veio-flow-dot" aria-hidden />
                          <span className="parceiro-veio-flow-label">{step.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </section>

              <section className="parceiro-veio-panel parceiro-veio-updates" aria-label="Atualizações recentes">
                <h2 className="parceiro-veio-panel-title">Atualizações recentes</h2>
                {updates.length === 0 ? (
                  <p className="parceiro-veio-muted">
                    Nenhuma atualização recente. Você pode continuar acompanhando seus
                    projetos abaixo.
                  </p>
                ) : (
                  <ul className="parceiro-veio-updates-list">
                    {updates.map((item) => {
                      const Icon = updateIcon(item.kind);
                      return (
                        <li key={item.id}>
                          <Link
                            href={`/parceiro/projetos/${item.projectId}`}
                            className="parceiro-veio-update-item"
                          >
                            <span className={cn("parceiro-veio-update-icon", `is-${item.kind}`)}>
                              <Icon className="h-4 w-4" aria-hidden />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="parceiro-veio-update-label">{item.label}</span>
                              <span className="parceiro-veio-update-time">
                                {formatPartnerRelativeTime(item.occurredAt)}
                              </span>
                            </span>
                            <ChevronRight className="h-4 w-4 opacity-40 shrink-0" aria-hidden />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>

            <section className="parceiro-veio-metrics" aria-label="Resumo">
              <Link href={partnerProjectsHref("TODOS")} className="parceiro-veio-metric">
                <span className="parceiro-veio-metric-value is-copper">{metrics.linked}</span>
                <span className="parceiro-veio-metric-label">projetos vinculados</span>
              </Link>
              <Link href={partnerProjectsHref("PRODUCAO")} className="parceiro-veio-metric">
                <span className="parceiro-veio-metric-value is-copper">{metrics.inFactory}</span>
                <span className="parceiro-veio-metric-label">na fábrica</span>
              </Link>
              <div className="parceiro-veio-metric">
                <span className="parceiro-veio-metric-value is-celadon">
                  {metrics.upcomingInstall}
                </span>
                <span className="parceiro-veio-metric-label">montagem prevista</span>
              </div>
            </section>

            {partner.hasIssuedReceipt ? (
              <Link
                href="/parceiro/comissoes"
                className="parceiro-veio-receipt-notice"
              >
                <FileText className="h-4 w-4 shrink-0" aria-hidden />
                <span>
                  {partner.issuedReceiptCount === 1
                    ? "1 recibo disponível"
                    : `${partner.issuedReceiptCount} recibos disponíveis`}
                </span>
                <ChevronRight className="h-4 w-4 ml-auto opacity-60" aria-hidden />
              </Link>
            ) : null}

            <section className="parceiro-veio-panel" aria-label="Projetos acompanhados">
              <div className="parceiro-veio-panel-head">
                <h2 className="parceiro-veio-panel-title">Projetos acompanhados</h2>
                <Link href="/parceiro/projetos" className="parceiro-veio-text-btn">
                  Ver todos os projetos
                </Link>
              </div>

              {tracked.length === 0 ? (
                <p className="parceiro-veio-muted">
                  Nenhum projeto nesta etapa. Limpe o filtro para ver todos.
                </p>
              ) : (
                <>
                  <div className="parceiro-veio-table-wrap">
                    <table className="parceiro-veio-table">
                      <thead>
                        <tr>
                          <th scope="col">Projeto / Cliente</th>
                          <th scope="col">Ambientes</th>
                          <th scope="col">Etapa atual</th>
                          <th scope="col">Última atualização</th>
                          <th scope="col">Arquivos</th>
                          <th scope="col">
                            <span className="sr-only">Ação</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {tracked.map((project) => {
                          const family = partnerProjectStageFamily(project.status_geral);
                          const envs =
                            formatPartnerProjectEnvironmentsLine(project.environments) ||
                            "—";
                          return (
                            <tr key={project.id}>
                              <td>
                                <Link
                                  href={`/parceiro/projetos/${project.id}`}
                                  className="parceiro-veio-project-cell"
                                >
                                  <span className="parceiro-veio-thumb" aria-hidden>
                                    {initials(project.client.nome)}
                                  </span>
                                  <span>
                                    <span className="parceiro-veio-project-name">
                                      {project.client.nome}
                                    </span>
                                    <span className="parceiro-veio-project-meta">
                                      {project.client.cidade || "Cidade não informada"}
                                    </span>
                                  </span>
                                </Link>
                              </td>
                              <td>{envs}</td>
                              <td>
                                <span
                                  className={cn(
                                    "parceiro-veio-stage",
                                    family && `is-${family}`
                                  )}
                                >
                                  <span className="parceiro-veio-stage-dot" aria-hidden />
                                  {partnerProjectStageLabel(project.status_geral)}
                                </span>
                              </td>
                              <td className="parceiro-veio-mono">
                                {formatPartnerRelativeTime(project.updatedAt)}
                              </td>
                              <td>
                                {project.filesCount > 0
                                  ? `${project.filesCount} arquivo${project.filesCount === 1 ? "" : "s"}`
                                  : project.hasQuotePdf
                                    ? "PDF"
                                    : "—"}
                              </td>
                              <td>
                                <Link
                                  href={`/parceiro/projetos/${project.id}`}
                                  className="parceiro-veio-row-action"
                                >
                                  Ver projeto
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <ul className="parceiro-veio-cards">
                    {tracked.map((project) => {
                      const family = partnerProjectStageFamily(project.status_geral);
                      const envs =
                        formatPartnerProjectEnvironmentsLine(project.environments) ||
                        "—";
                      return (
                        <li key={project.id}>
                          <Link
                            href={`/parceiro/projetos/${project.id}`}
                            className="parceiro-veio-card"
                          >
                            <span className="parceiro-veio-card-top">
                              <span className="parceiro-veio-thumb" aria-hidden>
                                {initials(project.client.nome)}
                              </span>
                              <span className="min-w-0">
                                <span className="parceiro-veio-project-name">
                                  {project.client.nome}
                                </span>
                                <span className="parceiro-veio-project-meta">{envs}</span>
                              </span>
                            </span>
                            <span className="parceiro-veio-card-meta">
                              <span
                                className={cn(
                                  "parceiro-veio-stage",
                                  family && `is-${family}`
                                )}
                              >
                                <span className="parceiro-veio-stage-dot" aria-hidden />
                                {partnerProjectStageLabel(project.status_geral)}
                              </span>
                              <span className="parceiro-veio-mono">
                                {formatPartnerRelativeTime(project.updatedAt)}
                              </span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </section>
          </>
        )}
      </div>
    </ParceiroPortalShell>
  );
}
