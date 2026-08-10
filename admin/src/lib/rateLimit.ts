/**
 * Rate limit em memória (por isolate na Vercel).
 * Com UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN, checkRateLimitAsync
 * usa contador compartilhado entre isolates (login/OTP do parceiro).
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

function upstashConfigured() {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  );
}

/**
 * Rate limit distribuído via Upstash REST quando configurado;
 * caso contrário, mesma lógica em memória.
 */
export async function checkRateLimitAsync(
  key: string,
  options: { limit: number; windowMs: number }
): Promise<RateLimitResult> {
  if (!upstashConfigured()) {
    return checkRateLimit(key, options);
  }

  const url = process.env.UPSTASH_REDIS_REST_URL!.replace(/\/$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const redisKey = `mu:rl:${key}`;
  const windowSec = Math.max(1, Math.ceil(options.windowMs / 1000));

  try {
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["EXPIRE", redisKey, windowSec, "NX"],
        ["TTL", redisKey],
      ]),
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn("Upstash rate limit HTTP", res.status);
      return checkRateLimit(key, options);
    }

    const data = (await res.json()) as Array<{ result?: number | string }>;
    const count = Number(data[0]?.result ?? 0);
    const ttlRaw = Number(data[2]?.result ?? windowSec);
    const ttl = Number.isFinite(ttlRaw) && ttlRaw > 0 ? ttlRaw : windowSec;

    if (count > options.limit) {
      return {
        ok: false,
        remaining: 0,
        retryAfterSec: Math.max(1, Math.ceil(ttl)),
      };
    }

    return {
      ok: true,
      remaining: Math.max(0, options.limit - count),
      retryAfterSec: 0,
    };
  } catch (error) {
    console.warn("Upstash rate limit falhou; usando memória.", error);
    return checkRateLimit(key, options);
  }
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
