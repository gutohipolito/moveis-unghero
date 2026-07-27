/** Dados normalizados de consulta CNPJ (formato compatível com BrasilAPI). */
export type CnpjCompanyData = {
  cnpj: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  email: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
  ddd_telefone_1: string | null;
};

export function cleanCnpjDigits(cnpj: string): string {
  return cnpj.replace(/\D/g, "").slice(0, 14);
}

export function isValidCnpjLength(cnpj: string): boolean {
  return cleanCnpjDigits(cnpj).length === 14;
}

function pickString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function digitsOnly(value: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits || null;
}

/** Normaliza respostas de BrasilAPI / ReceitaWS / CNPJ.ws para um formato único. */
export function normalizeCnpjPayload(raw: Record<string, unknown>): CnpjCompanyData | null {
  // BrasilAPI
  if (raw.razao_social || raw.nome_fantasia || raw.cnpj) {
    const cnpj = digitsOnly(pickString(raw.cnpj)) || "";
    if (cnpj.length === 14 || raw.razao_social || raw.nome_fantasia) {
      return {
        cnpj: cnpj || "",
        razao_social: pickString(raw.razao_social),
        nome_fantasia: pickString(raw.nome_fantasia),
        email: pickString(raw.email)?.toLowerCase() || null,
        cep: digitsOnly(pickString(raw.cep)),
        logradouro: pickString(raw.logradouro),
        numero: pickString(raw.numero),
        complemento: pickString(raw.complemento),
        bairro: pickString(raw.bairro),
        municipio: pickString(raw.municipio),
        uf: pickString(raw.uf)?.toUpperCase() || null,
        ddd_telefone_1: digitsOnly(pickString(raw.ddd_telefone_1)),
      };
    }
  }

  // ReceitaWS
  if (raw.nome || raw.fantasia) {
    const cnpj = digitsOnly(pickString(raw.cnpj)) || "";
    const tel = pickString(raw.telefone);
    return {
      cnpj,
      razao_social: pickString(raw.nome),
      nome_fantasia: pickString(raw.fantasia),
      email: pickString(raw.email)?.toLowerCase() || null,
      cep: digitsOnly(pickString(raw.cep)),
      logradouro: pickString(raw.logradouro),
      numero: pickString(raw.numero),
      complemento: pickString(raw.complemento),
      bairro: pickString(raw.bairro),
      municipio: pickString(raw.municipio),
      uf: pickString(raw.uf)?.toUpperCase() || null,
      ddd_telefone_1: digitsOnly(tel),
    };
  }

  // publica.cnpj.ws
  const estabelecimento =
    raw.estabelecimento && typeof raw.estabelecimento === "object"
      ? (raw.estabelecimento as Record<string, unknown>)
      : null;
  if (estabelecimento || raw.razao_social) {
    const ddd = pickString(estabelecimento?.ddd1);
    const tel = pickString(estabelecimento?.telefone1);
    const cnpj =
      digitsOnly(pickString(estabelecimento?.cnpj)) ||
      digitsOnly(
        `${pickString(raw.cnpj_raiz) || ""}${pickString(estabelecimento?.cnpj_ordem) || ""}${pickString(estabelecimento?.cnpj_digito_verificador) || ""}`
      ) ||
      "";
    return {
      cnpj,
      razao_social: pickString(raw.razao_social),
      nome_fantasia: pickString(estabelecimento?.nome_fantasia),
      email: pickString(estabelecimento?.email)?.toLowerCase() || null,
      cep: digitsOnly(pickString(estabelecimento?.cep)),
      logradouro: pickString(estabelecimento?.logradouro),
      numero: pickString(estabelecimento?.numero),
      complemento: pickString(estabelecimento?.complemento),
      bairro: pickString(estabelecimento?.bairro),
      municipio: pickString(
        (estabelecimento?.cidade as { nome?: string } | undefined)?.nome
      ),
      uf: pickString((estabelecimento?.estado as { sigla?: string } | undefined)?.sigla)?.toUpperCase() || null,
      ddd_telefone_1: digitsOnly(ddd && tel ? `${ddd}${tel}` : tel),
    };
  }

  return null;
}

async function fetchJson(
  url: string,
  init?: RequestInit
): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (compatible; MoveisUngheroBot/1.0; +https://moveisunghero.com.br)",
        ...(init?.headers || {}),
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as unknown;
    if (!data || typeof data !== "object") return null;
    return data as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Consulta CNPJ no servidor (evita 403 da BrasilAPI no browser).
 * Tenta BrasilAPI → ReceitaWS → CNPJ.ws.
 */
export async function lookupCnpjServer(cnpjInput: string): Promise<{
  ok: true;
  data: CnpjCompanyData;
} | {
  ok: false;
  error: string;
}> {
  const cnpj = cleanCnpjDigits(cnpjInput);
  if (cnpj.length !== 14) {
    return { ok: false, error: "Informe um CNPJ válido com 14 dígitos." };
  }

  const sources = [
    `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`,
    `https://www.receitaws.com.br/v1/cnpj/${cnpj}`,
    `https://publica.cnpj.ws/cnpj/${cnpj}`,
  ];

  for (const url of sources) {
    const raw = await fetchJson(url);
    if (!raw) continue;
    if (typeof raw.status === "string" && raw.status.toUpperCase() === "ERROR") continue;
    if (typeof raw.message === "string" && raw.message && !raw.razao_social && !raw.nome) {
      continue;
    }
    const normalized = normalizeCnpjPayload(raw);
    if (normalized && (normalized.razao_social || normalized.nome_fantasia)) {
      return {
        ok: true,
        data: {
          ...normalized,
          cnpj: normalized.cnpj || cnpj,
        },
      };
    }
  }

  return { ok: false, error: "CNPJ não encontrado ou indisponível no momento." };
}
