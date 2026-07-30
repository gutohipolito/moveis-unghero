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
 * Ops só pode mover entre estágios pós-aprovação (inclui PERDIDO? não).
 * Não pode voltar para Lead/Orçamento/Negociação.
 */
export function assertOpsCrmStatusMove(
  role: string | null | undefined,
  fromStatus: string,
  toStatus: string
): string | null {
  if (!isOpsLimitedRole(role)) return null;

  if (!canOpsAccessCrmStatus(fromStatus)) {
    return "Este projeto está em etapa comercial e não pode ser alterado por este cargo.";
  }
  if (PRE_APROVADO_STATUSES.has(toStatus) || toStatus === "PERDIDO") {
    return "Este cargo só pode mover projetos a partir de Aprovados (sem etapas comerciais).";
  }
  if (!canOpsAccessCrmStatus(toStatus)) {
    return "Etapa não permitida para este cargo.";
  }
  return null;
}
