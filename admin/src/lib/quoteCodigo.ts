import { toISODateBR } from "@/lib/brazilDate";

/** Partículas ignoradas nas iniciais (ex.: "dos", "da"). */
const NAME_PARTICLES = new Set([
  "de",
  "da",
  "do",
  "dos",
  "das",
  "e",
  "di",
  "du",
  "del",
  "della",
  "van",
  "von",
]);

/**
 * Iniciais do nome do cliente, sem partículas.
 * "Danny Felipe Choinacki dos Santos" → "DFCS"
 */
export function clientNameInitials(nome: string): string {
  const cleaned = nome
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-zA-ZÀ-ÿ\s'-]/g, " ")
    .trim();

  if (!cleaned) return "ORC";

  const parts = cleaned.split(/\s+/).filter(Boolean);
  const letters = parts
    .filter((part) => !NAME_PARTICLES.has(part.toLowerCase()))
    .map((part) => part[0]!.toUpperCase())
    .join("");

  return (letters || "ORC").slice(0, 8);
}

/** DDMMYY no calendário de São Paulo. */
export function quoteDateCode(date: Date | string | number = new Date()): string {
  const iso = toISODateBR(date); // YYYY-MM-DD
  const [, month, day] = iso.split("-");
  const year = iso.slice(2, 4);
  return `${day}${month}${year}`;
}

/** Base do código: DFCS-060726 */
export function buildQuoteCodigoBase(clientName: string, date: Date | string | number = new Date()): string {
  return `${clientNameInitials(clientName)}-${quoteDateCode(date)}`;
}

/**
 * Código estável para exibição.
 * Preferência: campo persistido; fallback legado ORC-XXXXX.
 */
export function formatQuoteCodigo(
  quote: { id: string; codigo?: string | null },
): string {
  if (quote.codigo?.trim()) return quote.codigo.trim().toUpperCase();
  return `ORC-${quote.id.substring(0, 5).toUpperCase()}`;
}
