"use client";

import React from "react";
import Link from "next/link";
import {
  MapPin,
  Building2,
  Layers,
  ExternalLink,
  FolderKanban,
  IdCard,
} from "lucide-react";
import type { PartnerPortalData } from "@/lib/partnerPortal";
import { formatPartnerRegistro } from "@/lib/partnerTypes";
import ParceiroPortalShell from "@/app/parceiro/ParceiroPortalShell";

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

const moneyFmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function stepIndex(status: string) {
  if (status === "PERDIDO") return -1;
  const idx = PROJECT_STEPS.findIndex((s) => s.id === status);
  return idx >= 0 ? idx : 0;
}

interface ParceiroPainelClientProps {
  partner: PartnerPortalData;
  isAdminPreview?: boolean;
}

export default function ParceiroPainelClient({
  partner,
  isAdminPreview = false,
}: ParceiroPainelClientProps) {
  const registroLabel = formatPartnerRegistro(partner.tipo, partner.registro_profissional);
  const activeCount = partner.projects.filter(
    (p) => p.status_geral !== "FINALIZADO" && p.status_geral !== "PERDIDO"
  ).length;

  const infoItems = [
    partner.cidade
      ? { key: "cidade", label: "Cidade", value: partner.cidade, icon: MapPin }
      : null,
    partner.escritorio
      ? {
          key: "escritorio",
          label: "Empresa / escritório",
          value: partner.escritorio,
          icon: Building2,
        }
      : null,
    registroLabel
      ? { key: "registro", label: "Registro", value: registroLabel, icon: IdCard }
      : null,
    partner.portfolioUrl
      ? {
          key: "portfolio",
          label: "Portfólio",
          value: partner.portfolioUrl,
          href: partner.portfolioUrl,
          icon: ExternalLink,
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    value: string;
    href?: string;
    icon: typeof MapPin;
  }>;

  return (
    <ParceiroPortalShell partner={partner} isAdminPreview={isAdminPreview} showHeroPhoto>
      <div className="space-y-6">
        {infoItems.length > 0 && (
          <section className="parceiro-info-card">
            <div className="parceiro-info-card-accent" />
            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-display font-bold tracking-tight text-slate-900">
                  Informações
                </h2>
                {activeCount > 0 && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded-full">
                    {activeCount} em andamento
                  </span>
                )}
              </div>
              <div className="parceiro-info-grid">
                {infoItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.key} className="parceiro-info-item">
                      <p className="parceiro-info-label inline-flex items-center gap-1.5">
                        <Icon className="h-3 w-3 opacity-70" />
                        {item.label}
                      </p>
                      <p className="parceiro-info-value">
                        {item.href ? (
                          <a
                            href={item.href}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5"
                          >
                            Abrir portfólio
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          item.value
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        <section className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-display font-bold tracking-tight text-white">
                Meus projetos
              </h2>
              <p className="text-xs text-white/60 mt-0.5">
                Projetos vinculados ao seu cadastro na Móveis Unghero.
              </p>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-white/70 bg-white/10 border border-white/15 px-2.5 py-1 rounded-full">
              {partner.projects.length}
            </span>
          </div>

          {partner.projects.length === 0 ? (
            <div className="partner-card p-10 text-center cursor-default">
              <div className="partner-card-accent" />
              <div className="inline-flex p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-4">
                <FolderKanban className="h-6 w-6" />
              </div>
              <h3 className="font-display font-bold text-slate-900 text-base">
                Nenhum projeto vinculado ainda
              </h3>
              <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
                Quando a Móveis Unghero vincular um orçamento ou projeto ao seu nome, ele aparece
                aqui com o andamento atualizado.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {partner.projects.map((project) => {
                const current = stepIndex(project.status_geral);
                const isLost = project.status_geral === "PERDIDO";

                return (
                  <article key={project.id} className="parceiro-project-card">
                    <div className="parceiro-project-card-sheen" aria-hidden />
                    <div className="parceiro-project-card-body">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-display font-bold text-[1.05rem] leading-snug truncate">
                            {project.client.nome}
                          </h3>
                          <p className="text-[11px] font-semibold text-black/70 mt-0.5 inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {project.client.cidade || "Cidade não informada"}
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
                                <span className="font-semibold text-[#1a1208] truncate">
                                  {env.nome}
                                </span>
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
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <p className="text-center text-[11px] text-white/55 pb-2">
          Precisa atualizar cadastro além da foto? Fale com a equipe da{" "}
          <Link href="/cadastro-parceiro" className="text-amber-300 font-semibold hover:underline">
            Móveis Unghero
          </Link>
          .
        </p>
      </div>
    </ParceiroPortalShell>
  );
}
