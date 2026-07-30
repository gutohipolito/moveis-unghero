import { prisma } from "@/lib/prisma";

export const CATALOG_SHORT_PATH = "/catalogos";

const SHARE_CODE_ALPHABET = "abcdefghijkmnopqrstuvwxyz23456789";

export function getCatalogShortBaseUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_CATALOG_SHORT_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  const quoteBase = process.env.NEXT_PUBLIC_QUOTE_PDF_SHORT_URL?.replace(/\/$/, "");
  if (quoteBase) return quoteBase;

  return "https://moveisunghero.com.br";
}

export function buildCatalogShortUrl(code: string) {
  return `${getCatalogShortBaseUrl()}${CATALOG_SHORT_PATH}/${code}`;
}

/** 12 caracteres (~60 bits) para reduzir risco de descoberta do link público. */
export function generateCatalogShareCode(length = 12) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => SHARE_CODE_ALPHABET[byte % SHARE_CODE_ALPHABET.length]).join(
    ""
  );
}

export async function generateUniqueCatalogShareCode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateCatalogShareCode();
    const existing = await prisma.productCatalog.findFirst({
      where: { share_code: code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  throw new Error("Não foi possível gerar um código único para o link do catálogo.");
}

export async function ensureCatalogShareCode(catalogId: string) {
  const catalog = await prisma.productCatalog.findUnique({
    where: { id: catalogId },
    select: { share_code: true },
  });

  if (!catalog) return null;
  if (catalog.share_code) return catalog.share_code;

  const code = await generateUniqueCatalogShareCode();
  await prisma.productCatalog.update({
    where: { id: catalogId },
    data: {
      share_code: code,
      shared_at: new Date(),
    },
  });

  return code;
}

export function resolveCatalogPublicUrl(shareCode?: string | null) {
  if (!shareCode) return null;
  return buildCatalogShortUrl(shareCode);
}

export function isValidCatalogShareCode(code: string) {
  return /^[a-z0-9]{6,12}$/.test(code.trim().toLowerCase());
}
