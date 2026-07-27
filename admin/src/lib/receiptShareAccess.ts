import { createHmac, timingSafeEqual } from "crypto";
import { cookies, headers } from "next/headers";

const COOKIE_PREFIX = "qr_";
/** 14 dias — evita pedir a senha a cada abertura no mesmo aparelho. */
export const RECEIPT_SHARE_UNLOCK_MAX_AGE_SEC = 60 * 60 * 24 * 14;

export const RECEIPT_SHARE_UNLOCK_HEADER = "x-receipt-share-unlock";

function getShareSecret() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET não configurado");
  }
  return secret;
}

export function receiptShareUnlockCookieName(code: string) {
  return `${COOKIE_PREFIX}${code.trim().toLowerCase()}`;
}

export function createReceiptShareUnlockToken(code: string) {
  const normalized = code.trim().toLowerCase();
  return createHmac("sha256", getShareSecret())
    .update(`receipt-share-unlock:${normalized}`)
    .digest("hex");
}

export function isValidReceiptShareUnlockToken(
  code: string,
  token: string | undefined | null
) {
  if (!token) return false;
  try {
    const expected = createReceiptShareUnlockToken(code);
    const a = Buffer.from(token, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function isReceiptShareUnlocked(code: string) {
  try {
    const store = await cookies();
    const cookieToken = store.get(receiptShareUnlockCookieName(code))?.value;
    if (isValidReceiptShareUnlockToken(code, cookieToken)) return true;

    const hdrs = await headers();
    const headerToken = hdrs.get(RECEIPT_SHARE_UNLOCK_HEADER);
    if (isValidReceiptShareUnlockToken(code, headerToken)) return true;

    return false;
  } catch {
    return false;
  }
}
