import type { ItemType } from "@/app/actions/quotes";

export const QUOTE_TEMPLATE_IDS = ["BASICO", "BASICO_IMAGENS", "COMPARATIVO", "ADENDO"] as const;
export type QuoteTemplateId = (typeof QUOTE_TEMPLATE_IDS)[number];

export const QUOTE_TEMPLATE_LABELS: Record<QuoteTemplateId, string> = {
  BASICO: "Básico",
  BASICO_IMAGENS: "Básico com imagens",
  COMPARATIVO: "Proposta Comparativa",
  ADENDO: "Adendo comercial",
};

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
  /** PDF com 2ª página de cards (foto + nome) via itens salvos. */
  withImages: boolean;
  /** Adendo: texto explicativo no PDF; sem cards de montagem/pagamento. */
  addendum: boolean;
}

export const QUOTE_TEMPLATES: Record<QuoteTemplateId, QuoteTemplateDef> = {
  BASICO: {
    id: "BASICO",
    nome: QUOTE_TEMPLATE_LABELS.BASICO,
    observacoes: "",
    items: [],
    comparative: false,
    withImages: false,
    addendum: false,
  },
  BASICO_IMAGENS: {
    id: "BASICO_IMAGENS",
    nome: QUOTE_TEMPLATE_LABELS.BASICO_IMAGENS,
    observacoes: "",
    items: [],
    comparative: false,
    withImages: true,
    addendum: false,
  },
  COMPARATIVO: {
    id: "COMPARATIVO",
    nome: QUOTE_TEMPLATE_LABELS.COMPARATIVO,
    observacoes: "",
    items: [],
    comparative: true,
    withImages: false,
    addendum: false,
  },
  ADENDO: {
    id: "ADENDO",
    nome: QUOTE_TEMPLATE_LABELS.ADENDO,
    observacoes: "",
    items: [],
    comparative: false,
    withImages: false,
    addendum: true,
  },
};

export function isQuoteTemplateId(value: unknown): value is QuoteTemplateId {
  return typeof value === "string" && (QUOTE_TEMPLATE_IDS as readonly string[]).includes(value);
}

export function normalizeQuoteTemplateId(value: unknown): QuoteTemplateId {
  return isQuoteTemplateId(value) ? value : "BASICO";
}

export function isComparativeTemplate(value: unknown): boolean {
  return normalizeQuoteTemplateId(value) === "COMPARATIVO";
}

export function isImageCatalogTemplate(value: unknown): boolean {
  return getQuoteTemplate(value).withImages;
}

export function isAddendumTemplate(value: unknown): boolean {
  return getQuoteTemplate(value).addendum;
}

export function getQuoteTemplate(value: unknown): QuoteTemplateDef {
  return QUOTE_TEMPLATES[normalizeQuoteTemplateId(value)];
}
