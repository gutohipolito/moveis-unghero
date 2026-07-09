import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Capitaliza de forma inteligente um texto/nome próprio,
 * transformando palavras em Title Case (com exceção de preposições em minúsculo).
 * Exemplos:
 * "JOÃO DA SILVA" -> "João da Silva"
 * "maria de souza" -> "Maria de Souza"
 * "FARROUPILHA" -> "Farroupilha"
 */
export function capitalizeText(text: string | null | undefined): string {
  if (!text) return "";
  
  const trimmed = text.trim();
  if (!trimmed) return "";

  // Preposições comuns em português que devem ficar em minúsculas
  const prepositions = new Set([
    "de", "di", "da", "do", "das", "dos", "e", "com", "em", "para"
  ]);

  return trimmed
    .split(/\s+/)
    .map((word, index, array) => {
      const lowerWord = word.toLowerCase();
      
      // Se for uma preposição e não for a primeira nem a última palavra, mantém minúscula
      if (prepositions.has(lowerWord) && index > 0 && index < array.length - 1) {
        return lowerWord;
      }
      
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}
