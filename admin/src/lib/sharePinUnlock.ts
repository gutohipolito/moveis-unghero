import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { checkRateLimitAsync } from "@/lib/rateLimit";

/** Bloqueia o link específico — impede varrer o PIN de 4 dígitos. */
export const SHARE_PIN_CODE_RATE = { limit: 8, windowMs: 15 * 60 * 1000 };

/** Comparação constant-time dos 4 dígitos (ambos já normalizados). */
export function pinsMatch(provided: string, expected: string): boolean {
  try {
    const a = Buffer.from(provided, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function checkSharePinCodeLimit(
  kind: "quote" | "receipt",
  code: string
): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  const byCode = await checkRateLimitAsync(
    `share-pin:${kind}:${code}`,
    SHARE_PIN_CODE_RATE
  );
  if (!byCode.ok) {
    return { ok: false, retryAfterSec: byCode.retryAfterSec };
  }
  return { ok: true };
}

export function sharePinLockedResponse(retryAfterSec: number) {
  return NextResponse.json(
    {
      success: false,
      error: `Muitas tentativas neste link. Aguarde ${retryAfterSec}s e tente novamente.`,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
        "X-RateLimit-Limit": String(SHARE_PIN_CODE_RATE.limit),
        "X-RateLimit-Remaining": "0",
      },
    }
  );
}
