import { createHmac, timingSafeEqual } from "crypto";

function getClientSessionSecret() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET não configurado");
  }
  return secret;
}

function signClientId(clientId: string) {
  return createHmac("sha256", getClientSessionSecret()).update(clientId).digest("hex");
}

export function createClientSessionToken(clientId: string) {
  return `${clientId}.${signClientId(clientId)}`;
}

export function parseClientSessionToken(token: string | undefined | null): string | null {
  if (!token) return null;

  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;

  const clientId = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!clientId || !signature) return null;

  try {
    const expected = signClientId(clientId);
    const sigBuffer = Buffer.from(signature, "utf8");
    const expectedBuffer = Buffer.from(expected, "utf8");
    if (sigBuffer.length !== expectedBuffer.length) return null;
    if (!timingSafeEqual(sigBuffer, expectedBuffer)) return null;
    return clientId;
  } catch {
    return null;
  }
}
