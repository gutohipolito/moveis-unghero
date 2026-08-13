/**
 * Aplica migrations no build de produção da Vercel.
 * Preview/dev não tocam o banco (evita PR aplicar DDL em produção cedo demais).
 * Prefere URL unpooled da Neon — migrate precisa de advisory lock, que o pooler não dá.
 *
 * Retry em P1002: cold start do Neon ou lock residual de outro migrate (ex.: apply local
 * segundos antes do deploy) costuma liberar em poucos segundos.
 */
import { spawnSync } from "node:child_process";

const MAX_ATTEMPTS = 4;
const RETRY_BASE_MS = 5_000;

function toDirectUrl(url: string) {
  return url.replace(/-pooler\./g, ".");
}

function sleep(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

const vercelEnv = process.env.VERCEL_ENV;
const force = process.env.PRISMA_MIGRATE_ON_BUILD === "1";

if (!force && vercelEnv !== "production") {
  console.log(
    `[prisma] skip migrate deploy (${vercelEnv ? `VERCEL_ENV=${vercelEnv}` : "build local"})`
  );
  process.exit(0);
}

const source =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.DIRECT_DATABASE_URL ||
  process.env.DATABASE_URL;

if (!source) {
  console.error("[prisma] DATABASE_URL ausente — migrate deploy abortado.");
  process.exit(1);
}

const env = { ...process.env, DATABASE_URL: toDirectUrl(source) };

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  console.log(`[prisma] migrate deploy (tentativa ${attempt}/${MAX_ATTEMPTS})`);
  const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    env,
    shell: process.platform === "win32",
  });

  if (result.status === 0) {
    process.exit(0);
  }

  const retryable = attempt < MAX_ATTEMPTS;
  if (!retryable) {
    process.exit(result.status ?? 1);
  }

  const waitMs = RETRY_BASE_MS * attempt;
  console.warn(
    `[prisma] migrate falhou (exit ${result.status ?? "?"}). Nova tentativa em ${waitMs / 1000}s…`
  );
  sleep(waitMs);
}

process.exit(1);
