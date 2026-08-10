import { createHmac, timingSafeEqual } from "crypto";

function getPartnerSessionSecret() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET não configurado");
  }
  return secret;
}

function signPayload(payload: string) {
  return createHmac("sha256", getPartnerSessionSecret())
    .update(`partner:${payload}`)
    .digest("hex");
}

function safeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

/** Cookie HMAC com expiração embutida: partnerId.exp.sig */
export function createPartnerSessionToken(partnerId: string, maxAgeSec = 60 * 60 * 24) {
  const exp = Math.floor(Date.now() / 1000) + Math.max(60, maxAgeSec);
  const payload = `${partnerId}.${exp}`;
  return `${payload}.${signPayload(payload)}`;
}

/** Desafio de login (pré-OTP) — assinatura distinta da sessão. */
export function createPartnerPendingLoginToken(partnerId: string, maxAgeSec = 10 * 60) {
  const exp = Math.floor(Date.now() / 1000) + Math.max(60, maxAgeSec);
  const payload = `${partnerId}.${exp}`;
  const signature = createHmac("sha256", getPartnerSessionSecret())
    .update(`partner-pending:${payload}`)
    .digest("hex");
  return `${payload}.${signature}`;
}

export function parsePartnerPendingLoginToken(
  token: string | undefined | null
): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [partnerId, expRaw, signature] = parts;
  if (!partnerId || !expRaw || !signature) return null;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;
  try {
    const expected = createHmac("sha256", getPartnerSessionSecret())
      .update(`partner-pending:${partnerId}.${expRaw}`)
      .digest("hex");
    if (!safeEqual(signature, expected)) return null;
    return partnerId;
  } catch {
    return null;
  }
}

export function parsePartnerSessionToken(token: string | undefined | null): string | null {
  if (!token) return null;

  const parts = token.split(".");
  // Novo: id.exp.sig | legado: id.sig (rejeitado — força novo login)
  if (parts.length !== 3) return null;

  const [partnerId, expRaw, signature] = parts;
  if (!partnerId || !expRaw || !signature) return null;

  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;

  try {
    const expected = signPayload(`${partnerId}.${expRaw}`);
    if (!safeEqual(signature, expected)) return null;
    return partnerId;
  } catch {
    return null;
  }
}
