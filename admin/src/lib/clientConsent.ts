/** Helpers de consentimento LGPD / marketing e limpeza de e-mail do formulário. */

export type ClientConsent = {
  lgpdAceite: boolean;
  lgpdAceiteEm: string | null; // ISO ou dd/mm/yyyy legível
  marketingAceite: boolean;
};

const CONSENT_BLOCK_RE =
  /\n*\s*---\s*Consentimentos LGPD[^\n]*---[\s\S]*$/i;

/** Remove o bloco de consentimento impresso nas observações (legado). */
export function stripConsentFromObservacoes(obs: string | null | undefined): string {
  if (!obs) return "";
  return obs.replace(CONSENT_BLOCK_RE, "").trim();
}

/** Extrai consentimento do texto legado nas observações. */
export function parseConsentFromObservacoes(
  obs: string | null | undefined
): ClientConsent {
  const text = obs || "";
  const lgpdAceite = /\[LGPD\][^\n]*:\s*SIM/i.test(text);
  const marketingAceite = /\[Marketing\][^\n]*:\s*SIM/i.test(text);
  const dateMatch = text.match(/\[LGPD\][^\n]*SIM\s*\((\d{2}\/\d{2}\/\d{4})\)/i);
  return {
    lgpdAceite,
    lgpdAceiteEm: dateMatch?.[1] ?? null,
    marketingAceite,
  };
}

/**
 * Resolve o consentimento priorizando campos estruturados; cai no parse
 * das observações para cadastros antigos.
 */
export function resolveClientConsent(input: {
  lgpd_aceite?: boolean | null;
  lgpd_aceite_em?: Date | string | null;
  marketing_aceite?: boolean | null;
  observacoes?: string | null;
}): ClientConsent {
  const hasStructured =
    typeof input.lgpd_aceite === "boolean" ||
    typeof input.marketing_aceite === "boolean";

  if (hasStructured) {
    let lgpdAceiteEm: string | null = null;
    if (input.lgpd_aceite_em) {
      const d =
        input.lgpd_aceite_em instanceof Date
          ? input.lgpd_aceite_em
          : new Date(input.lgpd_aceite_em);
      if (!Number.isNaN(d.getTime())) {
        lgpdAceiteEm = d.toLocaleDateString("pt-BR");
      }
    }
    return {
      lgpdAceite: Boolean(input.lgpd_aceite),
      lgpdAceiteEm,
      marketingAceite: Boolean(input.marketing_aceite),
    };
  }

  return parseConsentFromObservacoes(input.observacoes);
}

/**
 * Remove a etiqueta "+unghero" injetada por gerenciadores de senha /
 * autocomplete com plus-addressing baseado no domínio da marca.
 * Ex.: dannyfelipe+unghero@gmail.com → dannyfelipe@gmail.com
 */
export function sanitizePublicClientEmail(email: string | null | undefined): string {
  const raw = (email || "").trim().toLowerCase();
  if (!raw || !raw.includes("@")) return raw;
  return raw.replace(/\+unghero(?=@)/gi, "");
}
