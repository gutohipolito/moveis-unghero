export type TipoPessoa = "PF" | "PJ";

export interface ClientDocumentFields {
  tipo_pessoa?: TipoPessoa | null;
  cpf?: string | null;
  cnpj?: string | null;
  observacoes?: string | null;
}

/** Extrai PF/PJ e documento do prefixo legado em observacoes. */
export function parseLegacyDocumentFromObs(observacoes: string | null | undefined): {
  tipo_pessoa: TipoPessoa;
  cpf: string | null;
  cnpj: string | null;
  observacoes: string;
} {
  const obs = observacoes || "";
  const pfMatch = obs.match(/^\[PF - CPF:\s*([^\]]+)\]\s*/);
  if (pfMatch) {
    return {
      tipo_pessoa: "PF",
      cpf: pfMatch[1].trim(),
      cnpj: null,
      observacoes: obs.slice(pfMatch[0].length).trim(),
    };
  }

  const pjMatch = obs.match(/^\[PJ - CNPJ:\s*([^\]]+)\]\s*/);
  if (pjMatch) {
    return {
      tipo_pessoa: "PJ",
      cpf: null,
      cnpj: pjMatch[1].trim(),
      observacoes: obs.slice(pjMatch[0].length).trim(),
    };
  }

  return { tipo_pessoa: "PF", cpf: null, cnpj: null, observacoes: obs };
}

/** Resolve documento a partir dos campos estruturados ou do formato legado. */
export function resolveClientDocument(client: ClientDocumentFields) {
  const hasStructuredDoc =
    client.tipo_pessoa != null &&
    (Boolean(client.cpf?.trim()) || Boolean(client.cnpj?.trim()));

  if (hasStructuredDoc) {
    const tipo = client.tipo_pessoa as TipoPessoa;
    return {
      tipo_pessoa: tipo,
      cpf: client.cpf?.trim() || null,
      cnpj: client.cnpj?.trim() || null,
      observacoes: client.observacoes || "",
      documento: tipo === "PF" ? client.cpf?.trim() || "" : client.cnpj?.trim() || "",
    };
  }

  const legacy = parseLegacyDocumentFromObs(client.observacoes);
  const cnpj = legacy.cnpj || client.cnpj?.trim() || null;

  return {
    tipo_pessoa: legacy.tipo_pessoa,
    cpf: legacy.cpf,
    cnpj,
    observacoes: legacy.observacoes,
    documento:
      legacy.tipo_pessoa === "PF"
        ? legacy.cpf || ""
        : cnpj || "",
  };
}

export function labelTipoPessoa(tipo: TipoPessoa): string {
  return tipo === "PF" ? "Pessoa Física" : "Pessoa Jurídica";
}
