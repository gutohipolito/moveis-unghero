import { capitalizeText } from "@/lib/utils";

/** Cidades da Serra Gaúcha (e vizinhas frequentes na operação Unghero). */
export const CIDADES_SERRA_GAUCHA = [
  "Farroupilha",
  "Caxias do Sul",
  "Bento Gonçalves",
  "Garibaldi",
  "Carlos Barbosa",
  "Flores da Cunha",
  "Nova Roma do Sul",
  "Pinto Bandeira",
  "Veranópolis",
  "Nova Petrópolis",
  "Gramado",
  "Canela",
  "Ivoti",
  "São Sebastião do Caí",
  "Feliz",
  "Bom Princípio",
] as const;

export const CIDADE_OUTRA_VALUE = "__outra__";

/** Bairros canônicos de Farroupilha (com acento). */
export const BAIRROS_FARROUPILHA = [
  "América",
  "Belvedere",
  "Bela Vista",
  "Caravaggio",
  "Centenário",
  "Centro",
  "Cinquentenário",
  "Colonial",
  "Cruzeiro",
  "Do Park",
  "Imigrante",
  "Industrial",
  "Ipanema",
  "Medianeira",
  "Milano",
  "Monte Pascoal",
  "Morada do Sol",
  "Nova Milano",
  "Nova Vicenza",
  "Pio X",
  "Planalto",
  "Primeiro de Maio",
  "Santa Catarina",
  "Santo Antônio",
  "São Francisco",
  "São José",
  "São Luiz",
  "Vicentina",
  "Volta Grande",
] as const;

/** UF só conta se vier após espaço ou separador — evita cortar "Gonçalves" (…ES). */
const UF_SUFFIX =
  /(?:\s+|[-–,\/]\s*)(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\s*$/i;

export function foldAccents(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function isFarroupilhaCity(cidade: string | null | undefined): boolean {
  return foldAccents(cidade || "") === "farroupilha";
}

/** Separa "Farroupilha Rs" / "Farroupilha - RS" em cidade + UF. */
export function splitCityAndUf(raw: string | null | undefined): {
  cidade: string;
  uf: string | null;
} {
  const trimmed = (raw || "").trim();
  if (!trimmed) return { cidade: "", uf: null };

  const match = trimmed.match(UF_SUFFIX);
  if (!match) return { cidade: trimmed, uf: null };

  const uf = match[1].toUpperCase();
  const cidade = trimmed.slice(0, match.index).trim().replace(/[,\-–—/]+$/, "").trim();
  return { cidade: cidade || trimmed, uf };
}

function matchCanonical(raw: string, list: readonly string[]): string | null {
  const folded = foldAccents(raw);
  if (!folded) return null;
  return list.find((item) => foldAccents(item) === folded) ?? null;
}

/** Normaliza cidade: tira UF colada, Title Case e acento canônico da Serra. */
export function normalizeCidade(raw: string | null | undefined): {
  cidade: string;
  ufFromCity: string | null;
} {
  const { cidade: splitCity, uf } = splitCityAndUf(raw);
  if (!splitCity) return { cidade: "", ufFromCity: uf };

  const canon = matchCanonical(splitCity, CIDADES_SERRA_GAUCHA);
  return {
    cidade: canon || capitalizeText(splitCity),
    ufFromCity: uf,
  };
}

/** Normaliza bairro: Title Case + acento canônico quando cidade for Farroupilha. */
export function normalizeBairro(
  raw: string | null | undefined,
  cidade?: string | null
): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "";

  if (isFarroupilhaCity(cidade)) {
    const canon = matchCanonical(trimmed, BAIRROS_FARROUPILHA);
    if (canon) return canon;
  }

  return capitalizeText(trimmed);
}

export function normalizeUf(
  uf: string | null | undefined,
  ufFromCity?: string | null
): string | null {
  const fromField = (uf || "").replace(/\s+/g, "").toUpperCase().slice(0, 2);
  if (fromField.length === 2) return fromField;
  if (ufFromCity && ufFromCity.length === 2) return ufFromCity;
  return null;
}

/**
 * Pacote único para salvar endereço em actions/scripts.
 * Mantém campos vazios como string vazia / null conforme o caller preferir.
 */
export function normalizeAddressFields(input: {
  cidade?: string | null;
  bairro?: string | null;
  uf?: string | null;
  endereco?: string | null;
}): {
  cidade: string;
  bairro: string;
  uf: string | null;
  endereco: string;
} {
  const { cidade, ufFromCity } = normalizeCidade(input.cidade);
  const bairro = normalizeBairro(input.bairro, cidade);
  const uf = normalizeUf(input.uf, ufFromCity);
  const endereco = input.endereco?.trim() ? capitalizeText(input.endereco) : "";

  return { cidade, bairro, uf, endereco };
}

export function citySelectValue(cidade: string): string {
  if (!cidade) return "";
  const canon = matchCanonical(cidade, CIDADES_SERRA_GAUCHA);
  return canon || CIDADE_OUTRA_VALUE;
}

export function bairroSuggestionsForCity(cidade: string): string[] {
  if (isFarroupilhaCity(cidade)) return [...BAIRROS_FARROUPILHA];
  return [];
}
