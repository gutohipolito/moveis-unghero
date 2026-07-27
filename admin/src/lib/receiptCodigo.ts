import { toISODateBR } from "@/lib/brazilDate";

/**
 * Número oficial do recibo no padrão RCB-AAAA-000001.
 * Usa o ano da data de recebimento (calendário de São Paulo).
 */
export function formatReceiptCodigo(
  numero: number,
  dataRecebimento: Date | string | number = new Date()
): string {
  const year = toISODateBR(dataRecebimento).slice(0, 4);
  const seq = String(Math.max(0, Math.floor(Number(numero) || 0))).padStart(6, "0");
  return `RCB-${year}-${seq}`;
}
