"use client";

type FormProgressTone = "primary" | "amber" | "blue" | "slate";

const TRACK: Record<FormProgressTone, string> = {
  primary: "bg-slate-800",
  amber: "bg-slate-100",
  blue: "bg-slate-950",
  slate: "bg-slate-100",
};

const FILL: Record<FormProgressTone, string> = {
  primary: "bg-primary",
  amber: "bg-gradient-to-r from-amber-500 to-amber-600",
  blue: "bg-gradient-to-r from-blue-500 to-indigo-600",
  slate: "bg-primary",
};

const LABEL: Record<FormProgressTone, string> = {
  primary: "text-slate-400",
  amber: "text-slate-400",
  blue: "text-slate-400",
  slate: "text-slate-400",
};

type FormProgressBarProps = {
  step: number;
  totalSteps: number;
  tone?: FormProgressTone;
  /** Ex.: "Etapa 2 de 5 · Contato" */
  stepLabel?: string;
  className?: string;
};

export default function FormProgressBar({
  step,
  totalSteps,
  tone = "primary",
  stepLabel,
  className = "",
}: FormProgressBarProps) {
  const percent = Math.min(100, Math.max(0, Math.round((step / totalSteps) * 100)));
  const label = stepLabel ?? `Etapa ${step} de ${totalSteps}`;

  return (
    <div className={`w-full min-w-0 max-w-full ${className}`}>
      <div
        className={`flex min-w-0 items-center justify-between gap-3 px-3.5 sm:px-5 pt-3.5 pb-2 ${LABEL[tone]}`}
      >
        <p className="min-w-0 text-[10px] font-black uppercase tracking-widest truncate">
          {label}
        </p>
        <p className="text-[10px] font-black tabular-nums shrink-0">{percent}%</p>
      </div>
      <div className={`h-1.5 w-full max-w-full ${TRACK[tone]}`}>
        <div
          className={`h-full max-w-full transition-all duration-500 ease-out ${FILL[tone]}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
