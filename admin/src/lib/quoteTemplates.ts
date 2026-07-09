import type { ItemType } from "@/app/actions/quotes";

export const QUOTE_TEMPLATE_ID = "BASICO" as const;
export const QUOTE_TEMPLATE_LABEL = "Básico";

export type QuoteTemplateId = typeof QUOTE_TEMPLATE_ID;

export interface QuoteTemplateItem {
  descricao: string;
  quantidade: number;
  tipo_custo: ItemType;
  valor_unitario: number;
}

export const QUOTE_TEMPLATE_BASICO = {
  id: QUOTE_TEMPLATE_ID,
  nome: QUOTE_TEMPLATE_LABEL,
  observacoes: "",
  items: [] as QuoteTemplateItem[],
};
