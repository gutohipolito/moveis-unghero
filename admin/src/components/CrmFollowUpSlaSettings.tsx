"use client";

import React, { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_FOLLOW_UP_SLA,
  normalizeFollowUpSla,
  type FollowUpSlaConfig,
} from "@/lib/followUp";

interface CrmFollowUpSlaSettingsProps {
  sla: FollowUpSlaConfig;
  onSave: (next: FollowUpSlaConfig) => void;
}

export default function CrmFollowUpSlaSettings({
  sla,
  onSave,
}: CrmFollowUpSlaSettingsProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FollowUpSlaConfig>(sla);

  useEffect(() => {
    if (open) setDraft(sla);
  }, [open, sla]);

  const handleSave = () => {
    const next = normalizeFollowUpSla(draft);
    onSave(next);
    setOpen(false);
  };

  const setDays = (key: "warningDays" | "alertDays" | "lossDays", value: string) => {
    const parsed = Number(value);
    setDraft((prev) => ({
      ...prev,
      [key]: Number.isFinite(parsed) ? parsed : prev[key],
    }));
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center p-2 rounded-xl bg-white hover:bg-slate-50 text-muted-foreground hover:text-foreground border border-border shadow-xs transition-all duration-200 cursor-pointer group"
        title="Configurar prazos de follow-up (SLA)"
        aria-label="Configurar prazos de follow-up"
      >
        <Settings className="h-4.5 w-4.5 text-primary group-hover:rotate-45 transition-transform duration-300" />
      </button>

      <Dialog isOpen={open} onClose={() => setOpen(false)} className="max-w-md">
        <div className="space-y-5 p-1">
          <div>
            <h2 className="text-base font-bold text-foreground">Prazos do funil (SLA)</h2>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Defina após quantos dias sem retorno o card entra em aviso, alerta urgente
              ou perdas. Vale só para o seu usuário.
            </p>
          </div>

          <div className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-foreground">Aviso (amarelo)</span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={draft.warningDays}
                  onChange={(e) => setDays("warningDays", e.target.value)}
                  className="w-24"
                />
                <span className="text-xs text-muted-foreground">dias sem contato</span>
              </div>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-foreground">Alerta (vermelho)</span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={120}
                  value={draft.alertDays}
                  onChange={(e) => setDays("alertDays", e.target.value)}
                  className="w-24"
                />
                <span className="text-xs text-muted-foreground">dias — retomar contato</span>
              </div>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-foreground">Perdas</span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={180}
                  value={draft.lossDays}
                  onChange={(e) => setDays("lossDays", e.target.value)}
                  className="w-24"
                />
                <span className="text-xs text-muted-foreground">dias sem retorno</span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 rounded-xl border border-border bg-secondary/40 p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.autoMoveToLoss}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, autoMoveToLoss: e.target.checked }))
                }
                className="mt-0.5 h-4 w-4 rounded border-border"
              />
              <span className="text-xs leading-relaxed">
                <span className="font-semibold text-foreground block">
                  Mover automaticamente para Perdas
                </span>
                <span className="text-muted-foreground">
                  Ao atingir o prazo de perdas, o lead sai do funil ativo com o motivo
                  “Sem retorno há X dias (SLA)”.
                </span>
              </span>
            </label>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setDraft(DEFAULT_FOLLOW_UP_SLA)}
            >
              Restaurar padrão
            </button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleSave}>
                Salvar
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
}
