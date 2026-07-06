"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getStageConfig } from "@/lib/productionSla";
import { verifySlaStage } from "@/app/actions/productionSla";

interface SlaVerificationModalProps {
  projectId: string;
  stageKey: string;
  clientName?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function SlaVerificationModal({
  projectId,
  stageKey,
  clientName,
  isOpen,
  onClose,
  onSuccess,
}: SlaVerificationModalProps) {
  const [step, setStep] = useState<"confirm" | "extend">("confirm");
  const [extraDays, setExtraDays] = useState("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stage = getStageConfig(stageKey);

  function handleClose() {
    if (loading) return;
    setStep("confirm");
    setExtraDays("1");
    setError(null);
    onClose();
  }

  async function handleCompleted(completed: boolean) {
    if (completed) {
      setLoading(true);
      setError(null);
      const result = await verifySlaStage(projectId, true);
      setLoading(false);
      if (!result.success) {
        setError(result.error ?? "Erro ao registrar.");
        return;
      }
      onSuccess?.();
      handleClose();
      return;
    }
    setStep("extend");
  }

  async function handleExtend() {
    const days = Number(extraDays);
    if (!Number.isFinite(days) || days < 1) {
      setError("Informe um número válido de dias.");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await verifySlaStage(projectId, false, days);
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Erro ao registrar.");
      return;
    }
    onSuccess?.();
    handleClose();
  }

  if (!isOpen) return null;

  return (
    <Dialog isOpen={isOpen} onClose={handleClose}>
      <h3 className="text-lg font-bold tracking-tight text-foreground mb-2">
        Verificação de SLA
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        {clientName ? `${clientName} — ` : ""}
        A etapa <strong>{stage.name}</strong> está no prazo limite (SLA: {stage.slaDays} dias,
        independente das etapas anteriores).
      </p>

      {step === "confirm" ? (
        <div className="space-y-4">
          <p className="text-sm text-foreground">Esta etapa foi concluída?</p>
          {error && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-2 py-1.5">
              {error}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => handleCompleted(false)}
            >
              Não, precisa de mais prazo
            </Button>
            <Button type="button" disabled={loading} onClick={() => handleCompleted(true)}>
              {loading ? "Salvando..." : "Sim, etapa concluída"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Quantos dias adicionais de SLA para &quot;{stage.name}&quot;?
            </label>
            <Input
              type="number"
              min={1}
              value={extraDays}
              onChange={(e) => setExtraDays(e.target.value)}
              className="text-sm"
            />
          </div>
          {error && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-2 py-1.5">
              {error}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-2 justify-end">
            <Button type="button" variant="outline" disabled={loading} onClick={() => setStep("confirm")}>
              Voltar
            </Button>
            <Button type="button" disabled={loading} onClick={handleExtend}>
              {loading ? "Salvando..." : "Confirmar prorrogação"}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
