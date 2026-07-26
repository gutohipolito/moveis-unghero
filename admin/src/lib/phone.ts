/** Placeholder padrão para campos de telefone no dashboard. */
export const PHONE_PLACEHOLDER = "(xx) xxxx-xxxx";

/**
 * Máscara brasileira inteligente:
 * - até 10 dígitos → fixo (XX) XXXX-XXXX
 * - 11 dígitos → celular (XX) XXXXX-XXXX
 */
export function formatPhoneInput(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.length > 11) digits = digits.slice(0, 11);

  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;

  const ddd = digits.slice(0, 2);
  const local = digits.slice(2);

  // Celular: DDD + 9 dígitos
  if (digits.length > 10) {
    return `(${ddd}) ${local.slice(0, 5)}-${local.slice(5)}`;
  }

  // Fixo (e digitação progressiva até 10): DDD + até 8 dígitos
  if (local.length > 4) {
    return `(${ddd}) ${local.slice(0, 4)}-${local.slice(4)}`;
  }
  return `(${ddd}) ${local}`;
}

/** Formata telefone salvo (só dígitos ou parcial) para exibição. */
export function formatPhoneDisplay(telefone: string): string {
  const digits = telefone.replace(/\D/g, "");
  if (!digits) return telefone;
  return formatPhoneInput(digits) || telefone;
}

/** DDD + número local: 10 (fixo) ou 11 (celular). */
export function isValidBrPhoneDigits(telefone: string): boolean {
  const digits = telefone.replace(/\D/g, "");
  const local = digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
  return local.length === 10 || local.length === 11;
}

/** Heurística: celular costuma ter 11 dígitos (9 na frente do número local). */
export function isLikelyMobilePhone(telefone: string): boolean {
  const digits = telefone.replace(/\D/g, "");
  const local = digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
  return local.length === 11;
}

/** Dígitos nacionais (sem +55), mantendo DDD + número local. */
export function normalizeBrPhoneDigits(telefone: string): string {
  const digits = telefone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55") && digits.length >= 12) return digits.slice(2);
  return digits;
}

/**
 * Senha do orçamento público: últimos 4 dígitos do telefone cadastrado.
 * Retorna null se não houver dígitos suficientes.
 */
export function getPhoneLastFourDigits(telefone: string): string | null {
  const digits = normalizeBrPhoneDigits(telefone);
  if (digits.length < 4) return null;
  return digits.slice(-4);
}

/** Oculta os últimos `count` dígitos do telefone (mantém o restante da formatação). */
export function maskPhoneLastDigits(telefone: string, count = 4): string {
  if (!telefone) return telefone;
  let remaining = count;
  let out = "";
  for (let i = telefone.length - 1; i >= 0; i--) {
    const ch = telefone[i];
    if (/\d/.test(ch) && remaining > 0) {
      out = "•" + out;
      remaining -= 1;
    } else {
      out = ch + out;
    }
  }
  return out;
}
