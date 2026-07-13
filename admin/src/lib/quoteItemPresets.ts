/** Cadastro de descrições de item (aparecem apenas no campo "Descrição do item"). */
export interface QuoteItemPresetDTO {
  id: string;
  descricao: string;
}

/** Cadastro de detalhes de item (aparecem apenas no campo "Detalhes do item"). */
export interface QuoteDetailPresetDTO {
  id: string;
  texto: string;
}
