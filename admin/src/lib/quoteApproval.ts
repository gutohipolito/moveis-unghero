import type { QuoteItemStatus } from "@prisma/client";

export type QuoteItemApprovalStatus = QuoteItemStatus | "PENDENTE" | "APROVADO" | "RECUSADO";

export interface QuoteItemTotalsInput {
  id: string;
  valor_total: number;
  status?: string | null;
}

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
