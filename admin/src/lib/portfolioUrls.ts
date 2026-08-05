/** Múltiplos links de portfólio no campo `portfolioUrl` (um por linha). */
export const MAX_PORTFOLIO_URLS = 5;

export function parsePortfolioUrls(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item).trim())
          .filter(Boolean)
          .slice(0, MAX_PORTFOLIO_URLS);
      }
    } catch {
      /* segue para split */
    }
  }
  return trimmed
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, MAX_PORTFOLIO_URLS);
}

export function serializePortfolioUrls(urls: string[]): string | null {
  const cleaned = urls
    .map((url) => url.trim())
    .filter(Boolean)
    .slice(0, MAX_PORTFOLIO_URLS);
  return cleaned.length ? cleaned.join("\n") : null;
}

export function primaryPortfolioUrl(raw: string | null | undefined): string | null {
  return parsePortfolioUrls(raw)[0] ?? null;
}

export function normalizePortfolioUrl(value: string): string | null {
  let url = value.trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  try {
    new URL(url);
    return url;
  } catch {
    return null;
  }
}
