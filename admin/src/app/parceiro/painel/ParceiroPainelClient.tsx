"use client";

import React from "react";
import Link from "next/link";
import {
  LogOut,
  MapPin,
  Building2,
  Layers,
  ExternalLink,
  PenTool,
  Sparkles,
} from "lucide-react";
import { logoutParceiro } from "@/app/actions/parceiroPortal";
import type { PartnerPortalData } from "@/lib/partnerPortal";
import { getPartnerRoleLabel, formatPartnerRegistro } from "@/lib/partnerTypes";
import { Button } from "@/components/ui/button";

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

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

interface ParceiroPainelClientProps {
  partner: PartnerPortalData;
}

export default function ParceiroPainelClient({ partner }: ParceiroPainelClientProps) {
  const roleLabel = getPartnerRoleLabel(partner.tipo, partner.nome);
  const registroLabel = formatPartnerRegistro(partner.tipo, partner.registro_profissional);
  const activeCount = partner.projects.filter(
    (p) => p.status_geral !== "FINALIZADO" && p.status_geral !== "PERDIDO"
  ).length;

  return (
    <div className="min-h-screen bg-radial-gradient from-[#221c18] to-[#120e0c] text-foreground relative overflow-x-hidden">
      <div className="absolute top-0 right-0 w-[420px] h-[420px] rounded-full bg-primary/8 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[380px] h-[380px] rounded-full bg-amber-500/5 blur-[100px] pointer-events-none" />

      <header className="relative z-10 border-b border-border/40 bg-black/25 backdrop-blur-md sticky top-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="partner-card-avatar h-11 w-11 shrink-0">
              {partner.fotoUrl ? (
                <img
                  src={partner.fotoUrl}
                  alt={partner.nome}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="partner-card-avatar-fallback h-11 w-11 text-sm rounded-[inherit]">
                  {getInitials(partner.nome)}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary/90">
                Portal do Parceiro
              </p>
              <p className="text-sm font-display font-bold truncate">{partner.nome}</p>
            </div>
          </div>
          <form action={logoutParceiro}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="gap-1.5 border-border/50 bg-white/5 hover:bg-white/10"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </Button>
          </form>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
        <section className="partner-card-detail-header p-6 sm:p-8">
          <div className="partner-card-accent absolute inset-x-0 top-0" />
          <div className="flex flex-col sm:flex-row sm:items-end gap-5">
            <div className="partner-card-avatar h-20 w-auto min-w-20 max-w-32">
              {partner.fotoUrl ? (
                <img
                  src={partner.fotoUrl}
                  alt={partner.nome}
                  className="h-full w-auto max-w-32 object-contain"
                />
              ) : (
                <div className="partner-card-avatar-fallback h-20 w-20 text-2xl rounded-[inherit]">
                  {getInitials(partner.nome)}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="partner-card-badge text-[10px] px-2.5 py-0.5">
                  <PenTool className="h-3 w-3" />
                  {roleLabel}
                </span>
                {partner.cidade && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-white/10 px-2.5 py-0.5 rounded-full border border-border/40">
                    <MapPin className="h-3 w-3" />
                    {partner.cidade}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">
                Olá, {partner.nome.split(" ")[0]}
              </h1>
              <p className="text-sm text-muted-foreground max-w-xl">
                Acompanhe as obras que você indicou ou co-projeta com a Móveis Unghero.
                {activeCount > 0
                  ? ` Você tem ${activeCount} projeto${activeCount > 1 ? "s" : ""} em andamento.`
                  : ""}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                {partner.escritorio && (
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    {partner.escritorio}
                  </span>
                )}
                {registroLabel && <span>{registroLabel}</span>}
                {partner.portfolioUrl && (
                  <a
                    href={partner.portfolioUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                  >
                    Portfólio <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-display font-bold tracking-tight">Obras vinculadas</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Status comercial e de produção das obras ligadas ao seu cadastro.
              </p>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-white/5 border border-border/40 px-2.5 py-1 rounded-full">
              {partner.projects.length} obra{partner.projects.length === 1 ? "" : "s"}
            </span>
          </div>

          {partner.projects.length === 0 ? (
            <div className="partner-card p-10 text-center">
              <div className="partner-card-accent" />
              <div className="inline-flex p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-4">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="font-display font-bold text-foreground text-base">
                Nenhuma obra vinculada ainda
              </h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">
                Quando a Unghero vincular um orçamento ou projeto ao seu nome, ele aparece aqui
                com o andamento atualizado.
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
                          <h3 className="font-display font-bold text-foreground truncate">
                            {project.client.nome}
                          </h3>
                          <p className="text-[11px] text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {project.client.cidade || "Cidade não informada"}
                          </p>
                        </div>
                        <p className="text-sm font-display font-bold text-gradient-gold tabular-nums shrink-0">
                          {moneyFmt.format(project.valor_previsto)}
                        </p>
                      </div>

                      {isLost ? (
                        <p className="text-[11px] font-bold uppercase tracking-wider text-rose-400/90">
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
                                    : "bg-white/10"
                                }`}
                              />
                            ))}
                          </div>
                          <p className="text-[11px] font-semibold text-muted-foreground">
                            Etapa atual:{" "}
                            <span className="text-foreground">
                              {PROJECT_STEPS[current]?.label ?? project.status_geral}
                            </span>
                          </p>
                        </div>
                      )}

                      {project.environments.length > 0 && (
                        <div className="partner-card-metric p-3 space-y-2">
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                            <Layers className="h-3 w-3" />
                            Ambientes ({project.environments.length})
                          </p>
                          <ul className="space-y-1">
                            {project.environments.slice(0, 4).map((env) => (
                              <li
                                key={env.id}
                                className="flex items-center justify-between gap-2 text-[11px]"
                              >
                                <span className="font-semibold text-foreground truncate">
                                  {env.nome}
                                </span>
                                <span className="text-muted-foreground shrink-0 text-[10px]">
                                  {env.status.replace(/_/g, " ").toLowerCase()}
                                </span>
                              </li>
                            ))}
                            {project.environments.length > 4 && (
                              <li className="text-[10px] text-muted-foreground font-semibold">
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

        <p className="text-center text-[11px] text-muted-foreground pb-6">
          Precisa atualizar seus dados?{" "}
          <Link href="/cadastro-parceiro" className="text-primary font-semibold hover:underline">
            Fale com a Unghero
          </Link>{" "}
          ou use o cadastro de parceiro.
        </p>
      </main>
    </div>
  );
}
