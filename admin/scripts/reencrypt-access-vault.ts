/**
 * Re-criptografa senhas do cofre e das caixas de e-mail para ACCESS_VAULT_SECRET.
 * Preferir rodar em produção (lá estão os secrets reais):
 *   npx vercel crons run /api/cron/database-backup
 *
 * Local só funciona com DATABASE_URL + BETTER_AUTH_SECRET + ACCESS_VAULT_SECRET reais.
 */
import { reencryptStoredVaultSecrets } from "../src/lib/accessVaultRotate";

async function main() {
  if (!process.env.ACCESS_VAULT_SECRET?.trim()) {
    throw new Error("Defina ACCESS_VAULT_SECRET antes de re-criptografar.");
  }
  if (!process.env.BETTER_AUTH_SECRET?.trim()) {
    throw new Error("BETTER_AUTH_SECRET é necessário para ler os registros legados.");
  }

  const result = await reencryptStoredVaultSecrets();
  if (result.skipped) {
    throw new Error("Defina ACCESS_VAULT_SECRET antes de re-criptografar.");
  }
  console.log(`Cofre re-criptografado. Registros atualizados: ${result.updated}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
