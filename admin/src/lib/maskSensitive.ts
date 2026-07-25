/** Máscaras para ocultar dados sensíveis de contato/documento na UI. */

const DOT = "•";

/** Valores monetários em texto livre (ex.: histórico de eventos). */
const MONEY_IN_TEXT_RE =
  /R\$\s*\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|R\$\s*\d+(?:,\d{1,2})?/gi;

/** E-mails em texto livre. */
const EMAIL_IN_TEXT_RE =
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

/**
 * Telefones BR comuns em texto (com ou sem +55 / DDD).
 * Conservador o bastante para não mascarar datas (dd/mm/aaaa).
 */
const PHONE_IN_TEXT_RE =
  /(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?(?:9\s*)?\d{4}[-\s]?\d{4}/g;

/** Oculta a primeira parte do telefone, mantendo apenas os 4 últimos dígitos. */
export function maskPhone(telefone: string | null | undefined): string {
  const digits = (telefone || "").replace(/\D/g, "");
  if (!digits) return `(${DOT}${DOT}) ${DOT.repeat(5)}-${DOT.repeat(4)}`;
  const last = digits.slice(-4).padStart(4, DOT);
  return `(${DOT}${DOT}) ${DOT.repeat(5)}-${last}`;
}

/** Oculta o e-mail mantendo a inicial e o domínio de topo (ex.: "d•••@•••.com"). */
export function maskEmail(email: string | null | undefined): string {
  const value = (email || "").trim();
  if (!value || !value.includes("@")) return `${DOT.repeat(5)}@${DOT.repeat(3)}`;
  const [local, domain] = value.split("@");
  const localMasked = (local.charAt(0) || DOT) + DOT.repeat(3);
  const parts = domain.split(".");
  const tld = parts.length > 1 ? parts[parts.length - 1] : "";
  return `${localMasked}@${DOT.repeat(3)}${tld ? "." + tld : ""}`;
}

/** Oculta CPF/CNPJ mantendo o formato e apenas os 2 últimos dígitos. */
export function maskDocument(doc: string | null | undefined): string {
  const value = (doc || "").trim();
  if (!value) return "";
  const chars = value.split("");
  const digitPositions = chars
    .map((c, i) => (/\d/.test(c) ? i : -1))
    .filter((i) => i >= 0);
  const keep = new Set(digitPositions.slice(-2));
  return chars.map((c, i) => (/\d/.test(c) && !keep.has(i) ? DOT : c)).join("");
}

/**
 * Mascara valores sensíveis embutidos em texto livre (timeline, logs, etc.).
 * Usado quando o olho de privacidade está fechado / conta VIEWER.
 */
export function maskSensitiveInText(
  text: string | null | undefined,
  options?: { money?: boolean; contact?: boolean }
): string {
  if (!text) return "";
  const money = options?.money !== false;
  const contact = options?.contact !== false;
  let out = text;
  if (money) {
    out = out.replace(MONEY_IN_TEXT_RE, "R$ •••••");
  }
  if (contact) {
    out = out.replace(EMAIL_IN_TEXT_RE, (m) => maskEmail(m));
    out = out.replace(PHONE_IN_TEXT_RE, (m) => {
      const digits = m.replace(/\D/g, "");
      // Evita mascarar sequências curtas / anos isolados
      if (digits.length < 10) return m;
      return maskPhone(m);
    });
  }
  return out;
}
