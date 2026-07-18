/** Placeholder padrão para campos de telefone no dashboard. */
export const PHONE_PLACEHOLDER = "(xx) xxxxx-xxxx";

/** Máscara brasileira (XX) XXXXX-XXXX enquanto o usuário digita. */
export function formatPhoneInput(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.length > 11) digits = digits.slice(0, 11);

  if (digits.length > 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length > 2) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length > 0) {
    return `(${digits}`;
  }
  return "";
}

/** Formata telefone salvo (só dígitos ou parcial) para exibição. */
export function formatPhoneDisplay(telefone: string): string {
  const digits = telefone.replace(/\D/g, "");
  if (!digits) return telefone;
  return formatPhoneInput(digits) || telefone;
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
