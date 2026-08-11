/** Documentos e CEP brasileiros — máscaras + validação (dígitos verificadores). */

export const CPF_PLACEHOLDER = "xxx.xxx.xxx-xx";
export const CNPJ_PLACEHOLDER = "xx.xxx.xxx/xxxx-xx";
export const CEP_PLACEHOLDER = "xxxxx-xxx";
/** CAU nacional: letra + 6 dígitos (ex.: A123456). Aceita DV opcional A123456-7. */
export const CAU_PLACEHOLDER = "A000000";
/** CREA típico com sufixo de categoria (ex.: 123456-D). */
export const CREA_PLACEHOLDER = "000000-D";
export const CAU_MAX_LENGTH = 9; // A123456-7
export const CREA_MAX_LENGTH = 16;

export const FORM_FIELD_LIMITS = {
  nome: 120,
  email: 254,
  telefone: 20,
  observacoes: 2000,
  endereco: 200,
  numero: 20,
  bairro: 80,
  cidade: 80,
  escritorio: 120,
  portfolioUrl: 500,
  registroProfissional: 40,
  origem: 80,
} as const;

export function cleanDigits(value: string, max?: number): string {
  const digits = value.replace(/\D/g, "");
  return typeof max === "number" ? digits.slice(0, max) : digits;
}

export function cleanCpfDigits(cpf: string): string {
  return cleanDigits(cpf, 11);
}

export function cleanCnpjDigits(cnpj: string): string {
  return cleanDigits(cnpj, 14);
}

export function cleanCepDigits(cep: string): string {
  return cleanDigits(cep, 8);
}

/** Máscara progressiva: 000.000.000-00 */
export function formatCpfInput(value: string): string {
  const d = cleanCpfDigits(value);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Máscara progressiva: 00.000.000/0000-00 */
export function formatCnpjInput(value: string): string {
  const d = cleanCnpjDigits(value);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) {
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  }
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/** Máscara progressiva: 00000-000 */
export function formatCepInput(value: string): string {
  const d = cleanCepDigits(value);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function calcCheckDigit(digits: string, weights: number[]): number {
  const sum = digits
    .split("")
    .reduce((acc, digit, i) => acc + Number(digit) * (weights[i] || 0), 0);
  const mod = sum % 11;
  return mod < 2 ? 0 : 11 - mod;
}

/** CPF completo com dígitos verificadores (rejeita sequências 000… / 111…). */
export function isValidCpf(cpf: string): boolean {
  const d = cleanCpfDigits(cpf);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;

  const w1 = [10, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = calcCheckDigit(d.slice(0, 9), w1);
  const d2 = calcCheckDigit(d.slice(0, 9) + String(d1), w2);
  return d.endsWith(`${d1}${d2}`);
}

/** CNPJ completo com dígitos verificadores. */
export function isValidCnpj(cnpj: string): boolean {
  const d = cleanCnpjDigits(cnpj);
  if (d.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(d)) return false;

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = calcCheckDigit(d.slice(0, 12), w1);
  const d2 = calcCheckDigit(d.slice(0, 12) + String(d1), w2);
  return d.endsWith(`${d1}${d2}`);
}

export function isValidCep(cep: string): boolean {
  return cleanCepDigits(cep).length === 8;
}

/** Documento opcional: vazio ok; se houver dígitos, precisa estar completo e válido. */
export function validateOptionalCpf(cpf: string): string | null {
  const d = cleanCpfDigits(cpf);
  if (!d) return null;
  if (d.length < 11) return "CPF incompleto. Use o formato 000.000.000-00.";
  if (!isValidCpf(d)) return "Informe um CPF válido.";
  return null;
}

export function validateOptionalCnpj(cnpj: string): string | null {
  const d = cleanCnpjDigits(cnpj);
  if (!d) return null;
  if (d.length < 14) return "CNPJ incompleto. Use o formato 00.000.000/0000-00.";
  if (!isValidCnpj(d)) return "Informe um CNPJ válido.";
  return null;
}

export function validateOptionalCep(cep: string): string | null {
  const d = cleanCepDigits(cep);
  if (!d) return null;
  if (!isValidCep(d)) return "Informe um CEP válido com 8 dígitos.";
  return null;
}

export function truncateField(value: string, max: number): string {
  return value.trim().slice(0, max);
}

/** Remove espaços extras e uppercasa o registro profissional. */
export function normalizeRegistroProfissional(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase()
    .slice(0, FORM_FIELD_LIMITS.registroProfissional);
}

/**
 * Máscara progressiva do CAU: letra + até 6 dígitos; 7º dígito vira DV com hífen.
 * Ex.: A → A1 → A123456 → A123456-7
 * Se o usuário digitar só números, prefixa "A" (padrão nacional).
 */
export function formatCauInput(value: string): string {
  const upper = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  let letter = "";
  let digits = "";
  for (const ch of upper) {
    if (!letter && /[A-Z]/.test(ch)) {
      letter = ch;
      continue;
    }
    if (/\d/.test(ch) && digits.length < 7) digits += ch;
  }
  if (!digits && !letter) return "";
  if (!letter && digits) letter = "A";
  if (digits.length <= 6) return `${letter}${digits}`;
  return `${letter}${digits.slice(0, 6)}-${digits.slice(6)}`;
}

/**
 * Máscara progressiva do CREA: dígitos + sufixo opcional (letra) com hífen.
 * Ex.: 123456 → 123456-D
 */
export function formatCreaInput(value: string): string {
  const upper = value.toUpperCase().replace(/[^0-9A-Z.\-/]/g, "");
  const digits = upper.replace(/\D/g, "").slice(0, 10);
  const suffixMatch = upper.match(/[A-Z](?!.*[A-Z])/);
  const suffix = suffixMatch?.[0] ?? "";
  if (!digits && !suffix) return "";
  if (!suffix) return digits.slice(0, CREA_MAX_LENGTH);
  if (!digits) return suffix;
  return `${digits}-${suffix}`.slice(0, CREA_MAX_LENGTH);
}

export function formatRegistroProfissionalInput(
  tipo: "ARQUITETO" | "ENGENHEIRO" | string,
  value: string
): string {
  if (tipo === "ARQUITETO") return formatCauInput(value);
  if (tipo === "ENGENHEIRO") return formatCreaInput(value);
  return value
    .toUpperCase()
    .replace(/\s+/g, "")
    .slice(0, FORM_FIELD_LIMITS.registroProfissional);
}

export function registroProfissionalMaxLength(
  tipo: "ARQUITETO" | "ENGENHEIRO" | string
): number {
  if (tipo === "ARQUITETO") return CAU_MAX_LENGTH;
  if (tipo === "ENGENHEIRO") return CREA_MAX_LENGTH;
  return FORM_FIELD_LIMITS.registroProfissional;
}

export function registroProfissionalPlaceholder(
  tipo: "ARQUITETO" | "ENGENHEIRO" | string
): string {
  if (tipo === "ARQUITETO") return CAU_PLACEHOLDER;
  if (tipo === "ENGENHEIRO") return CREA_PLACEHOLDER;
  return "CAU, CREA ou ABD (se houver)";
}

/**
 * CAU nacional: A + 6 dígitos. Aceita legado com DV (A123456-7 / 123456-0).
 */
export function isValidCau(value: string): boolean {
  const n = normalizeRegistroProfissional(value);
  if (n.length < 5 || n.length > CAU_MAX_LENGTH) return false;
  if (/^[A-Z]\d{6}$/.test(n)) return true;
  return /^[A-Z]?\d{4,7}-?\d$/i.test(n);
}

/**
 * CREA típico: sequência numérica com hífen/ponto/sufixo (ex.: 123456-D, 12.3456-D).
 */
export function isValidCrea(value: string): boolean {
  const n = normalizeRegistroProfissional(value);
  if (n.length < 5 || n.length > CREA_MAX_LENGTH) return false;
  const compact = n.replace(/[.\-/]/g, "");
  if (compact.length < 5) return false;
  return /^[\dA-Z.\-/]+$/i.test(n) && /\d{4,}/.test(compact);
}

/** Valida registro conforme tipo; vazio só é erro quando obrigatório. */
export function validatePartnerRegistro(
  tipo: "ARQUITETO" | "ENGENHEIRO" | string,
  value: string,
  opts?: { required?: boolean }
): string | null {
  const raw = value.trim();
  const required =
    opts?.required ?? (tipo === "ARQUITETO" || tipo === "ENGENHEIRO");

  if (!raw) {
    if (!required) return null;
      if (tipo === "ARQUITETO") return `Informe o registro CAU (ex.: ${CAU_PLACEHOLDER}).`;
    if (tipo === "ENGENHEIRO") return `Informe o registro CREA (ex.: ${CREA_PLACEHOLDER}).`;
    return "Informe o registro profissional.";
  }

  if (tipo === "ARQUITETO" && !isValidCau(raw)) {
    return `CAU inválido. Use o formato ${CAU_PLACEHOLDER} (letra + 6 dígitos).`;
  }
  if (tipo === "ENGENHEIRO" && !isValidCrea(raw)) {
    return `CREA inválido. Informe o número completo (ex.: ${CREA_PLACEHOLDER}).`;
  }

  const maxLen = registroProfissionalMaxLength(tipo);
  if (raw.length > maxLen) {
    return `Registro deve ter no máximo ${maxLen} caracteres.`;
  }

  return null;
}
