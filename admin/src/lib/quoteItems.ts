/** Normaliza subitens salvos como JSON no QuoteItem. */
export function parseQuoteSubitens(value: unknown): string[] {
  if (!value) return [];
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function formatQuoteSubitensLine(subitens: string[]): string {
  return subitens.join(" • ");
}
