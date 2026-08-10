"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import type { PartnerPortalData, PartnerProjectDetail } from "@/lib/partnerPortal";
import { partnerProjectValueVisible } from "@/lib/partnerPortal";
import ParceiroPortalShell from "@/app/parceiro/ParceiroPortalShell";
import ParceiroProjetoDetailView from "@/app/parceiro/projetos/ParceiroProjetoDetailView";

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
  return (
    <ParceiroPortalShell partner={partner} isAdminPreview={isAdminPreview}>
      <div className="space-y-6">
        <div>
          <Link
            href="/parceiro/projetos"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-white/50 hover:text-white/80 w-fit mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Projetos
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <p className="parceiro-page-kicker">Projeto</p>
              <h1 className="parceiro-page-title">{project.client.nome}</h1>
              <p className="text-[12px] text-white/45 mt-1 inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {project.client.cidade || "Cidade não informada"}
              </p>
            </div>
            <p
              className="text-lg font-display font-semibold tabular-nums text-[hsl(210_12%_78%)]"
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
        </div>

        <ParceiroProjetoDetailView
          project={project}
          currentPartnerId={partner.id}
          showHeader={false}
        />
      </div>
    </ParceiroPortalShell>
  );
}
