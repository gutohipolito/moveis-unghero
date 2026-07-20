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

/**
 * Detecta se o texto parece misturar preço/quantidade no título ou detalhe
 * (ex.: "R$ 1300 cada", "2x balcão 1500").
 */
export function getPricingTextWarning(text: string): string | null {
  const raw = text.trim();
  if (!raw) return null;
  const t = raw.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

  const hasMoneyMark =
    /\br\$/.test(t) ||
    /\brs\b/.test(t) ||
    /\breais?\b/.test(t) ||
    /\bvalor\b/.test(t);
  const hasUnitPriceHint = /\bcada\b/.test(t) || /\bunidade\b/.test(t);
  const hasQtyHint =
    /\b\d+\s*[x×]\b/.test(t) ||
    /\b[x×]\s*\d+\b/.test(t) ||
    /\b\d+\s*(pecas?|un)\b/.test(t);
  const hasMoneyNumber =
    /\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})?/.test(t) &&
    (hasMoneyMark || hasUnitPriceHint || /,\d{2}\b/.test(t));

  if (hasMoneyMark && (/\d/.test(t) || hasUnitPriceHint || hasQtyHint)) {
    return "Parece haver preço no texto. Use o campo Valor e a Quantidade — não coloque R$ ou “cada” no título.";
  }
  if (hasUnitPriceHint && /\d/.test(t)) {
    return "“Cada” indica preço unitário. Informe o valor no campo Valor e a quantidade em Qtd.";
  }
  if (hasQtyHint && (hasMoneyMark || hasMoneyNumber)) {
    return "Quantidade e preço devem ficar nos campos Qtd e Valor, não no título.";
  }
  if (/\bvalor\b/.test(t) && /\d/.test(t)) {
    return "Evite escrever o valor no título. Use o campo Valor.";
  }
  return null;
}
