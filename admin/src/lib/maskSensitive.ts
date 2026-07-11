/** Máscaras para ocultar dados sensíveis de contato/documento na UI. */

const DOT = "•";

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
