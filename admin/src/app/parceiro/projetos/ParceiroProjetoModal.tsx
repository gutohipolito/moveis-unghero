"use client";

import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import type { PartnerProjectDetail } from "@/lib/partnerPortal";
import { loadPartnerProjectDetailAction } from "@/app/actions/parceiroPortal";
import ParceiroProjetoDetailView from "@/app/parceiro/projetos/ParceiroProjetoDetailView";

type Props = {
  projectId: string | null;
  currentPartnerId: string;
  onClose: () => void;
};

export default function ParceiroProjetoModal({
  projectId,
  currentPartnerId,
  onClose,
}: Props) {
  const [project, setProject] = useState<PartnerProjectDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setProject(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setProject(null);

    void (async () => {
      const res = await loadPartnerProjectDetailAction(projectId);
      if (cancelled) return;
      if (!res.success) {
        setError(res.error);
        setLoading(false);
        return;
      }
      setProject(res.project);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return (
    <Dialog
      isOpen={Boolean(projectId)}
      onClose={onClose}
      className="parceiro-info-modal parceiro-projeto-modal max-w-2xl w-full"
      backdropClassName="parceiro-info-modal-backdrop"
      bodyClassName="parceiro-projeto-modal-body"
    >
      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-sm font-medium">Carregando projeto…</p>
        </div>
      )}

      {!loading && error && (
        <div className="py-10 px-2 text-center space-y-3">
          <p className="text-sm font-medium text-rose-700">{error}</p>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-slate-700 underline-offset-2 hover:underline"
          >
            Fechar
          </button>
        </div>
      )}

      {!loading && project && (
        <ParceiroProjetoDetailView
          key={project.id}
          project={project}
          currentPartnerId={currentPartnerId}
          showHeader
          compact
        />
      )}
    </Dialog>
  );
}
