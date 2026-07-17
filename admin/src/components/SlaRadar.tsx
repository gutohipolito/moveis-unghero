"use client";

import {
  PRODUCTION_SLA_STAGES,
  type ProjectSlaView,
  formatSlaDueLabel,
  getSlaStepStatus,
  isSlaDueToday,
  isSlaFinished,
  isSlaOverdue,
} from "@/lib/productionSla";

interface SlaRadarProps {
  sla: ProjectSlaView | null;
  compact?: boolean;
  onVerify?: () => void;
}

export default function SlaRadar({ sla, compact = false, onVerify }: SlaRadarProps) {
  if (!sla) {
    if (compact) return null;
    return (
      <div className={`rounded-lg border border-dashed border-border ${compact ? "p-2" : "p-3"} text-[10px] text-muted-foreground`}>
        Radar de prazos não iniciado
      </div>
    );
  }

  const needsVerify = !isSlaFinished(sla) && (isSlaDueToday(sla) || isSlaOverdue(sla));

  if (compact) {
    const current = PRODUCTION_SLA_STAGES.find((s) => s.key === sla.currentStage);
    return (
      <div
        className={`rounded-lg border p-2 space-y-1.5 ${
          needsVerify
            ? "border-amber-500/50 bg-amber-500/5"
            : isSlaOverdue(sla)
              ? "border-red-500/40 bg-red-500/5"
              : "border-border bg-secondary/30"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
            Radar SLA
          </span>
          <span
            className={`text-[9px] font-bold ${
              needsVerify ? "text-amber-700" : isSlaOverdue(sla) ? "text-red-700" : "text-emerald-700"
            }`}
          >
            {isSlaFinished(sla) ? "Concluído" : formatSlaDueLabel(sla)}
          </span>
        </div>
        <p className="text-[10px] font-semibold text-foreground leading-tight truncate">
          {current?.name}
          <span className="text-muted-foreground font-normal"> · SLA {current?.slaDays}d</span>
        </p>
        <div className="flex gap-0.5">
          {PRODUCTION_SLA_STAGES.map((step) => {
            const status = getSlaStepStatus(step.key, sla);
            return (
              <div
                key={step.key}
                className={`h-1 flex-1 rounded-full ${
                  status === "CONCLUIDO"
                    ? "bg-emerald-500"
                    : status === "PROGRESSO"
                      ? "bg-amber-400"
                      : status === "ATRASADO"
                        ? "bg-red-500"
                        : "bg-border"
                }`}
              />
            );
          })}
        </div>
        {needsVerify && onVerify && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onVerify();
            }}
            className="w-full text-[9px] font-bold text-amber-900 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-md py-1 cursor-pointer"
          >
            Verificar etapa no prazo limite
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 border-b border-border pb-3">
        <div>
          <h3 className="text-sm font-bold tracking-wider text-foreground uppercase flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                needsVerify ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
              }`}
            />
            Radar de Prazos (SLA)
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cada etapa tem prazo independente — não acumula com a anterior.
          </p>
        </div>
        {!isSlaFinished(sla) && (
          <span
            className={`text-xs px-2.5 py-1 rounded font-bold uppercase border ${
              needsVerify
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}
          >
            {formatSlaDueLabel(sla)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        {PRODUCTION_SLA_STAGES.map((step, idx) => {
          const status = getSlaStepStatus(step.key, sla);
          const isCompleted = status === "CONCLUIDO";
          const isProgress = status === "PROGRESSO" || status === "ATRASADO";

          return (
            <div
              key={step.key}
              className={`relative flex flex-col justify-between p-3.5 rounded-lg border shadow-xs ${
                status === "ATRASADO"
                  ? "bg-red-50/60 border-red-200"
                  : isProgress
                    ? "bg-amber-50/50 border-amber-200"
                    : "bg-slate-50 border-border"
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Etapa 0{idx + 1}
                </span>
                <span className="text-xs text-muted-foreground font-semibold bg-secondary px-2 py-0.5 rounded border border-border">
                  SLA: {step.slaDays}d
                </span>
              </div>
              <h4 className="font-bold text-xs text-foreground mt-2 mb-1.5 leading-tight">{step.name}</h4>
              <div className="mt-auto pt-2 border-t border-border flex items-center justify-between gap-2">
                <span
                  className={`text-[10px] font-bold uppercase ${
                    isCompleted
                      ? "text-emerald-500"
                      : status === "ATRASADO"
                        ? "text-red-600"
                        : isProgress
                          ? "text-amber-600"
                          : "text-muted-foreground"
                  }`}
                >
                  {isCompleted
                    ? "✓ Concluído"
                    : status === "ATRASADO"
                      ? "● Atrasado"
                      : isProgress
                        ? "● Em progresso"
                        : "○ Pendente"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {needsVerify && onVerify && (
        <button
          type="button"
          onClick={onVerify}
          className="mt-4 w-full sm:w-auto text-xs font-bold text-amber-900 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 px-4 py-2 rounded-lg cursor-pointer"
        >
          Verificar se a etapa atual foi concluída
        </button>
      )}
    </div>
  );
}
