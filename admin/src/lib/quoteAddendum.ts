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

export function formatQuoteMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function buildDefaultAddendumText(source: AddendumSourceSummary): string {
  const ref = source.label;
  const dateLabel = source.approvedAt
    ? formatDateBR(source.approvedAt)
    : "data anterior";
  const valorOriginal = formatQuoteMoney(source.approvedTotal);

  return [
    `Este documento é um adendo à proposta comercial ${ref}, aprovada em ${dateLabel}, no valor de ${valorOriginal}.`,
    "",
    "Durante a execução do projeto, o cliente solicitou alterações em relação ao escopo originalmente aprovado. Os itens abaixo referem-se exclusivamente a essas mudanças e precisam de nova análise e aprovação.",
    "",
    "Motivo e detalhamento das alterações:",
    "(descreva o que mudou na produção e por que há acréscimo ou ajuste de valor)",
  ].join("\n");
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
}) {
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
