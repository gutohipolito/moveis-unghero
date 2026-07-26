import { createHmac, timingSafeEqual } from "crypto";
import { cookies, headers } from "next/headers";

const COOKIE_PREFIX = "qo_";
/** 14 dias — evita pedir a senha a cada abertura no mesmo aparelho. */
export const QUOTE_SHARE_UNLOCK_MAX_AGE_SEC = 60 * 60 * 24 * 14;

export const QUOTE_SHARE_UNLOCK_HEADER = "x-quote-share-unlock";

function getShareSecret() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET não configurado");
  }
  return secret;
}

export function quoteShareUnlockCookieName(code: string) {
  return `${COOKIE_PREFIX}${code.trim().toLowerCase()}`;
}

export function createQuoteShareUnlockToken(code: string) {
  const normalized = code.trim().toLowerCase();
  return createHmac("sha256", getShareSecret())
    .update(`quote-share-unlock:${normalized}`)
    .digest("hex");
}

export function isValidQuoteShareUnlockToken(code: string, token: string | undefined | null) {
  if (!token) return false;
  try {
    const expected = createQuoteShareUnlockToken(code);
    const a = Buffer.from(token, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function isQuoteShareUnlocked(code: string) {
  try {
    const store = await cookies();
    const cookieToken = store.get(quoteShareUnlockCookieName(code))?.value;
    if (isValidQuoteShareUnlockToken(code, cookieToken)) return true;

    const hdrs = await headers();
    const headerToken = hdrs.get(QUOTE_SHARE_UNLOCK_HEADER);
    if (isValidQuoteShareUnlockToken(code, headerToken)) return true;

    return false;
  } catch {
    return false;
  }
}
