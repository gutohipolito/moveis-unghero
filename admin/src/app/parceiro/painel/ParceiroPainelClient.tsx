"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ChevronRight,
  FileText,
  FolderKanban,
  IdCard,
  Megaphone,
  Package,
  Paperclip,
  Users,
  Wallet,
} from "lucide-react";
import type { PartnerPortalData } from "@/lib/partnerPortal";
import {
  buildPartnerProjectAttention,
  formatPartnerProjectEnvironmentsLine,
  partnerProjectIsActive,
  partnerProjectStageLabel,
  partnerProjectsHref,
  type PartnerProjectAttentionKind,
} from "@/lib/partnerProjectLabels";
import ParceiroPortalShell, { useParceiroShellUi } from "@/app/parceiro/ParceiroPortalShell";
import { cn } from "@/lib/utils";

interface ParceiroPainelClientProps {
  partner: PartnerPortalData;
  isAdminPreview?: boolean;
}

function HomeTile({
  href,
  onClick,
  icon: Icon,
  title,
  subtitle,
}: {
  href?: string;
  onClick?: () => void;
  icon: React.ElementType;
  title: string;
  subtitle: string;
}) {
  const content = (
    <>
      <span className="parceiro-home-bullet-icon">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-white tracking-tight">
          {title}
        </span>
        <span className="block text-[11px] text-white/50 mt-0.5 leading-snug">
          {subtitle}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 text-white/35 shrink-0" />
    </>
  );

  if (href) {
    return (
      <Link href={href} className="parceiro-home-bullet no-underline">
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className="parceiro-home-bullet text-left">
      {content}
    </button>
  );
}

function HomeStat({
  href,
  value,
  label,
}: {
  href: string;
  value: number;
  label: string;
}) {
  return (
    <Link href={href} className="parceiro-home-stat no-underline">
      <span className="parceiro-home-stat-value">{value}</span>
      <span className="parceiro-home-stat-label">{label}</span>
    </Link>
  );
}

function attentionIcon(kind: PartnerProjectAttentionKind) {
  if (kind === "quote_ready") return FileText;
  if (kind === "new_file") return Paperclip;
  return AlertCircle;
}

function PainelHome({
  partner,
  activeCount,
  doneCount,
}: {
  partner: PartnerPortalData;
  activeCount: number;
  doneCount: number;
}) {
  const shellUi = useParceiroShellUi();
  const recent = [...partner.projects]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 3);

  const attention = useMemo(
    () => buildPartnerProjectAttention(partner.projects),
    [partner.projects]
  );

  return (
    <div className="space-y-6">
      <div className="parceiro-home-stats">
        <HomeStat
          href={partnerProjectsHref("ATIVOS")}
          value={activeCount}
          label="Em andamento"
        />
        <HomeStat
          href={partnerProjectsHref("FINALIZADOS")}
          value={doneCount}
          label="Entregues"
        />
        <HomeStat
          href={partnerProjectsHref("TODOS")}
          value={partner.projects.length}
          label="No total"
        />
      </div>

      <section className="parceiro-home-attention">
        <div className="parceiro-home-attention-header">
          <h2 className="parceiro-home-attention-title">Para acompanhar</h2>
          {attention.length > 0 ? (
            <span className="parceiro-home-attention-count">
              {attention.length} agora
            </span>
          ) : null}
        </div>

        {attention.length > 0 ? (
          <ul className="parceiro-home-attention-list">
            {attention.map((item) => {
              const Icon = attentionIcon(item.kind);
              return (
                <li key={`${item.kind}-${item.projectId}`}>
                  <Link
                    href={`/parceiro/projetos/${item.projectId}`}
                    className={cn(
                      "parceiro-home-attention-item",
                      item.kind === "stalled" && "is-stalled"
                    )}
                  >
                    <span className="parceiro-home-bullet-icon shrink-0">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-white truncate">
                        {item.clientNome}
                      </span>
                      <span className="block text-[11px] text-white/45 mt-0.5 truncate">
                        {item.label}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-white/35 shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="parceiro-home-attention-empty">
            <p>
              {partner.projects.length === 0
                ? "Nenhum projeto vinculado ainda. Convide um cliente ou acompanhe quando a Móveis Unghero vincular um trabalho a você."
                : "Tudo em dia por aqui. Abra seus projetos ou convide um novo cliente."}
            </p>
            <div className="parceiro-home-attention-actions">
              <Link href="/parceiro/projetos" className="parceiro-home-cta">
                Ver projetos
              </Link>
              <Link
                href="/parceiro/marketing"
                className="parceiro-home-cta parceiro-home-cta--ghost"
              >
                Convidar cliente
              </Link>
            </div>
          </div>
        )}
      </section>

      {recent.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-3 px-0.5">
            <h2 className="parceiro-home-section-title text-sm font-semibold text-white tracking-tight">
              Projetos recentes
            </h2>
            <Link
              href="/parceiro/projetos"
              className="parceiro-home-section-link text-[11px] font-medium text-white/45 hover:text-white/75 no-underline"
            >
              Ver todos
            </Link>
          </div>
          <ul className="space-y-2">
            {recent.map((project) => {
              const environmentsLine = formatPartnerProjectEnvironmentsLine(
                project.environments
              );
              return (
                <li key={project.id}>
                  <Link
                    href={`/parceiro/projetos/${project.id}`}
                    className="parceiro-home-recent no-underline"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-white truncate">
                        {project.client.nome}
                      </span>
                      <span className="block text-[11px] text-white/45 mt-0.5 truncate">
                        {environmentsLine
                          ? `${environmentsLine} · `
                          : ""}
                        {partnerProjectStageLabel(project.status_geral)}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-white/35 shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="parceiro-home-section-title text-sm font-semibold text-white/70 tracking-tight px-0.5">
          Atalhos
        </h2>
        <div className="parceiro-home-tiles parceiro-home-tiles--secondary">
          <HomeTile
            onClick={() => shellUi?.openInfo()}
            icon={IdCard}
            title="Meu perfil"
            subtitle="Dados profissionais e portfólio"
          />
          <HomeTile
            href="/parceiro/projetos"
            icon={FolderKanban}
            title="Projetos"
            subtitle={
              partner.projects.length === 0
                ? "Nenhum vinculado ainda"
                : activeCount > 0
                  ? `${activeCount} em andamento`
                  : `${partner.projects.length} no total`
            }
          />
          <HomeTile
            href="/parceiro/clientes"
            icon={Users}
            title="Clientes"
            subtitle="Indicações e cadastros"
          />
          <HomeTile
            href="/parceiro/marketing"
            icon={Megaphone}
            title="Convidar cliente"
            subtitle="Link e mensagem para WhatsApp"
          />
          <HomeTile
            href="/parceiro/produtos"
            icon={Package}
            title="Produtos"
            subtitle="Catálogo e referências"
          />
          {partner.hasCommissions ? (
            <HomeTile
              href="/parceiro/comissoes"
              icon={Wallet}
              title="Comissões"
              subtitle="Valores e comprovantes"
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}

export default function ParceiroPainelClient({
  partner: initialPartner,
  isAdminPreview = false,
}: ParceiroPainelClientProps) {
  const [partner, setPartner] = useState(initialPartner);

  const activeCount = partner.projects.filter((p) =>
    partnerProjectIsActive(p.status_geral)
  ).length;
  const doneCount = partner.projects.filter((p) => p.status_geral === "FINALIZADO").length;

  return (
    <ParceiroPortalShell
      partner={partner}
      isAdminPreview={isAdminPreview}
      showHeroPhoto
      onFotoUrlChange={(fotoUrl) => setPartner((prev) => ({ ...prev, fotoUrl }))}
      onPartnerChange={(profile) => setPartner((prev) => ({ ...prev, ...profile }))}
    >
      <PainelHome partner={partner} activeCount={activeCount} doneCount={doneCount} />
    </ParceiroPortalShell>
  );
}
