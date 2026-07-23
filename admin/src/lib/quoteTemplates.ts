import type { ItemType } from "@/app/actions/quotes";

export const QUOTE_TEMPLATE_IDS = ["BASICO", "COMPARATIVO"] as const;
export type QuoteTemplateId = (typeof QUOTE_TEMPLATE_IDS)[number];

export const QUOTE_TEMPLATE_LABELS: Record<QuoteTemplateId, string> = {
  BASICO: "Básico",
  COMPARATIVO: "Proposta Comparativa",
};

/** @deprecated Use QUOTE_TEMPLATE_IDS / labels; kept for older imports */
export const QUOTE_TEMPLATE_ID = "BASICO" as const;
export const QUOTE_TEMPLATE_LABEL = QUOTE_TEMPLATE_LABELS.BASICO;

export interface QuoteTemplateItem {
  descricao: string;
  quantidade: number;
  tipo_custo: ItemType;
  valor_unitario: number;
}

export interface QuoteTemplateDef {
  id: QuoteTemplateId;
  nome: string;
  observacoes: string;
  items: QuoteTemplateItem[];
  /** PDF omite total agregado; aprovação exige exatamente 1 item. */
  comparative: boolean;
}

export const QUOTE_TEMPLATES: Record<QuoteTemplateId, QuoteTemplateDef> = {
  BASICO: {
    id: "BASICO",
    nome: QUOTE_TEMPLATE_LABELS.BASICO,
    observacoes: "",
    items: [],
    comparative: false,
  },
  COMPARATIVO: {
    id: "COMPARATIVO",
    nome: QUOTE_TEMPLATE_LABELS.COMPARATIVO,
    observacoes: "",
    items: [],
    comparative: true,
  },
};

export const QUOTE_TEMPLATE_BASICO = QUOTE_TEMPLATES.BASICO;

export function isQuoteTemplateId(value: unknown): value is QuoteTemplateId {
  return typeof value === "string" && (QUOTE_TEMPLATE_IDS as readonly string[]).includes(value);
}

export function normalizeQuoteTemplateId(value: unknown): QuoteTemplateId {
  return isQuoteTemplateId(value) ? value : "BASICO";
}

export function isComparativeTemplate(value: unknown): boolean {
  return normalizeQuoteTemplateId(value) === "COMPARATIVO";
}

export function getQuoteTemplate(value: unknown): QuoteTemplateDef {
  return QUOTE_TEMPLATES[normalizeQuoteTemplateId(value)];
}
