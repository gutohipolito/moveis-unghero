import { prisma } from "@/lib/prisma";

export const QUOTE_PDF_SHORT_PATH = "/o";

const SHARE_CODE_ALPHABET = "abcdefghijkmnopqrstuvwxyz23456789";

/** Base pública do link curto (site institucional). */
export function getQuotePdfShortBaseUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_QUOTE_PDF_SHORT_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  const reviewBase = process.env.NEXT_PUBLIC_REVIEW_SHORT_URL?.replace(/\/$/, "");
  if (reviewBase) return reviewBase;

  return "https://moveisunghero.com.br";
}

export function buildQuotePdfShortUrl(code: string) {
  return `${getQuotePdfShortBaseUrl()}${QUOTE_PDF_SHORT_PATH}/${code}`;
}

export function generateQuotePdfShareCode(length = 12) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => SHARE_CODE_ALPHABET[byte % SHARE_CODE_ALPHABET.length]).join("");
}

export async function generateUniqueQuotePdfShareCode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateQuotePdfShareCode();
    const existing = await prisma.quote.findFirst({
      where: { pdf_share_code: code },
      select: { id: true },
    });
    if (!existing) return code;
  }

  throw new Error("Não foi possível gerar um código único para o link do orçamento.");
}

/** Garante código curto do link público (não depende mais de PDF no Blob). */
export async function ensureQuotePdfShareCode(quoteId: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    select: { pdf_share_code: true },
  });

  if (!quote) return null;
  if (quote.pdf_share_code) return quote.pdf_share_code;

  const code = await generateUniqueQuotePdfShareCode();
  await prisma.quote.update({
    where: { id: quoteId },
    data: {
      pdf_share_code: code,
      pdf_shared_at: new Date(),
    },
  });

  return code;
}

export function resolveQuotePdfPublicUrl(options: {
  pdf_share_code?: string | null;
  pdf_share_url?: string | null;
}) {
  if (options.pdf_share_code) {
    return buildQuotePdfShortUrl(options.pdf_share_code);
  }
  return options.pdf_share_url ?? null;
}
