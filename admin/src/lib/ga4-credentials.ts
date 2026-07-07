/**
 * Normaliza GA4_PRIVATE_KEY vindas de .env / Vercel.
 * Corrige aspas externas, \\n literais e JSON completo da service account.
 */
export function normalizeGa4PrivateKey(raw: string | undefined | null): string | null {
  if (!raw?.trim()) return null;

  let key = raw.trim();

  if (key.startsWith("{")) {
    try {
      const parsed = JSON.parse(key) as { private_key?: string };
      if (typeof parsed.private_key === "string") {
        key = parsed.private_key;
      }
    } catch {
      /* mantém valor original */
    }
  }

  while (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }

  for (let i = 0; i < 3; i += 1) {
    if (!key.includes("\\n")) break;
    key = key.replace(/\\n/g, "\n");
  }

  if (!key.includes("-----BEGIN PRIVATE KEY-----")) {
    return null;
  }

  return key;
}

export function formatGa4CredentialError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (
    message.includes("DECODER") ||
    message.includes("unsupported") ||
    message.includes("PEM")
  ) {
    return "Formato inválido da GA4_PRIVATE_KEY. Na Vercel, cole a chave sem aspas no início/fim — use \\n entre as linhas — ou cole o JSON inteiro da service account nesta variável.";
  }

  if (message.includes("PERMISSION_DENIED") || message.includes("403")) {
    return "Service account sem permissão de Leitor na propriedade GA4. Verifique o acesso em Admin → Gerenciamento de acesso.";
  }

  return message || "Não foi possível carregar os dados do Google Analytics.";
}
