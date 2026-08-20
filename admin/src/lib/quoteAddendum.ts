import { formatDateBR } from "@/lib/brazilDate";
import { formatQuoteCodigo } from "@/lib/quoteCodigo";
import { summarizeQuoteItems } from "@/lib/quoteApproval";

export type AddendumSourceSummary = {
  id: string;
  project_id: string;
  versao: number;
  codigo: string | null;
  template_tipo: string;
  approvedTotal: number;
  approvedAt: Date | null;
  label: string;
};

export type AddendumPrintRef = {
  label: string;
  versao: number;
  approvedAtLabel: string | null;
  approvedTotal: number;
};

export type AddendumDelta = {
  originalTotal: number;
  addendumTotal: number;
  combinedTotal: number;
  kind: "increase" | "decrease" | "none";
};

const OLD_REASON_MARKER = /(?:^|\n)Motivo e detalhamento das alterações:\s*/i;
const OLD_INTRO = /^Este documento é um adendo à proposta comercial\b/i;
const OLD_PLACEHOLDER = /^\(descreva o que mudou/i;

export function formatQuoteMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function computeAddendumDelta(
  originalTotal: number,
  addendumTotal: number
): AddendumDelta {
  const original = Math.round(Math.max(0, originalTotal) * 100) / 100;
  const addendum = Math.round(addendumTotal * 100) / 100;
  const combined = Math.round((original + addendum) * 100) / 100;
  const kind =
    addendum > 0.004 ? "increase" : addendum < -0.004 ? "decrease" : "none";
  return {
    originalTotal: original,
    addendumTotal: addendum,
    combinedTotal: combined,
    kind,
  };
}

export function formatAddendumDeltaLabel(delta: AddendumDelta): string {
  if (delta.kind === "increase") return `+ ${formatQuoteMoney(delta.addendumTotal)}`;
  if (delta.kind === "decrease") {
    return `− ${formatQuoteMoney(Math.abs(delta.addendumTotal))}`;
  }
  return "sem alteração de valor";
}

/** Texto gerado para o PDF — não é editável pelo operador. */
export function buildAddendumReferenceCopy(input: {
  label: string;
  approvedAtLabel: string | null;
  approvedTotal: number;
  addendumTotal: number;
}): { paragraphs: string[]; delta: AddendumDelta } {
  const dateLabel = input.approvedAtLabel || "data anterior";
  const original = formatQuoteMoney(input.approvedTotal);
  const delta = computeAddendumDelta(input.approvedTotal, input.addendumTotal);
  const deltaMoney = formatQuoteMoney(Math.abs(delta.addendumTotal));
  const combined = formatQuoteMoney(delta.combinedTotal);

  const intro = `Este adendo complementa a proposta ${input.label}, aprovada em ${dateLabel} no valor de ${original}.`;

  let values: string;
  if (delta.kind === "increase") {
    values = `As alterações abaixo acrescentam ${deltaMoney} ao valor já aprovado. Com este adendo, o investimento total passa a ${combined}.`;
  } else if (delta.kind === "decrease") {
    values = `As alterações abaixo reduzem ${deltaMoney} do valor já aprovado. Com este adendo, o investimento total passa a ${combined}.`;
  } else {
    values = `As alterações abaixo não mudam o valor já aprovado de ${original}.`;
  }

  const scope =
    "A proposta original continua valendo. Aqui entram só as mudanças pedidas depois da aprovação.";

  return { paragraphs: [intro, values, scope], delta };
}

/** Só o motivo editável — a referência e o delta são gerados na hora da impressão. */
export function buildDefaultAddendumReason(): string {
  return "";
}

/** Remove o texto gerado antigo, se ainda estiver salvo em observações. */
export function extractAddendumReason(observacoes: string | null | undefined): string {
  const text = (observacoes || "").trim();
  if (!text) return "";

  const parts = text.split(OLD_REASON_MARKER);
  if (parts.length > 1) {
    const reason = parts.slice(1).join("\n").trim();
    if (!reason || OLD_PLACEHOLDER.test(reason)) return "";
    return reason;
  }

  if (OLD_INTRO.test(text)) return "";
  return text;
}

export function summarizeAddendumSource(quote: {
  id: string;
  project_id: string;
  versao: number;
  codigo: string | null;
  template_tipo: string;
  aprovado_em: Date | null;
  items: Array<{ id: string; valor_total: unknown; status: string | null }>;
}): AddendumSourceSummary | null {
  const summary = summarizeQuoteItems(
    quote.items.map((item) => ({
      id: item.id,
      valor_total: Number(item.valor_total),
      status: item.status,
    }))
  );
  if (!summary.hasApproved) return null;

  return {
    id: quote.id,
    project_id: quote.project_id,
    versao: quote.versao,
    codigo: quote.codigo,
    template_tipo: quote.template_tipo,
    approvedTotal: summary.approvedTotal,
    approvedAt: quote.aprovado_em,
    label: formatQuoteCodigo({ id: quote.id, codigo: quote.codigo }),
  };
}

export function buildAddendumPrintRef(refQuote: {
  id: string;
  versao: number;
  codigo: string | null;
  aprovado_em: Date | null;
  items: Array<{ id: string; valor_total: unknown; status: string | null }>;
}): AddendumPrintRef | null {
  const summary = summarizeQuoteItems(
    refQuote.items.map((item) => ({
      id: item.id,
      valor_total: Number(item.valor_total),
      status: item.status,
    }))
  );
  if (!summary.hasApproved) return null;
  return {
    label: formatQuoteCodigo({ id: refQuote.id, codigo: refQuote.codigo }),
    versao: refQuote.versao,
    approvedAtLabel: refQuote.aprovado_em ? formatDateBR(refQuote.aprovado_em) : null,
    approvedTotal: summary.approvedTotal,
  };
}

/**
 * Mantém a ordenação base, mas agrupa cada adendo logo abaixo da proposta referenciada.
 */
export function orderQuotesWithAddendums<T extends {
  id: string;
  versao: number;
  adendo_ref_quote_id?: string | null;
}>(quotes: T[]): T[] {
  if (quotes.length <= 1) return quotes;

  const ids = new Set(quotes.map((q) => q.id));
  const childrenByParent = new Map<string, T[]>();
  const roots: T[] = [];

  for (const quote of quotes) {
    const parentId = quote.adendo_ref_quote_id ?? null;
    if (parentId && ids.has(parentId)) {
      const bucket = childrenByParent.get(parentId) ?? [];
      bucket.push(quote);
      childrenByParent.set(parentId, bucket);
    } else {
      roots.push(quote);
    }
  }

  for (const children of childrenByParent.values()) {
    children.sort((a, b) => a.versao - b.versao || a.id.localeCompare(b.id));
  }

  const ordered: T[] = [];
  const seen = new Set<string>();
  for (const root of roots) {
    if (seen.has(root.id)) continue;
    ordered.push(root);
    seen.add(root.id);
    for (const child of childrenByParent.get(root.id) ?? []) {
      if (seen.has(child.id)) continue;
      ordered.push(child);
      seen.add(child.id);
    }
  }

  for (const quote of quotes) {
    if (!seen.has(quote.id)) ordered.push(quote);
  }

  return ordered;
}
