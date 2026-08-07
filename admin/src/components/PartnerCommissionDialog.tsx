"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Percent } from "lucide-react";
import {
  createPartnerCommission,
  listEligibleCommissionProjects,
  type PartnerCommissionDTO,
} from "@/app/actions/partnerCommissions";
import { formatCurrencyBRL } from "@/lib/currencyExtenso";

interface PartnerCommissionDialogProps {
  open: boolean;
  onClose: () => void;
  /** Pré-seleciona parceiro (ex.: filtro da aba). */
  initialPartnerId?: string | null;
  onCreated: (commission: PartnerCommissionDTO) => void;
}

type EligibleProject = {
  id: string;
  partner_id: string;
  cliente_nome: string;
  quotes: {
    id: string;
    codigo: string | null;
    versao: number;
    base_valor: number;
  }[];
};

export default function PartnerCommissionDialog({
  open,
  onClose,
  initialPartnerId,
  onCreated,
}: PartnerCommissionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partners, setPartners] = useState<{ id: string; nome: string; tipo: string }[]>([]);
  const [projects, setProjects] = useState<EligibleProject[]>([]);
  const [partnerId, setPartnerId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [quoteId, setQuoteId] = useState("");
  const [percentual, setPercentual] = useState("5");
  const [dataPrevista, setDataPrevista] = useState("");
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setLoading(true);
    setPercentual("5");
    setDataPrevista("");
    setObservacoes("");
    void (async () => {
      const res = await listEligibleCommissionProjects(initialPartnerId || undefined);
      if (cancelled) return;
      setLoading(false);
      if (!res.success) {
        setError(res.error);
        setPartners([]);
        setProjects([]);
        return;
      }
      setPartners(res.partners);
      setProjects(res.projects);
      const firstPartner =
        (initialPartnerId && res.partners.some((p) => p.id === initialPartnerId)
          ? initialPartnerId
          : res.partners[0]?.id) || "";
      setPartnerId(firstPartner);
      const partnerProjects = res.projects.filter((p) => p.partner_id === firstPartner);
      const firstProject = partnerProjects[0]?.id || "";
      setProjectId(firstProject);
      setQuoteId(partnerProjects[0]?.quotes[0]?.id || "");
    })();
    return () => {
      cancelled = true;
    };
  }, [open, initialPartnerId]);

  const partnerProjects = useMemo(
    () => projects.filter((p) => p.partner_id === partnerId),
    [projects, partnerId]
  );

  const selectedProject = useMemo(
    () => partnerProjects.find((p) => p.id === projectId) ?? null,
    [partnerProjects, projectId]
  );

  const selectedQuote = useMemo(
    () => selectedProject?.quotes.find((q) => q.id === quoteId) ?? null,
    [selectedProject, quoteId]
  );

  const partnerName =
    partners.find((p) => p.id === partnerId)?.nome || "Parceiro";

  const pct = Number(percentual.replace(",", "."));
  const valorEstimado =
    selectedQuote && Number.isFinite(pct) && pct > 0
      ? Math.round(((selectedQuote.base_valor * pct) / 100) * 100) / 100
      : 0;

  const handlePartnerChange = (id: string) => {
    setPartnerId(id);
    const nextProjects = projects.filter((p) => p.partner_id === id);
    const nextProject = nextProjects[0]?.id || "";
    setProjectId(nextProject);
    setQuoteId(nextProjects[0]?.quotes[0]?.id || "");
  };

  const handleProjectChange = (id: string) => {
    setProjectId(id);
    const proj = partnerProjects.find((p) => p.id === id);
    setQuoteId(proj?.quotes[0]?.id || "");
  };

  const handleSubmit = async () => {
    if (!projectId || !quoteId) {
      setError("Selecione parceiro, projeto e orçamento aprovado.");
      return;
    }
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      setError("Informe um percentual válido (0–100).");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await createPartnerCommission({
      projectId,
      quoteId,
      percentual: pct,
      data_pagamento_prevista: dataPrevista || null,
      observacoes: observacoes || null,
    });
    setSaving(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    onCreated(res.commission);
    onClose();
  };

  const empty = !loading && (partners.length === 0 || projects.length === 0);

  return (
    <Dialog isOpen={open} onClose={onClose} className="max-w-md w-full">
      <div className="space-y-4 p-5">
        <div className="space-y-1">
          <h2 className="text-lg font-black text-foreground flex items-center gap-2">
            <Percent className="h-5 w-5 text-amber-600" />
            Nova comissão
          </h2>
          <p className="text-xs text-muted-foreground">
            Uso interno em Projetistas e Arquitetos. Não aparece no orçamento do cliente.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : empty ? (
          <p className="text-sm text-muted-foreground py-4">
            Nenhum projeto elegível: é preciso parceiro vinculado e orçamento com valor
            aprovado (sem comissão ativa).
          </p>
        ) : (
          <>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Parceiro
              </label>
              <select
                value={partnerId}
                onChange={(e) => handlePartnerChange(e.target.value)}
                className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm font-semibold cursor-pointer"
              >
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Projeto / cliente
              </label>
              <select
                value={projectId}
                onChange={(e) => handleProjectChange(e.target.value)}
                className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm font-semibold cursor-pointer"
                disabled={partnerProjects.length === 0}
              >
                {partnerProjects.length === 0 ? (
                  <option value="">Nenhum projeto elegível</option>
                ) : (
                  partnerProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.cliente_nome}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Orçamento (base aprovada)
              </label>
              <select
                value={quoteId}
                onChange={(e) => setQuoteId(e.target.value)}
                className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm font-semibold cursor-pointer"
                disabled={!selectedProject}
              >
                {(selectedProject?.quotes || []).map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.codigo || `v${q.versao}`} · {formatCurrencyBRL(q.base_valor)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Percentual (%)
                </label>
                <div className="relative">
                  <Percent className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={percentual}
                    onChange={(e) => setPercentual(e.target.value)}
                    className="pl-8 h-10"
                    inputMode="decimal"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Pagamento previsto
                </label>
                <Input
                  type="date"
                  value={dataPrevista}
                  onChange={(e) => setDataPrevista(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-muted/30 p-3 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Valor da comissão · {partnerName}
              </p>
              <p className="text-lg font-display font-bold tabular-nums text-foreground">
                {formatCurrencyBRL(valorEstimado)}
              </p>
              {selectedQuote && (
                <p className="text-[11px] text-muted-foreground">
                  Sobre {formatCurrencyBRL(selectedQuote.base_valor)} aprovados
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Observações
              </label>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm resize-none"
                placeholder="Opcional — só uso interno"
              />
            </div>
          </>
        )}

        {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} className="cursor-pointer">
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving || loading || empty || !quoteId}
            className="cursor-pointer gap-1.5"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Salvar comissão
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
