/** Validação de e-mail para formulários públicos. */

const EMAIL_RE =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

export function normalizeEmailInput(email: string): string {
  return email.trim().toLowerCase();
}

/** Formato básico RFC-like; rejeita espaços e domínio sem ponto. */
export function isValidEmail(email: string): boolean {
  const clean = normalizeEmailInput(email);
  if (!clean || clean.length > 254) return false;
  if (clean.includes("..")) return false;
  return EMAIL_RE.test(clean);
}

/** Vazio ok; se preenchido, precisa ser válido. */
export function validateOptionalEmail(email: string): string | null {
  const clean = normalizeEmailInput(email);
  if (!clean) return null;
  if (!isValidEmail(clean)) return "Informe um e-mail válido (ex: nome@empresa.com.br).";
  return null;
}

/** Obrigatório e válido. */
export function validateRequiredEmail(email: string): string | null {
  const clean = normalizeEmailInput(email);
  if (!clean) return "Informe um e-mail.";
  if (!isValidEmail(clean)) return "Informe um e-mail válido (ex: nome@empresa.com.br).";
  return null;
}
