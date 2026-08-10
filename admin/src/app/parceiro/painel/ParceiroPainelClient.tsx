"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  FolderKanban,
  IdCard,
  Megaphone,
  Package,
  Users,
  Wallet,
} from "lucide-react";
import type { PartnerPortalData, PartnerPortalProject } from "@/lib/partnerPortal";
import ParceiroPortalShell, { useParceiroShellUi } from "@/app/parceiro/ParceiroPortalShell";

interface ParceiroPainelClientProps {
  partner: PartnerPortalData;
  isAdminPreview?: boolean;
}

const STEP_LABEL: Record<string, string> = {
  LEAD: "Briefing",
  ORCAMENTO: "Orçamento",
  NEGOCIACAO: "Negociação",
  CONFERENCIA_TECNICA: "Detalhe",
  APROVADO: "Aprovado",
  PRODUCAO: "Fábrica",
  INSTALACAO: "Montagem",
  FINALIZADO: "Entregue",
  PERDIDO: "Perdido",
};

function isActiveProject(p: PartnerPortalProject) {
  return p.status_geral !== "FINALIZADO" && p.status_geral !== "PERDIDO";
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

  return (
    <div className="space-y-6">
      <div className="parceiro-home-stats">
        <div className="parceiro-home-stat">
          <span className="parceiro-home-stat-value">{activeCount}</span>
          <span className="parceiro-home-stat-label">Em andamento</span>
        </div>
        <div className="parceiro-home-stat">
          <span className="parceiro-home-stat-value">{doneCount}</span>
          <span className="parceiro-home-stat-label">Entregues</span>
        </div>
        <div className="parceiro-home-stat">
          <span className="parceiro-home-stat-value">{partner.projects.length}</span>
          <span className="parceiro-home-stat-label">No total</span>
        </div>
      </div>

      <div className="parceiro-home-tiles">
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
            {recent.map((project) => (
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
                      {project.client.cidade || "Cidade não informada"}
                      {" · "}
                      {STEP_LABEL[project.status_geral] ?? project.status_geral}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-white/35 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export default function ParceiroPainelClient({
  partner: initialPartner,
  isAdminPreview = false,
}: ParceiroPainelClientProps) {
  const [partner, setPartner] = useState(initialPartner);

  const activeCount = partner.projects.filter(isActiveProject).length;
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
