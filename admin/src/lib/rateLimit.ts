/**
 * Rate limit em memória (por isolate na Vercel).
 * Não substitui WAF, mas freia força-bruta no login em instâncias quentes.
 */

type RateBucket = {
  count: number;
  resetAt: number;
};

const globalStore = globalThis as unknown as {
  __muRateLimit?: Map<string, RateBucket>;
};

function store() {
  if (!globalStore.__muRateLimit) {
    globalStore.__muRateLimit = new Map();
  }
  return globalStore.__muRateLimit;
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
};

export function checkRateLimit(
  key: string,
  options: { limit: number; windowMs: number }
): RateLimitResult {
  const now = Date.now();
  const buckets = store();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return { ok: true, remaining: options.limit - 1, retryAfterSec: 0 };
  }

  if (existing.count >= options.limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  buckets.set(key, existing);
  return {
    ok: true,
    remaining: options.limit - existing.count,
    retryAfterSec: 0,
  };
}

/** IP do cliente atrás da Vercel / proxy. */
export function getRequestIp(headersList: Headers): string {
  const forwarded = headersList.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headersList.get("x-real-ip")?.trim() || "unknown";
}
