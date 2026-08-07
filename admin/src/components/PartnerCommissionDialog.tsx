"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Percent } from "lucide-react";
import { cn } from "@/lib/utils";
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

const fieldBase =
  "w-full h-10 rounded-lg border px-3 text-sm font-semibold transition-colors";
const fieldActive = "border-border bg-card text-foreground cursor-pointer";
const fieldLocked =
  "border-stone-400/50 bg-stone-500/25 text-stone-500 cursor-not-allowed opacity-90 dark:bg-stone-700/50 dark:text-stone-400";

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
    setPartnerId("");
    setProjectId("");
    setQuoteId("");
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

      // Só pré-seleciona se veio filtro explícito do operador
      if (
        initialPartnerId &&
        res.partners.some((p) => p.id === initialPartnerId)
      ) {
        setPartnerId(initialPartnerId);
        const partnerProjects = res.projects.filter(
          (p) => p.partner_id === initialPartnerId
        );
        const firstProject = partnerProjects[0]?.id || "";
        setProjectId(firstProject);
        setQuoteId(partnerProjects[0]?.quotes[0]?.id || "");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, initialPartnerId]);

  const partnerProjects = useMemo(
    () => (partnerId ? projects.filter((p) => p.partner_id === partnerId) : []),
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

  const partnerSelected = Boolean(partnerId);
  const projectSelected = Boolean(projectId && selectedProject);

  const pct = Number(percentual.replace(",", "."));
  const valorEstimado =
    selectedQuote && Number.isFinite(pct) && pct > 0
      ? Math.round(((selectedQuote.base_valor * pct) / 100) * 100) / 100
      : 0;

  const handlePartnerChange = (id: string) => {
    setPartnerId(id);
    if (!id) {
      setProjectId("");
      setQuoteId("");
      return;
    }
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
    if (!partnerId) {
      setError("1º passo: escolha o parceiro.");
      return;
    }
    if (!projectId || !quoteId) {
      setError("Escolha o projeto e o orçamento aprovado deste parceiro.");
      return;
    }
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      setError("Digite o percentual da comissão (ex.: 5).");
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

  const empty = !loading && partners.length === 0;

  return (
    <Dialog isOpen={open} onClose={onClose} className="max-w-md w-full">
      <div className="space-y-4 p-5">
        <div className="space-y-1.5">
          <h2 className="text-lg font-black text-foreground flex items-center gap-2">
            <Percent className="h-5 w-5 text-amber-600" />
            Lançar comissão
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Siga a ordem: <strong>parceiro → projeto → orçamento → %</strong>. O valor é
            calculado sobre o orçamento já aprovado. Este registro é só interno — o cliente
            não vê.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : empty ? (
          <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2 text-sm text-muted-foreground leading-relaxed">
            <p className="font-semibold text-foreground">Ainda não dá para lançar</p>
            <ol className="list-decimal pl-4 space-y-1 text-xs">
              <li>No CRM, vincule o parceiro ao projeto.</li>
              <li>Aprove o orçamento (com valor).</li>
              <li>Volte aqui e clique em “Lançar comissão”.</li>
            </ol>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                1. Parceiro
              </label>
              <select
                value={partnerId}
                onChange={(e) => handlePartnerChange(e.target.value)}
                className={cn(fieldBase, fieldActive)}
              >
                <option value="">Selecione o parceiro…</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-muted-foreground">
                Quem vai receber a comissão deste trabalho.
              </p>
            </div>

            <div className="space-y-1.5">
              <label
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wider",
                  partnerSelected ? "text-muted-foreground" : "text-stone-500"
                )}
              >
                2. Projeto / cliente
              </label>
              <select
                value={projectId}
                onChange={(e) => handleProjectChange(e.target.value)}
                className={cn(
                  fieldBase,
                  partnerSelected ? fieldActive : fieldLocked
                )}
                disabled={!partnerSelected}
              >
                {!partnerSelected ? (
                  <option value="">Selecione o parceiro primeiro…</option>
                ) : partnerProjects.length === 0 ? (
                  <option value="">
                    Este parceiro não tem projeto com orçamento aprovado
                  </option>
                ) : (
                  <>
                    <option value="">Selecione o projeto…</option>
                    {partnerProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.cliente_nome}
                      </option>
                    ))}
                  </>
                )}
              </select>
              {!partnerSelected && (
                <p className="text-[10px] text-stone-500">
                  Liberado depois que você escolher o parceiro.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wider",
                  projectSelected ? "text-muted-foreground" : "text-stone-500"
                )}
              >
                3. Orçamento aprovado (base de cálculo)
              </label>
              <select
                value={quoteId}
                onChange={(e) => setQuoteId(e.target.value)}
                className={cn(
                  fieldBase,
                  projectSelected ? fieldActive : fieldLocked
                )}
                disabled={!projectSelected}
              >
                {!projectSelected ? (
                  <option value="">Selecione o projeto primeiro…</option>
                ) : (
                  <>
                    <option value="">Selecione o orçamento…</option>
                    {(selectedProject?.quotes || []).map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.codigo || `v${q.versao}`} · {formatCurrencyBRL(q.base_valor)}
                      </option>
                    ))}
                  </>
                )}
              </select>
              {!projectSelected ? (
                <p className="text-[10px] text-stone-500">
                  Liberado depois que você escolher o projeto.
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground">
                  Use o valor aprovado — é a base do %.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wider",
                    quoteId ? "text-muted-foreground" : "text-stone-500"
                  )}
                >
                  4. Percentual (%)
                </label>
                <div className="relative">
                  <Percent
                    className={cn(
                      "absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5",
                      quoteId ? "text-muted-foreground" : "text-stone-500"
                    )}
                  />
                  <Input
                    value={percentual}
                    onChange={(e) => setPercentual(e.target.value)}
                    className={cn(
                      "pl-8 h-10",
                      !quoteId &&
                        "bg-stone-500/25 border-stone-400/50 text-stone-500 cursor-not-allowed"
                    )}
                    inputMode="decimal"
                    disabled={!quoteId}
                    placeholder="Ex.: 5"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wider",
                    quoteId ? "text-muted-foreground" : "text-stone-500"
                  )}
                >
                  Quando pagar (opcional)
                </label>
                <Input
                  type="date"
                  value={dataPrevista}
                  onChange={(e) => setDataPrevista(e.target.value)}
                  className={cn(
                    "h-10",
                    !quoteId &&
                      "bg-stone-500/25 border-stone-400/50 text-stone-500 cursor-not-allowed"
                  )}
                  disabled={!quoteId}
                />
              </div>
            </div>
            {!quoteId && (
              <p className="text-[10px] text-stone-500 -mt-2">
                Percentual e data liberam após escolher o orçamento.
              </p>
            )}

            <div
              className={cn(
                "rounded-xl border p-3 space-y-1",
                quoteId
                  ? "border-border/70 bg-muted/30"
                  : "border-stone-400/40 bg-stone-500/15"
              )}
            >
              <p
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wider",
                  quoteId ? "text-muted-foreground" : "text-stone-500"
                )}
              >
                Valor que o parceiro recebe
              </p>
              <p
                className={cn(
                  "text-lg font-display font-bold tabular-nums",
                  quoteId ? "text-foreground" : "text-stone-500"
                )}
              >
                {quoteId ? formatCurrencyBRL(valorEstimado) : "—"}
              </p>
              {selectedQuote ? (
                <p className="text-[11px] text-muted-foreground">
                  {percentual || "0"}% de {formatCurrencyBRL(selectedQuote.base_valor)}{" "}
                  (orçamento aprovado)
                </p>
              ) : (
                <p className="text-[11px] text-stone-500">
                  Aparece automaticamente quando o % e o orçamento estiverem preenchidos.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wider",
                  quoteId ? "text-muted-foreground" : "text-stone-500"
                )}
              >
                Observação interna (opcional)
              </label>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={2}
                disabled={!quoteId}
                className={cn(
                  "w-full rounded-lg border px-3 py-2 text-sm resize-none",
                  quoteId
                    ? "border-border bg-card"
                    : "border-stone-400/50 bg-stone-500/25 text-stone-500 cursor-not-allowed"
                )}
                placeholder={
                  quoteId
                    ? "Ex.: pagar após montagem / acordo verbal"
                    : "Disponível após escolher o orçamento"
                }
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
