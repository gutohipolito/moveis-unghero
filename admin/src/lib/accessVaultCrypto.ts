import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const PREFIX = "v1";

function getVaultKey(): Buffer {
  const secret =
    process.env.ACCESS_VAULT_SECRET ||
    process.env.BETTER_AUTH_SECRET ||
    process.env.ADMIN_SETUP_SECRET;
  if (!secret) {
    throw new Error("Nenhum segredo configurado para o cofre de acessos.");
  }
  return createHash("sha256").update(`unghero-access-vault:${secret}`).digest();
}

/** Criptografa senha/segredo com AES-256-GCM. Retorna payload `v1:iv:tag:cipher`. */
export function encryptVaultSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getVaultKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    PREFIX,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

/** Descriptografa payload do cofre. */
export function decryptVaultSecret(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== PREFIX) {
    throw new Error("Formato de segredo inválido.");
  }
  const [, ivB64, tagB64, dataB64] = parts;
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getVaultKey(),
    Buffer.from(ivB64, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64url")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
