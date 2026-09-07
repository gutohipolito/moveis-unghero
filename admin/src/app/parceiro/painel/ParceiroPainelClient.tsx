"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Calendar,
  Factory,
  FileText,
  Image as ImageIcon,
  Paperclip,
  Plus,
} from "lucide-react";
import type { PartnerPortalData } from "@/lib/partnerPortal";
import {
  buildPartnerRecentUpdates,
  formatPartnerProjectEnvironmentsLine,
  formatPartnerRelativeTime,
  partnerOverviewMetrics,
  partnerProjectStageFamily,
  partnerProjectStageLabel,
  partnerProjectsHref,
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

  const updates = useMemo(
    () => buildPartnerRecentUpdates(partner.projects),
    [partner.projects]
  );
  const metrics = useMemo(
    () => partnerOverviewMetrics(partner.projects),
    [partner.projects]
  );

  const tracked = useMemo(() => {
    return [...partner.projects]
      .filter((p) => p.status_geral !== "PERDIDO")
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 6);
  }, [partner.projects]);

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
          <Link href="/parceiro/marketing" className="parceiro-veio-cta">
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
            <Link href="/parceiro/marketing" className="parceiro-veio-cta">
              <Plus className="h-4 w-4" aria-hidden />
              Indicar cliente
            </Link>
          </section>
        ) : (
          <>
            <section className="parceiro-veio-metrics" aria-label="Resumo">
              <Link
                href={partnerProjectsHref("TODOS")}
                className="parceiro-veio-metric is-linked"
              >
                <span className="parceiro-veio-metric-value">{metrics.linked}</span>
                <span className="parceiro-veio-metric-label">vinculados</span>
              </Link>
              <Link
                href={partnerProjectsHref("PRODUCAO")}
                className="parceiro-veio-metric is-factory"
              >
                <span className="parceiro-veio-metric-value">{metrics.inFactory}</span>
                <span className="parceiro-veio-metric-label">na fábrica</span>
              </Link>
              <div className="parceiro-veio-metric is-install">
                <span className="parceiro-veio-metric-value">{metrics.upcomingInstall}</span>
                <span className="parceiro-veio-metric-label">montagem</span>
              </div>
              <Link
                href={partnerProjectsHref("FINALIZADOS")}
                className="parceiro-veio-metric is-delivered"
              >
                <span className="parceiro-veio-metric-value">{metrics.delivered}</span>
                <span className="parceiro-veio-metric-label">entregues</span>
              </Link>
            </section>

            {partner.hasIssuedReceipt ? (
              <Link href="/parceiro/comissoes" className="parceiro-veio-receipt-notice">
                <FileText className="h-4 w-4 shrink-0" aria-hidden />
                <span>
                  {partner.issuedReceiptCount === 1
                    ? "1 recibo disponível"
                    : `${partner.issuedReceiptCount} recibos disponíveis`}
                </span>
                <ChevronRight className="h-4 w-4 ml-auto opacity-60" aria-hidden />
              </Link>
            ) : null}

            <div className="parceiro-veio-home-grid">
              <section
                className="parceiro-veio-panel parceiro-veio-panel--stack"
                aria-label="Projetos acompanhados"
              >
                <div className="parceiro-veio-panel-head">
                  <h2 className="parceiro-veio-panel-title">Projetos acompanhados</h2>
                  <Link href="/parceiro/projetos" className="parceiro-veio-text-btn">
                    Ver todos
                  </Link>
                </div>

                {tracked.length === 0 ? (
                  <p className="parceiro-veio-muted">Nenhum projeto para acompanhar agora.</p>
                ) : (
                  <ul className="parceiro-veio-project-list">
                    {tracked.map((project) => {
                      const family = partnerProjectStageFamily(project.status_geral);
                      const envs =
                        formatPartnerProjectEnvironmentsLine(project.environments) ||
                        "Sem ambientes";
                      const filesLabel =
                        project.filesCount > 0
                          ? `${project.filesCount} arquivo${project.filesCount === 1 ? "" : "s"}`
                          : project.hasQuotePdf
                            ? "PDF disponível"
                            : null;
                      return (
                        <li key={project.id}>
                          <Link
                            href={`/parceiro/projetos/${project.id}`}
                            className="parceiro-veio-project-row"
                          >
                            <span className="parceiro-veio-thumb" aria-hidden>
                              {initials(project.client.nome)}
                            </span>
                            <span className="parceiro-veio-project-row-main min-w-0">
                              <span className="parceiro-veio-project-name">
                                {project.client.nome}
                              </span>
                              <span className="parceiro-veio-project-meta">
                                {envs}
                                {project.client.cidade
                                  ? ` · ${project.client.cidade}`
                                  : ""}
                              </span>
                            </span>
                            <span className="parceiro-veio-project-row-side">
                              <span
                                className={cn(
                                  "parceiro-veio-stage",
                                  family && `is-${family}`
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
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section
                className="parceiro-veio-panel parceiro-veio-panel--stack parceiro-veio-updates"
                aria-label="Atualizações recentes"
              >
                <div className="parceiro-veio-panel-head">
                  <h2 className="parceiro-veio-panel-title">Atualizações recentes</h2>
                </div>
                {updates.length === 0 ? (
                  <p className="parceiro-veio-muted">
                    Nenhuma atualização recente. Continue acompanhando os projetos ao lado.
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
          </>
        )}
      </div>
    </ParceiroPortalShell>
  );
}
