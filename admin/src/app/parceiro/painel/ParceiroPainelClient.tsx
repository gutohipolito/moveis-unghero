"use client";

import React from "react";
import Link from "next/link";
import {
  MapPin,
  Building2,
  Layers,
  ExternalLink,
  Sparkles,
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

  return (
    <ParceiroPortalShell partner={partner} isAdminPreview={isAdminPreview} showHeroPhoto>
      <div className="space-y-6">
        <div className="parceiro-portal-meta-row">
          {partner.cidade && (
            <span className="parceiro-portal-chip">
              <MapPin className="h-3 w-3" />
              {partner.cidade}
            </span>
          )}
          {partner.escritorio && (
            <span className="parceiro-portal-chip">
              <Building2 className="h-3 w-3" />
              {partner.escritorio}
            </span>
          )}
          {registroLabel && <span className="parceiro-portal-chip">{registroLabel}</span>}
          {partner.portfolioUrl && (
            <a
              href={partner.portfolioUrl}
              target="_blank"
              rel="noreferrer"
              className="parceiro-portal-chip parceiro-portal-chip-link"
            >
              Portfólio <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {activeCount > 0 && (
            <span className="parceiro-portal-chip">
              {activeCount} projeto{activeCount > 1 ? "s" : ""} em andamento
            </span>
          )}
        </div>

        <section className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-display font-bold tracking-tight text-white">
                Obras vinculadas
              </h2>
              <p className="text-xs text-white/60 mt-0.5">
                Status das obras ligadas ao seu cadastro na Móveis Unghero.
              </p>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-white/70 bg-white/10 border border-white/15 px-2.5 py-1 rounded-full">
              {partner.projects.length} obra{partner.projects.length === 1 ? "" : "s"}
            </span>
          </div>

          {partner.projects.length === 0 ? (
            <div className="partner-card p-10 text-center">
              <div className="partner-card-accent" />
              <div className="inline-flex p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-4">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="font-display font-bold text-slate-900 text-base">
                Nenhuma obra vinculada ainda
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
                  <article key={project.id} className="partner-card">
                    <div className="partner-card-accent" />
                    <div className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-display font-bold text-slate-900 truncate">
                            {project.client.nome}
                          </h3>
                          <p className="text-[11px] text-slate-600 mt-0.5 inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {project.client.cidade || "Cidade não informada"}
                          </p>
                        </div>
                        <p className="text-sm font-display font-bold text-gradient-gold tabular-nums shrink-0">
                          {moneyFmt.format(project.valor_previsto)}
                        </p>
                      </div>

                      {isLost ? (
                        <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
                          Projeto perdido
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex gap-1">
                            {PROJECT_STEPS.map((step, idx) => (
                              <div
                                key={step.id}
                                title={step.label}
                                className={`h-1.5 flex-1 rounded-full ${
                                  idx <= current
                                    ? "bg-gradient-to-r from-amber-400 to-amber-600"
                                    : "bg-slate-200"
                                }`}
                              />
                            ))}
                          </div>
                          <p className="text-[11px] font-semibold text-slate-600">
                            Etapa atual:{" "}
                            <span className="text-slate-900">
                              {PROJECT_STEPS[current]?.label ?? project.status_geral}
                            </span>
                          </p>
                        </div>
                      )}

                      {project.environments.length > 0 && (
                        <div className="partner-card-metric p-3 space-y-2">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                            <Layers className="h-3 w-3" />
                            Ambientes ({project.environments.length})
                          </p>
                          <ul className="space-y-1">
                            {project.environments.slice(0, 4).map((env) => (
                              <li
                                key={env.id}
                                className="flex items-center justify-between gap-2 text-[11px]"
                              >
                                <span className="font-semibold text-slate-800 truncate">
                                  {env.nome}
                                </span>
                                <span className="text-slate-500 shrink-0 text-[10px]">
                                  {env.status.replace(/_/g, " ").toLowerCase()}
                                </span>
                              </li>
                            ))}
                            {project.environments.length > 4 && (
                              <li className="text-[10px] text-slate-500 font-semibold">
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
