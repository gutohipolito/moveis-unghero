import { createHmac, timingSafeEqual } from "crypto";

const SLOT_MS = 5 * 60 * 1000;

function getSecret() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET não configurado");
  }
  return secret;
}

/** Código de 6 dígitos derivado do parceiro + janela de 5 minutos (sem persistência). */
export function generatePartnerLoginOtp(partnerId: string, at = Date.now()): string {
  const slot = Math.floor(at / SLOT_MS);
  const digest = createHmac("sha256", getSecret())
    .update(`partner-otp-v1:${partnerId}:${slot}`)
    .digest("hex");
  return String(parseInt(digest.slice(0, 8), 16) % 1_000_000).padStart(6, "0");
}

export function verifyPartnerLoginOtp(partnerId: string, code: string): boolean {
  const cleaned = code.replace(/\D/g, "").slice(0, 6);
  if (cleaned.length !== 6) return false;

  const now = Date.now();
  for (const offset of [0, -1]) {
    const expected = generatePartnerLoginOtp(partnerId, now + offset * SLOT_MS);
    const a = Buffer.from(cleaned, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return false;
}

export const PARTNER_LOGIN_OTP_TTL_MINUTES = 5;
