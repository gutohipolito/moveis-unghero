export type ViaCepAddress = {
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
};

/** Consulta ViaCEP. Retorna null se CEP inválido ou não encontrado. */
export async function fetchViaCep(cepValue: string): Promise<ViaCepAddress | null> {
  const clean = cepValue.replace(/\D/g, "");
  if (clean.length !== 8) return null;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      erro?: boolean;
      cep?: string;
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
    };
    if (json.erro) return null;

    return {
      cep: json.cep || clean,
      logradouro: json.logradouro || "",
      bairro: json.bairro || "",
      localidade: json.localidade || "",
      uf: (json.uf || "").toUpperCase(),
    };
  } catch {
    return null;
  }
}
