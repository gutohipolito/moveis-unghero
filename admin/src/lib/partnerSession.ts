import { createHmac, timingSafeEqual } from "crypto";

function getPartnerSessionSecret() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET não configurado");
  }
  return secret;
}

function signPartnerId(partnerId: string) {
  return createHmac("sha256", getPartnerSessionSecret())
    .update(`partner:${partnerId}`)
    .digest("hex");
}

export function createPartnerSessionToken(partnerId: string) {
  return `${partnerId}.${signPartnerId(partnerId)}`;
}

export function parsePartnerSessionToken(token: string | undefined | null): string | null {
  if (!token) return null;

  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;

  const partnerId = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!partnerId || !signature) return null;

  try {
    const expected = signPartnerId(partnerId);
    const sigBuffer = Buffer.from(signature, "utf8");
    const expectedBuffer = Buffer.from(expected, "utf8");
    if (sigBuffer.length !== expectedBuffer.length) return null;
    if (!timingSafeEqual(sigBuffer, expectedBuffer)) return null;
    return partnerId;
  } catch {
    return null;
  }
}
