import { capitalizeText } from "@/lib/utils";

/** Normaliza subitens salvos como JSON no QuoteItem. */
export function parseQuoteSubitens(value: unknown): string[] {
  if (!value) return [];
  if (!Array.isArray(value)) return [];
  return expandAndFormatQuoteDetails(
    value.filter((entry): entry is string => typeof entry === "string")
  );
}

/**
 * Quebra vírgulas (mesmo sem espaço), normaliza espaços e capitaliza
 * cada detalhe (Title Case do sistema).
 */
export function expandAndFormatQuoteDetails(parts: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const part of parts) {
    if (typeof part !== "string") continue;
    for (const chunk of part.split(",")) {
      const formatted = formatQuotePhrase(chunk);
      if (!formatted) continue;
      const key = formatted.toLocaleLowerCase("pt-BR");
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(formatted);
    }
  }

  return out;
}

/** Título/descrição do item: espaços + capitalização padrão do sistema. */
export function formatQuotePhrase(value: string): string {
  return capitalizeText(value.replace(/\s+/g, " ").trim());
}

export function formatQuoteSubitensLine(subitens: string[]): string {
  return expandAndFormatQuoteDetails(subitens).join(" • ");
}

/** Subitens do item de orçamento vinculado ao ambiente (sem preços). */
export function linkedQuoteSubitens(
  quoteItem: { subitens?: unknown } | null | undefined
): string[] {
  if (!quoteItem) return [];
  return parseQuoteSubitens(quoteItem.subitens);
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
