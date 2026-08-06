"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronRight, FolderKanban, IdCard } from "lucide-react";
import type { PartnerPortalData } from "@/lib/partnerPortal";
import ParceiroPortalShell, { useParceiroShellUi } from "@/app/parceiro/ParceiroPortalShell";

interface ParceiroPainelClientProps {
  partner: PartnerPortalData;
  isAdminPreview?: boolean;
}

function PainelHomeCards({
  partner,
  activeCount,
}: {
  partner: PartnerPortalData;
  activeCount: number;
}) {
  const shellUi = useParceiroShellUi();

  return (
    <div className="parceiro-home-tiles">
      <button
        type="button"
        onClick={() => shellUi?.openInfo()}
        className="parceiro-home-bullet text-left"
      >
        <span className="parceiro-home-bullet-icon">
          <IdCard className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-white tracking-tight">
            Meu perfil
          </span>
          <span className="block text-[11px] text-white/50 mt-0.5 leading-snug">
            Dados profissionais e portfólio
          </span>
        </span>
        <ChevronRight className="h-4 w-4 text-white/35 shrink-0" />
      </button>

      <Link href="/parceiro/projetos" className="parceiro-home-bullet no-underline">
        <span className="parceiro-home-bullet-icon">
          <FolderKanban className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-white tracking-tight">
            Projetos
          </span>
          <span className="block text-[11px] text-white/50 mt-0.5 leading-snug">
            {partner.projects.length === 0
              ? "Nenhum vinculado ainda"
              : activeCount > 0
                ? `${activeCount} em andamento`
                : `${partner.projects.length} no total`}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 text-white/35 shrink-0" />
      </Link>
    </div>
  );
}

export default function ParceiroPainelClient({
  partner: initialPartner,
  isAdminPreview = false,
}: ParceiroPainelClientProps) {
  const [partner, setPartner] = useState(initialPartner);

  const activeCount = partner.projects.filter(
    (p) => p.status_geral !== "FINALIZADO" && p.status_geral !== "PERDIDO"
  ).length;

  return (
    <ParceiroPortalShell
      partner={partner}
      isAdminPreview={isAdminPreview}
      showHeroPhoto
      onFotoUrlChange={(fotoUrl) => setPartner((prev) => ({ ...prev, fotoUrl }))}
      onPartnerChange={(profile) => setPartner((prev) => ({ ...prev, ...profile }))}
    >
      <PainelHomeCards partner={partner} activeCount={activeCount} />
    </ParceiroPortalShell>
  );
}
