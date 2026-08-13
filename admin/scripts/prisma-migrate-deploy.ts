/**
 * Aplica migrations no build de produção da Vercel.
 * Preview/dev não tocam o banco (evita PR aplicar DDL em produção cedo demais).
 * Prefere URL unpooled da Neon — migrate precisa de advisory lock, que o pooler não dá.
 */
import { spawnSync } from "node:child_process";

function toDirectUrl(url: string) {
  return url.replace(/-pooler\./g, ".");
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

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: toDirectUrl(source) },
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
