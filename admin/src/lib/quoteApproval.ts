import type { QuoteItemStatus } from "@prisma/client";
import { toISODateBR } from "@/lib/brazilDate";

export type QuoteItemApprovalStatus = QuoteItemStatus | "PENDENTE" | "APROVADO" | "RECUSADO";

export interface QuoteItemTotalsInput {
  id: string;
  valor_total: number;
  status?: string | null;
}

/** Dias sem retorno (sem nenhuma aprovação) para marcar a proposta como perdida. */
export const QUOTE_NO_RESPONSE_LOST_DAYS = 60;

export function suggestProportionalDiscount(
  quoteDesconto: number,
  quoteSubtotal: number,
  selectedSubtotal: number
): number {
  if (quoteDesconto <= 0 || quoteSubtotal <= 0 || selectedSubtotal <= 0) return 0;
  const ratio = selectedSubtotal / quoteSubtotal;
  return Math.round(quoteDesconto * ratio * 100) / 100;
}

export function computeApprovalValue(subtotal: number, desconto: number): number {
  return Math.max(0, Math.round((subtotal - Math.max(0, desconto)) * 100) / 100);
}

export function summarizeQuoteItems(items: QuoteItemTotalsInput[]) {
  const approved = items.filter((i) => i.status === "APROVADO");
  const pending = items.filter((i) => !i.status || i.status === "PENDENTE");
  const rejected = items.filter((i) => i.status === "RECUSADO");

  const sum = (list: QuoteItemTotalsInput[]) =>
    list.reduce((acc, item) => acc + Number(item.valor_total || 0), 0);

  const hasPending = pending.length > 0;
  const hasApproved = approved.length > 0;

  return {
    approvedCount: approved.length,
    pendingCount: pending.length,
    rejectedCount: rejected.length,
    approvedTotal: sum(approved),
    pendingTotal: sum(pending),
    rejectedTotal: sum(rejected),
    hasPending,
    hasApproved,
    /** Sem itens pendentes e com ao menos um aprovado (recusas restantes não reabrem validade). */
    isFullyApproved: !hasPending && hasApproved,
    isPartiallyApproved: hasApproved && hasPending,
  };
}

export function quoteCommercialLabel(summary: ReturnType<typeof summarizeQuoteItems>): string {
  if (summary.isFullyApproved) return "Aprovado";
  if (summary.isPartiallyApproved) return "Aprovação parcial";
  if (summary.rejectedCount > 0 && summary.pendingCount === 0 && summary.approvedCount === 0) {
    return "Recusado";
  }
  return "Em aberto";
}

/**
 * "Vencido" só quando a validade passou e ainda não houve nenhuma aprovação.
 * Com item aprovado, o status comercial passa a ser parcial/aprovado — o operador
 * atualiza valores se precisar ao reabrir o projeto.
 */
export function isQuoteCommerciallyExpired(
  validadePast: boolean,
  summary: Pick<ReturnType<typeof summarizeQuoteItems>, "hasApproved" | "hasPending">
): boolean {
  return validadePast && !summary.hasApproved && summary.hasPending;
}

function calendarDaysSince(dateInput: Date | string, todayISO = toISODateBR()): number {
  const from = toISODateBR(dateInput);
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = todayISO.split("-").map(Number);
  return Math.round(
    (Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / (1000 * 60 * 60 * 24)
  );
}

/**
 * Sem nenhuma aprovação e sem retorno há mais de N dias desde a criação → perdido.
 * Não se aplica a propostas já recusadas por completo (sem pendências).
 */
export function isQuoteCommerciallyLost(
  createdAt: Date | string | null | undefined,
  summary: Pick<
    ReturnType<typeof summarizeQuoteItems>,
    "hasApproved" | "hasPending" | "rejectedCount" | "approvedCount"
  >,
  daysWithoutResponse = QUOTE_NO_RESPONSE_LOST_DAYS
): boolean {
  if (!createdAt) return false;
  if (summary.hasApproved) return false;
  if (!summary.hasPending) return false;
  return calendarDaysSince(createdAt) >= daysWithoutResponse;
}
