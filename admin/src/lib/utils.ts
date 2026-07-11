import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Preposições comuns em português que devem ficar em minúsculas no meio do texto
const CAPITALIZE_PREPOSITIONS = new Set([
  "de", "di", "da", "do", "das", "dos", "e", "com", "sem", "por", "sob", "em", "para",
]);

// Siglas/acrônimos que devem permanecer em MAIÚSCULAS (comuns em marcenaria/produtos)
const CAPITALIZE_ACRONYMS = new Set([
  "MDF", "MDP", "PVC", "LED", "CNC", "ABS", "TX", "LX", "HD", "UV",
  "CPF", "CNPJ", "RG", "CEP", "UF", "ME", "EPP", "EIRELI",
]);

/**
 * Capitaliza de forma inteligente um texto/nome próprio,
 * transformando palavras em Title Case (com exceção de preposições em minúsculo).
 * Preserva siglas conhecidas (MDF, PVC, ...) e tokens técnicos com números (18mm, RO47).
 * Exemplos:
 * "JOÃO DA SILVA" -> "João da Silva"
 * "maria de souza" -> "Maria de Souza"
 * "CHAPA BRANCA TX 18mm" -> "Chapa Branca TX 18mm"
 * "chapas mdf" -> "Chapas MDF"
 */
export function capitalizeText(text: string | null | undefined): string {
  if (!text) return "";

  const trimmed = text.trim();
  if (!trimmed) return "";

  return trimmed
    .split(/\s+/)
    .map((word, index, array) => {
      const lowerWord = word.toLowerCase();
      const upperWord = word.toUpperCase();

      // Mantém tokens técnicos que contêm números (ex.: "18mm", "3,5x16mm", "RO47")
      if (/\d/.test(word)) {
        return word;
      }

      // Mantém siglas conhecidas em maiúsculas
      if (CAPITALIZE_ACRONYMS.has(upperWord)) {
        return upperWord;
      }

      // Preposição no meio do texto fica minúscula
      if (CAPITALIZE_PREPOSITIONS.has(lowerWord) && index > 0 && index < array.length - 1) {
        return lowerWord;
      }

      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}
