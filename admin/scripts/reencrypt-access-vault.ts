/**
 * Re-criptografa senhas do cofre e das caixas de e-mail para ACCESS_VAULT_SECRET.
 * Uso (na pasta admin/): npx tsx scripts/reencrypt-access-vault.ts
 */
import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import { reencryptVaultSecretIfNeeded } from "../src/lib/accessVaultCrypto";

loadEnvConfig(process.cwd());

async function main() {
  if (!process.env.ACCESS_VAULT_SECRET?.trim()) {
    throw new Error("Defina ACCESS_VAULT_SECRET antes de re-criptografar.");
  }
  if (!process.env.BETTER_AUTH_SECRET?.trim()) {
    throw new Error("BETTER_AUTH_SECRET é necessário para ler os registros legados.");
  }

  const prisma = new PrismaClient();
  let updated = 0;

  try {
    const credentials = await prisma.accessCredential.findMany({
      where: { senha_enc: { not: null } },
      select: { id: true, senha_enc: true },
    });
    for (const row of credentials) {
      if (!row.senha_enc) continue;
      const next = reencryptVaultSecretIfNeeded(row.senha_enc);
      if (!next) continue;
      await prisma.accessCredential.update({
        where: { id: row.id },
        data: { senha_enc: next },
      });
      updated += 1;
    }

    const mailboxes = await prisma.emailMailbox.findMany({
      select: { id: true, password_enc: true },
    });
    for (const row of mailboxes) {
      const next = reencryptVaultSecretIfNeeded(row.password_enc);
      if (!next) continue;
      await prisma.emailMailbox.update({
        where: { id: row.id },
        data: { password_enc: next },
      });
      updated += 1;
    }

    console.log(`Cofre re-criptografado. Registros atualizados: ${updated}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
