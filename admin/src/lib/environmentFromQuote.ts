import type { EnvironmentType } from "@prisma/client";

/** Infere o tipo de ambiente a partir do nome do item do orçamento. */
export function inferEnvironmentTypeFromName(nome: string): EnvironmentType {
  const n = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (/cozin|gourmet/.test(n)) return "COZINHA";
  if (/closet|guarda.?roupa|roupeiro/.test(n)) return "CLOSET";
  if (/dormit|quarto|suite|infantil|casal/.test(n)) return "DORMITORIO";
  if (/banheiro|lavabo|\bwc\b/.test(n)) return "BANHEIRO";
  return "OUTROS";
}
