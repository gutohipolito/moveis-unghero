export interface Ga4Credentials {
  clientEmail: string;
  privateKey: string;
  propertyId: string;
}

function parseServiceAccountJson(raw: string): { client_email?: string; private_key?: string } | null {
  try {
    const parsed = JSON.parse(raw.trim()) as { client_email?: string; private_key?: string };
    if (typeof parsed.private_key === "string" && typeof parsed.client_email === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/** Normaliza GA4_PRIVATE_KEY vindas de .env / Vercel. */
export function normalizeGa4PrivateKey(raw: string | undefined | null): string | null {
  if (!raw?.trim()) return null;

  let key = raw.trim();

  if (key.startsWith("{")) {
    const json = parseServiceAccountJson(key);
    if (json?.private_key) return json.private_key;
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

export function normalizeGa4PropertyId(raw: string | undefined | null): string | null {
  if (!raw?.trim()) return null;
  let id = raw.trim();
  if (id.startsWith("properties/")) id = id.slice("properties/".length);
  if (id.startsWith("G-")) return null;
  return id.replace(/\D/g, "") || null;
}

/**
 * Resolve credenciais GA4 a partir das variáveis de ambiente.
 * Prioridade: GA4_SERVICE_ACCOUNT_JSON → JSON em GA4_PRIVATE_KEY → email + chave separados.
 */
export function resolveGa4Credentials(): Ga4Credentials | null {
  const propertyId = normalizeGa4PropertyId(process.env.GA4_PROPERTY_ID);
  if (!propertyId) return null;

  const jsonRaw =
    process.env.GA4_SERVICE_ACCOUNT_JSON?.trim() ||
    (process.env.GA4_PRIVATE_KEY?.trim().startsWith("{")
      ? process.env.GA4_PRIVATE_KEY.trim()
      : null);

  if (jsonRaw) {
    const json = parseServiceAccountJson(jsonRaw);
    if (json?.client_email && json.private_key) {
      return {
        clientEmail: json.client_email,
        privateKey: json.private_key,
        propertyId,
      };
    }
  }

  const privateKey = normalizeGa4PrivateKey(process.env.GA4_PRIVATE_KEY);
  const clientEmail = process.env.GA4_CLIENT_EMAIL?.trim();
  if (!privateKey || !clientEmail) return null;

  return { clientEmail, privateKey, propertyId };
}

export function formatGa4CredentialError(
  error: unknown,
  context?: Pick<Ga4Credentials, "clientEmail" | "propertyId">
): string {
  const message = error instanceof Error ? error.message : String(error);
  const hint = context
    ? ` (conta: ${context.clientEmail}, propriedade: ${context.propertyId})`
    : "";

  if (
    message.includes("DECODER") ||
    message.includes("unsupported") ||
    message.includes("PEM")
  ) {
    return "Formato inválido da GA4_PRIVATE_KEY. Cole o JSON inteiro da service account em GA4_SERVICE_ACCOUNT_JSON ou a chave sem aspas externas com \\n entre as linhas.";
  }

  if (
    message.includes("PERMISSION_DENIED") ||
    message.includes("403") ||
    message.includes("Caller does not have permission")
  ) {
    return `Service account sem acesso à propriedade GA4${hint}. No GA4 → Admin → Gerenciamento de acesso, adicione o e-mail da service account como Leitor na propriedade ${context?.propertyId ?? "415410108"}. Confira também se GA4_PROPERTY_ID e GA4_CLIENT_EMAIL na Vercel batem com o JSON.`;
  }

  if (message.includes("NOT_FOUND") || message.includes("404")) {
    return `Propriedade GA4 não encontrada${hint}. Verifique se GA4_PROPERTY_ID=${context?.propertyId ?? "?"} está correto (numérico, sem prefixo G-).`;
  }

  return (message || "Não foi possível carregar os dados do Google Analytics.") + hint;
}
