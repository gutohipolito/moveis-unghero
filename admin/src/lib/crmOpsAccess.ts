import type { ProjectStatus } from "@/app/actions/kanban";
import { isOpsLimitedRole } from "@/lib/permissions";

/** Estágios do funil visíveis para Projetista/Fábrica (a partir de Aprovados). */
export const OPS_CRM_STATUSES: ProjectStatus[] = [
  "APROVADO",
  "CONFERENCIA_TECNICA",
  "PRODUCAO",
  "INSTALACAO",
  "FINALIZADO",
];

export const OPS_CRM_STATUS_SET = new Set<string>(OPS_CRM_STATUSES);

/** Colunas do funil para cargos operacionais. */
export const OPS_FUNNEL_COLUMNS: { id: ProjectStatus; title: string }[] = [
  { id: "APROVADO", title: "Aprovados" },
  { id: "CONFERENCIA_TECNICA", title: "Conf. Técnica" },
  { id: "PRODUCAO", title: "Produção" },
  { id: "INSTALACAO", title: "Instalação" },
  { id: "FINALIZADO", title: "Finalizados" },
];

/** Estágios comerciais anteriores a Aprovados — bloqueados para ops. */
export const PRE_APROVADO_STATUSES = new Set<string>([
  "LEAD",
  "ORCAMENTO",
  "NEGOCIACAO",
]);

export function canOpsAccessCrmStatus(status: string): boolean {
  return OPS_CRM_STATUS_SET.has(status);
}

/**
 * Ops não move cards do funil (Projetista e Marceneiro só visualizam etapas).
 */
export function assertOpsCrmStatusMove(
  role: string | null | undefined,
  fromStatus: string,
  toStatus: string
): string | null {
  if (!isOpsLimitedRole(role)) return null;

  if (fromStatus === toStatus) return null;
  return "Este cargo não pode alterar a etapa do funil.";
}
