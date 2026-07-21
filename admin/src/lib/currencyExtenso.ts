/** Converte valor monetário para extenso em português (pt-BR). */

const UNIDADES = [
  "",
  "um",
  "dois",
  "três",
  "quatro",
  "cinco",
  "seis",
  "sete",
  "oito",
  "nove",
  "dez",
  "onze",
  "doze",
  "treze",
  "quatorze",
  "quinze",
  "dezesseis",
  "dezessete",
  "dezoito",
  "dezenove",
];

const DEZENAS = [
  "",
  "",
  "vinte",
  "trinta",
  "quarenta",
  "cinquenta",
  "sessenta",
  "setenta",
  "oitenta",
  "noventa",
];

const CENTENAS = [
  "",
  "cento",
  "duzentos",
  "trezentos",
  "quatrocentos",
  "quinhentos",
  "seiscentos",
  "setecentos",
  "oitocentos",
  "novecentos",
];

function underThousand(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  if (n < 20) return UNIDADES[n];

  const c = Math.floor(n / 100);
  const d = Math.floor((n % 100) / 10);
  const u = n % 10;
  const rest = n % 100;

  const parts: string[] = [];
  if (c > 0) parts.push(CENTENAS[c]);

  if (rest > 0) {
    if (rest < 20) {
      parts.push(UNIDADES[rest]);
    } else {
      parts.push(DEZENAS[d] + (u > 0 ? ` e ${UNIDADES[u]}` : ""));
    }
  }

  return parts.join(" e ");
}

function integerToWords(n: number): string {
  if (n === 0) return "zero";

  const billions = Math.floor(n / 1_000_000_000);
  const millions = Math.floor((n % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1_000);
  const rest = n % 1_000;

  const parts: string[] = [];

  if (billions > 0) {
    parts.push(
      billions === 1 ? "um bilhão" : `${underThousand(billions)} bilhões`
    );
  }
  if (millions > 0) {
    parts.push(
      millions === 1 ? "um milhão" : `${underThousand(millions)} milhões`
    );
  }
  if (thousands > 0) {
    parts.push(thousands === 1 ? "mil" : `${underThousand(thousands)} mil`);
  }
  if (rest > 0) {
    parts.push(underThousand(rest));
  }

  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} e ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")} e ${parts[parts.length - 1]}`;
}

/** Ex.: 1250.5 → "mil e duzentos e cinquenta reais e cinquenta centavos" */
export function currencyToExtenso(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "";

  const rounded = Math.round(value * 100) / 100;
  const intPart = Math.floor(rounded);
  const cents = Math.round((rounded - intPart) * 100);

  let result = "";
  if (intPart === 0 && cents === 0) {
    result = "zero reais";
  } else if (intPart === 0) {
    result = "";
  } else if (intPart === 1) {
    result = "um real";
  } else {
    result = `${integerToWords(intPart)} reais`;
  }

  if (cents > 0) {
    const centsWords =
      cents === 1 ? "um centavo" : `${integerToWords(cents)} centavos`;
    result = result ? `${result} e ${centsWords}` : centsWords;
  }

  return result;
}

export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDocumentLabel(raw: string, tipoPessoa?: "PF" | "PJ" | string | null): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";

  if (tipoPessoa === "PJ" || digits.length === 14) {
    const m = digits.padStart(14, "0").slice(-14);
    return `CNPJ ${m.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")}`;
  }
  if (tipoPessoa === "PF" || digits.length === 11) {
    const m = digits.padStart(11, "0").slice(-11);
    return `CPF ${m.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4")}`;
  }
  return raw.trim();
}
