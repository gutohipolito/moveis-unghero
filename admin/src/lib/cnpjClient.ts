import type { CnpjCompanyData } from "@/lib/cnpjLookup";
import { cleanCnpjDigits } from "@/lib/cnpjLookup";

export type { CnpjCompanyData };

/** Consulta CNPJ via proxy do admin (evita 403 da BrasilAPI no browser). */
export async function fetchCnpjCompany(
  cnpjValue: string
): Promise<{ ok: true; data: CnpjCompanyData } | { ok: false; error: string }> {
  const cnpj = cleanCnpjDigits(cnpjValue);
  if (cnpj.length !== 14) {
    return { ok: false, error: "Informe um CNPJ válido com 14 dígitos." };
  }

  try {
    const res = await fetch(`/api/public/cnpj/${cnpj}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const json = (await res.json()) as CnpjCompanyData & {
      success?: boolean;
      error?: string;
      message?: string;
    };

    if (!res.ok || json.success === false) {
      return {
        ok: false,
        error: json.error || json.message || "CNPJ não encontrado ou indisponível.",
      };
    }

    return {
      ok: true,
      data: {
        cnpj: json.cnpj || cnpj,
        razao_social: json.razao_social ?? null,
        nome_fantasia: json.nome_fantasia ?? null,
        email: json.email ?? null,
        cep: json.cep ?? null,
        logradouro: json.logradouro ?? null,
        numero: json.numero ?? null,
        complemento: json.complemento ?? null,
        bairro: json.bairro ?? null,
        municipio: json.municipio ?? null,
        uf: json.uf ?? null,
        ddd_telefone_1: json.ddd_telefone_1 ?? null,
      },
    };
  } catch {
    return { ok: false, error: "Não foi possível consultar o CNPJ agora." };
  }
}
