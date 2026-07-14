export type SuggestionStatus = "ABERTA" | "CONCLUIDA";

export interface SuggestionDTO {
  id: string;
  titulo: string;
  descricao: string | null;
  status: SuggestionStatus;
  authorId: string;
  authorName: string;
  resolverName: string | null;
  createdAt: string;
  doneAt: string | null;
}
