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
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => shellUi?.openInfo()}
        className="parceiro-home-bullet w-full text-left"
      >
        <span className="parceiro-home-bullet-icon">
          <IdCard className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-white tracking-tight">
            Informações
          </span>
          <span className="block text-[11px] text-white/55 mt-0.5">
            Nome, cidade, registro, portfólio e mais
          </span>
        </span>
        <ChevronRight className="h-4 w-4 text-white/40 shrink-0" />
      </button>

      <Link href="/parceiro/projetos" className="parceiro-project-card block no-underline">
        <div className="parceiro-project-card-sheen" aria-hidden />
        <div className="parceiro-project-card-body !flex-row !items-center !gap-4 py-5">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-black/15 border border-black/10 shrink-0">
            <FolderKanban className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display font-bold text-base text-[#1a1208]">
              Meus projetos
            </span>
            <span className="block text-[11px] font-semibold text-black/65 mt-0.5">
              {partner.projects.length === 0
                ? "Nenhum projeto vinculado ainda"
                : activeCount > 0
                  ? `${activeCount} em andamento · ${partner.projects.length} no total`
                  : `${partner.projects.length} projeto${partner.projects.length === 1 ? "" : "s"}`}
            </span>
          </span>
          <ChevronRight className="h-5 w-5 text-[#1a1208]/55 shrink-0" />
        </div>
      </Link>

      <p className="text-center text-[11px] text-white/55 pb-2 pt-2">
        Precisa de ajuda? Fale com a equipe da{" "}
        <Link href="/cadastro-parceiro" className="text-amber-300 font-semibold hover:underline">
          Móveis Unghero
        </Link>
        .
      </p>
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
