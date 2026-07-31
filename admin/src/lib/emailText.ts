import iconv from "iconv-lite";

/** Conta caracteres “quebrados” típicos de encoding errado. */
function brokenScore(value: string): number {
  if (!value) return 0;
  const replacement = (value.match(/\uFFFD/g) || []).length;
  const mojibake = (value.match(/Ã.|Â.|â€.|â€™|â€œ|â€/g) || []).length;
  return replacement * 3 + mojibake;
}

/**
 * Tenta recuperar texto com charset errado (ex.: UTF-8 lido como Latin-1),
 * comum em e-mails do WhatsApp Business e alguns notificadores.
 */
export function repairEmailText(value: string | null | undefined): string {
  const raw = (value || "").toString();
  if (!raw) return "";

  let best = raw;
  let bestScore = brokenScore(raw);

  // UTF-8 interpretado como Latin-1 → "ConfiguraÃ§Ãµes"
  if (/Ã.|Â.|â€.|â€™/.test(raw)) {
    try {
      const fixed = iconv.decode(Buffer.from(raw, "latin1"), "utf8");
      const score = brokenScore(fixed);
      if (fixed && score < bestScore) {
        best = fixed;
        bestScore = score;
      }
    } catch {
      /* ignore */
    }
  }

  // Latin-1 / Windows-1252 lido como UTF-8 (gera �)
  if (raw.includes("\uFFFD")) {
    for (const charset of ["latin1", "win1252", "iso-8859-1"] as const) {
      try {
        const asBuf = Buffer.from(raw, "binary");
        const fixed = iconv.decode(asBuf, charset);
        const score = brokenScore(fixed);
        if (fixed && score < bestScore) {
          best = fixed;
          bestScore = score;
        }
      } catch {
        /* ignore */
      }
    }
  }

  return best;
}

/** Escapa HTML e preserva quebras de linha. */
export function plainTextToSafeHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.55;white-space:pre-wrap;color:#1e293b">${escaped}</div>`;
}

export function looksLikeBrokenEncoding(value: string | null | undefined): boolean {
  return brokenScore(value || "") >= 2;
}

