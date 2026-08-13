/**
 * Aplica migrations no build de produção da Vercel.
 * Preview/dev não tocam o banco (evita PR aplicar DDL em produção cedo demais).
 *
 * Na Vercel (iad1 → Neon sa-east-1) reescrever a URL para o endpoint direto trava no
 * advisory lock (P1002). Ficamos no pooler + PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK —
 * padrão Neon quando o unpooled não é confiável no build.
 * Fora da Vercel, preferimos a URL direta (com lock).
 */
import { spawnSync } from "node:child_process";

const MAX_ATTEMPTS = 3;
const RETRY_BASE_MS = 4_000;

function toDirectUrl(url: string) {
  return url.replace(/-pooler\./g, ".");
}

function sleep(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

const vercelEnv = process.env.VERCEL_ENV;
const force = process.env.PRISMA_MIGRATE_ON_BUILD === "1";
const onVercel = Boolean(process.env.VERCEL);

if (!force && vercelEnv !== "production") {
  console.log(
    `[prisma] skip migrate deploy (${vercelEnv ? `VERCEL_ENV=${vercelEnv}` : "build local"})`
  );
  process.exit(0);
}

const env: NodeJS.ProcessEnv = { ...process.env };

if (onVercel) {
  // Não stripar -pooler: a conexão direta da Vercel ao Neon falha no advisory lock.
  env.PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK = "1";
  console.log("[prisma] migrate via pooler (advisory lock desligado)");
} else {
  const source =
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.DIRECT_DATABASE_URL ||
    process.env.DATABASE_URL;
  if (source) {
    env.DATABASE_URL = toDirectUrl(source);
    console.log("[prisma] migrate via conexão direta");
  } else {
    console.log("[prisma] migrate (DATABASE_URL do ambiente / .env do Prisma)");
  }
}

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

  if (attempt >= MAX_ATTEMPTS) {
    process.exit(result.status ?? 1);
  }

  const waitMs = RETRY_BASE_MS * attempt;
  console.warn(
    `[prisma] migrate falhou (exit ${result.status ?? "?"}). Nova tentativa em ${waitMs / 1000}s…`
  );
  sleep(waitMs);
}

process.exit(1);
