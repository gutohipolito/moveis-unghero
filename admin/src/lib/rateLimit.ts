/**
 * Rate limit: memória por isolate; com Upstash Redis (env), contador compartilhado.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type RateBucket = {
  count: number;
  resetAt: number;
};

const globalStore = globalThis as unknown as {
  __muRateLimit?: Map<string, RateBucket>;
  __muUpstashLimiters?: Map<string, Ratelimit>;
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
  return Boolean(getUpstashUrl() && getUpstashToken());
}

function getUpstashUrl() {
  return (
    process.env.UPSTASH_REDIS_REST_URL?.trim() ||
    process.env.KV_REST_API_URL?.trim() ||
    ""
  );
}

function getUpstashToken() {
  return (
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
    process.env.KV_REST_API_TOKEN?.trim() ||
    ""
  );
}

function getUpstashLimiter(limit: number, windowMs: number): Ratelimit | null {
  if (!upstashConfigured()) return null;

  if (!globalStore.__muUpstashLimiters) {
    globalStore.__muUpstashLimiters = new Map();
  }

  const cacheKey = `${limit}:${windowMs}`;
  const cached = globalStore.__muUpstashLimiters.get(cacheKey);
  if (cached) return cached;

  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  const limiter = new Ratelimit({
    redis: new Redis({
      url: getUpstashUrl(),
      token: getUpstashToken(),
    }),
    limiter: Ratelimit.fixedWindow(limit, `${windowSec} s`),
    prefix: "mu:rl",
    analytics: false,
  });
  globalStore.__muUpstashLimiters.set(cacheKey, limiter);
  return limiter;
}

/**
 * Rate limit distribuído via Upstash quando configurado;
 * caso contrário, mesma lógica em memória.
 */
export async function checkRateLimitAsync(
  key: string,
  options: { limit: number; windowMs: number }
): Promise<RateLimitResult> {
  const limiter = getUpstashLimiter(options.limit, options.windowMs);
  if (!limiter) {
    return checkRateLimit(key, options);
  }

  try {
    const result = await limiter.limit(key);
    if (!result.success) {
      const retryAfterSec = Math.max(
        1,
        Math.ceil((result.reset - Date.now()) / 1000)
      );
      return { ok: false, remaining: 0, retryAfterSec };
    }
    return {
      ok: true,
      remaining: result.remaining,
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
