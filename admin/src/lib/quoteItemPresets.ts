/** Cadastro de descrições de item (aparecem apenas no campo "Descrição do item"). */
export interface QuoteItemPresetDTO {
  id: string;
  descricao: string;
  imagem_url: string | null;
}

/** Cadastro de detalhes de item (aparecem apenas no campo "Detalhes do item"). */
export interface QuoteDetailPresetDTO {
  id: string;
  texto: string;
  imagem_url: string | null;
  inventory_item_id: string | null;
  inventory_item_nome: string | null;
}

export type QuotePresetInventoryOption = {
  id: string;
  nome: string;
  categoria: string;
};
