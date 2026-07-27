import { prisma } from "@/lib/prisma";

export const RECEIPT_SHORT_PATH = "/r";

const SHARE_CODE_ALPHABET = "abcdefghijkmnopqrstuvwxyz23456789";

export function getReceiptShortBaseUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_RECEIPT_SHORT_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  const quoteBase = process.env.NEXT_PUBLIC_QUOTE_PDF_SHORT_URL?.replace(/\/$/, "");
  if (quoteBase) return quoteBase;

  return "https://moveisunghero.com.br";
}

export function buildReceiptShortUrl(code: string) {
  return `${getReceiptShortBaseUrl()}${RECEIPT_SHORT_PATH}/${code}`;
}

/** 12 caracteres (~60 bits) para reduzir risco de descoberta do link público. */
export function generateReceiptShareCode(length = 12) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => SHARE_CODE_ALPHABET[byte % SHARE_CODE_ALPHABET.length]).join(
    ""
  );
}

export async function generateUniqueReceiptShareCode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateReceiptShareCode();
    const existing = await prisma.paymentReceipt.findFirst({
      where: { share_code: code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  throw new Error("Não foi possível gerar um código único para o link do recibo.");
}

export async function ensureReceiptShareCode(receiptId: string) {
  const receipt = await prisma.paymentReceipt.findUnique({
    where: { id: receiptId },
    select: { share_code: true },
  });

  if (!receipt) return null;
  if (receipt.share_code) return receipt.share_code;

  const code = await generateUniqueReceiptShareCode();
  await prisma.paymentReceipt.update({
    where: { id: receiptId },
    data: {
      share_code: code,
      shared_at: new Date(),
    },
  });

  return code;
}

export function resolveReceiptPublicUrl(shareCode?: string | null) {
  if (!shareCode) return null;
  return buildReceiptShortUrl(shareCode);
}

export function buildReceiptWhatsAppMessage(input: {
  clientName: string;
  valorLabel: string;
  receiptUrl: string;
  numeroLabel?: string | null;
}) {
  const first = input.clientName.trim().split(/\s+/)[0] || "cliente";
  const num = input.numeroLabel?.trim();
  return (
    `Olá ${first}! Segue o recibo de pagamento` +
    (num ? ` ${num}` : "") +
    ` no valor de ${input.valorLabel} emitido pela Móveis Unghero:\n\n` +
    `${input.receiptUrl}\n\n` +
    `A senha de acesso são os 4 últimos dígitos do teu celular cadastrado.`
  );
}

export function openReceiptWhatsApp(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return false;
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  const url = `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

export function suggestReferenteFromInstallment(input: {
  tipo: string;
  numero_parcela?: number | null;
  total_parcelas?: number | null;
  descricao?: string | null;
}): string {
  if (input.descricao?.trim()) return input.descricao.trim();
  if (input.tipo === "ENTRADA") return "Entrada referente a móveis sob medida";
  if (input.numero_parcela && input.total_parcelas) {
    return `Parcela ${input.numero_parcela}/${input.total_parcelas} referente a móveis sob medida`;
  }
  return "Pagamento referente a móveis sob medida";
}

/** Título curto da natureza do pagamento (entrada / parcela). */
export function receiptPaymentNatureLabel(input: {
  tipo?: string | null;
  numero_parcela?: number | null;
  total_parcelas?: number | null;
  descricao?: string | null;
}): string | null {
  if (input.descricao?.trim()) return input.descricao.trim();
  if (input.tipo === "ENTRADA") return "Entrada";
  if (input.numero_parcela && input.total_parcelas) {
    return `Parcela ${String(input.numero_parcela).padStart(2, "0")}/${String(
      input.total_parcelas
    ).padStart(2, "0")}`;
  }
  return null;
}

export type ReceiptReferenciaContext = {
  titulos: string[];
  residencia: string | null;
  orcamentoCodigo: string | null;
  natureza: string | null;
};

/**
 * Texto multilinha gravado no campo `referente` (editável na emissão).
 * Ambientes/títulos principais em linhas; códigos em linhas próprias.
 */
export function buildReceiptReferenteText(ctx: ReceiptReferenciaContext): string {
  const lines: string[] = [];
  if (ctx.natureza) lines.push(ctx.natureza);

  if (ctx.titulos.length > 0) {
    lines.push("Referente ao projeto:");
    for (const titulo of ctx.titulos) {
      lines.push(`• ${titulo}`);
    }
  } else if (!ctx.natureza) {
    lines.push("Referente a móveis sob medida");
  }

  if (ctx.residencia) {
    lines.push(`Residência ${ctx.residencia}`);
  }
  if (ctx.orcamentoCodigo) {
    lines.push(`Orçamento: ${ctx.orcamentoCodigo}`);
  }

  return lines.join("\n");
}

/** Extrai títulos a partir do texto já gravado (recibos antigos / edição manual). */
export function parseReferenteTitulos(referente: string): string[] {
  return referente
    .split(/\n/)
    .map((line) => line.replace(/^[•\-\*]\s*/, "").trim())
    .filter((line) => {
      if (!line) return false;
      if (/^referente ao projeto:?$/i.test(line)) return false;
      if (/^resid[eê]ncia\b/i.test(line)) return false;
      if (/^or[cç]amento:/i.test(line)) return false;
      if (/^pedido:/i.test(line)) return false;
      if (/^(entrada|parcela|pagamento)\b/i.test(line)) return false;
      return true;
    });
}
