import { prisma } from "@/lib/prisma";
import { reencryptVaultSecretIfNeeded } from "@/lib/accessVaultCrypto";

/** Re-criptografa registros do cofre ainda na chave legada de sessão. */
export async function reencryptStoredVaultSecrets(): Promise<{
  updated: number;
  skipped: boolean;
}> {
  if (!process.env.ACCESS_VAULT_SECRET?.trim()) {
    return { updated: 0, skipped: true };
  }

  let updated = 0;

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

  return { updated, skipped: false };
}
