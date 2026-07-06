export const PRODUCTION_SLA_STAGES = [
  { key: "MEDICAO", name: "Medição Técnica", slaDays: 2 },
  { key: "ENVIO_FABRICA", name: "Envio para Fábrica", slaDays: 5 },
  { key: "MATERIAL", name: "Chegada de Material", slaDays: 10 },
  { key: "MONTAGEM", name: "Montagem", slaDays: 15 },
  { key: "FINALIZACAO", name: "Finalização", slaDays: 3 },
] as const;

export type ProductionSlaStageKey = (typeof PRODUCTION_SLA_STAGES)[number]["key"];

export interface ProjectSlaView {
  projectId: string;
  clientName?: string;
  currentStage: ProductionSlaStageKey;
  stageStartedAt: string;
  extensionDays: number;
  completedStages: ProductionSlaStageKey[];
  notaFiscalEmitida: boolean;
}

export type SlaStepStatus = "PENDENTE" | "PROGRESSO" | "CONCLUIDO" | "ATRASADO";

export function getStageConfig(key: string) {
  return PRODUCTION_SLA_STAGES.find((s) => s.key === key) ?? PRODUCTION_SLA_STAGES[0];
}

export function getNextStageKey(current: string): ProductionSlaStageKey | null {
  const idx = PRODUCTION_SLA_STAGES.findIndex((s) => s.key === current);
  if (idx < 0 || idx >= PRODUCTION_SLA_STAGES.length - 1) return null;
  return PRODUCTION_SLA_STAGES[idx + 1].key;
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getSlaDueDate(sla: Pick<ProjectSlaView, "currentStage" | "stageStartedAt" | "extensionDays">) {
  const config = getStageConfig(sla.currentStage);
  const due = new Date(sla.stageStartedAt);
  due.setDate(due.getDate() + config.slaDays + sla.extensionDays);
  return startOfDay(due);
}

export function getSlaDaysRemaining(sla: Pick<ProjectSlaView, "currentStage" | "stageStartedAt" | "extensionDays">) {
  const today = startOfDay(new Date());
  const due = getSlaDueDate(sla);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function isSlaDueToday(sla: Pick<ProjectSlaView, "currentStage" | "stageStartedAt" | "extensionDays">) {
  return getSlaDaysRemaining(sla) === 0;
}

export function isSlaOverdue(sla: Pick<ProjectSlaView, "currentStage" | "stageStartedAt" | "extensionDays">) {
  return getSlaDaysRemaining(sla) < 0;
}

export function isSlaFinished(sla: Pick<ProjectSlaView, "completedStages">) {
  return sla.completedStages.length >= PRODUCTION_SLA_STAGES.length;
}

export function getSlaStepStatus(
  stageKey: ProductionSlaStageKey,
  sla: ProjectSlaView
): SlaStepStatus {
  if (sla.completedStages.includes(stageKey)) return "CONCLUIDO";
  if (sla.currentStage === stageKey) {
    if (isSlaOverdue(sla)) return "ATRASADO";
    return "PROGRESSO";
  }
  const currentIdx = PRODUCTION_SLA_STAGES.findIndex((s) => s.key === sla.currentStage);
  const stageIdx = PRODUCTION_SLA_STAGES.findIndex((s) => s.key === stageKey);
  if (stageIdx > currentIdx) return "PENDENTE";
  return "CONCLUIDO";
}

export function formatSlaDueLabel(sla: ProjectSlaView) {
  const remaining = getSlaDaysRemaining(sla);
  if (remaining > 0) return `${remaining} dia${remaining !== 1 ? "s" : ""} restante${remaining !== 1 ? "s" : ""}`;
  if (remaining === 0) return "Prazo limite hoje";
  return `${Math.abs(remaining)} dia${Math.abs(remaining) !== 1 ? "s" : ""} em atraso`;
}
