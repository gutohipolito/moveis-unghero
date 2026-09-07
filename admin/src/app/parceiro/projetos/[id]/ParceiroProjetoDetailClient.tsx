"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import type { PartnerPortalData, PartnerProjectDetail } from "@/lib/partnerPortal";
import { partnerProjectValueVisible } from "@/lib/partnerPortal";
import { formatPartnerRelativeTime } from "@/lib/partnerProjectLabels";
import ParceiroPortalShell from "@/app/parceiro/ParceiroPortalShell";
import ParceiroProjetoDetailView from "@/app/parceiro/projetos/ParceiroProjetoDetailView";
import { cn } from "@/lib/utils";

const moneyFmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

interface Props {
  partner: PartnerPortalData;
  project: PartnerProjectDetail;
  isAdminPreview?: boolean;
}

export default function ParceiroProjetoDetailClient({
  partner,
  project,
  isAdminPreview = false,
}: Props) {
  const valueVisible = partnerProjectValueVisible(project.status_geral);

  return (
    <ParceiroPortalShell partner={partner} isAdminPreview={isAdminPreview}>
      <div className="parceiro-veio-detail-page">
        <Link href="/parceiro/projetos" className="parceiro-veio-back">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Projetos
        </Link>

        <header className="parceiro-veio-detail-header">
          <div className="min-w-0 flex-1">
            <p className="parceiro-veio-detail-kicker">Projeto</p>
            <h1 className="parceiro-veio-title">{project.client.nome}</h1>
            <p className="parceiro-veio-detail-meta">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{project.client.cidade || "Cidade não informada"}</span>
              <span aria-hidden>·</span>
              <span>Atualizado {formatPartnerRelativeTime(project.updatedAt)}</span>
            </p>
          </div>
          <p
            className={cn(
              "parceiro-veio-detail-header-value",
              !valueVisible && "is-muted"
            )}
            title={
              valueVisible
                ? undefined
                : "Valor liberado após aprovação do orçamento"
            }
          >
            {valueVisible
              ? moneyFmt.format(project.valor_previsto)
              : "Após aprovação"}
          </p>
        </header>

        <ParceiroProjetoDetailView
          project={project}
          currentPartnerId={partner.id}
          showHeader={false}
        />
      </div>
    </ParceiroPortalShell>
  );
}
