import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const PREFIX = "v1";

function uniqueSecrets(): string[] {
  const secrets = [
    process.env.ACCESS_VAULT_SECRET,
    process.env.BETTER_AUTH_SECRET,
    process.env.ADMIN_SETUP_SECRET,
  ].filter((value): value is string => Boolean(value?.trim()));
  return [...new Set(secrets)];
}

function keyFromSecret(secret: string): Buffer {
  return createHash("sha256").update(`unghero-access-vault:${secret}`).digest();
}

/** Chave de escrita: ACCESS_VAULT_SECRET, senão fallback legado. */
function getPrimaryVaultKey(): Buffer {
  const primary = process.env.ACCESS_VAULT_SECRET?.trim() || uniqueSecrets()[0];
  if (!primary) {
    throw new Error("Nenhum segredo configurado para o cofre de acessos.");
  }
  return keyFromSecret(primary);
}

function decryptWithKey(payload: string, key: Buffer): string {
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== PREFIX) {
    throw new Error("Formato de segredo inválido.");
  }
  const [, ivB64, tagB64, dataB64] = parts;
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64url")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/** Criptografa senha/segredo com AES-256-GCM. Retorna payload `v1:iv:tag:cipher`. */
export function encryptVaultSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getPrimaryVaultKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    PREFIX,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

/** Descriptografa payload do cofre (tenta a chave atual e as legadas). */
export function decryptVaultSecret(payload: string): string {
  const secrets = uniqueSecrets();
  if (secrets.length === 0) {
    throw new Error("Nenhum segredo configurado para o cofre de acessos.");
  }

  let lastError: unknown;
  for (const secret of secrets) {
    try {
      return decryptWithKey(payload, keyFromSecret(secret));
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Não foi possível descriptografar o segredo do cofre.");
}

/**
 * Re-criptografa com ACCESS_VAULT_SECRET quando o payload ainda está na chave legada.
 * Retorna null se já estiver na chave atual (ou se ACCESS_VAULT_SECRET não existir).
 */
export function reencryptVaultSecretIfNeeded(payload: string): string | null {
  if (!process.env.ACCESS_VAULT_SECRET?.trim()) return null;
  try {
    decryptWithKey(payload, getPrimaryVaultKey());
    return null;
  } catch {
    const plain = decryptVaultSecret(payload);
    return encryptVaultSecret(plain);
  }
}
