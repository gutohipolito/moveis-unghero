export interface QuoteItemPresetDTO {
  id: string;
  descricao: string;
  detalhes: string[];
}

/** Normaliza a lista de detalhes: trim, remove vazios e duplicados. */
export function cleanDetalhes(detalhes: string[] | null | undefined): string[] {
  if (!detalhes) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of detalhes) {
    const t = (raw ?? "").trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}
