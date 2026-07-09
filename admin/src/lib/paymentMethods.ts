export type PaymentMethod =
  | "PIX"
  | "BOLETO"
  | "CARTAO"
  | "DINHEIRO"
  | "TRANSFERENCIA"
  | "CHEQUE"
  | "OUTRO";

export const PAYMENT_METHOD_OPTIONS: {
  value: PaymentMethod;
  label: string;
  /** Dias de antecedência para alertar no painel (ex.: gerar boleto, separar dinheiro). */
  alertDaysBefore: number;
}[] = [
  { value: "PIX", label: "PIX", alertDaysBefore: 3 },
  { value: "BOLETO", label: "Boleto", alertDaysBefore: 5 },
  { value: "DINHEIRO", label: "Dinheiro", alertDaysBefore: 3 },
  { value: "CARTAO", label: "Cartão", alertDaysBefore: 1 },
  { value: "TRANSFERENCIA", label: "Transferência", alertDaysBefore: 3 },
  { value: "CHEQUE", label: "Cheque", alertDaysBefore: 5 },
  { value: "OUTRO", label: "Outro", alertDaysBefore: 3 },
];

export function labelPaymentMethod(method: string): string {
  return PAYMENT_METHOD_OPTIONS.find((m) => m.value === method)?.label ?? method;
}

export function getPaymentMethodAlertDays(method: string): number {
  return (
    PAYMENT_METHOD_OPTIONS.find((m) => m.value === method)?.alertDaysBefore ?? 3
  );
}

export function paymentMethodPrepareHint(method: string): string {
  switch (method) {
    case "BOLETO":
      return "Gere ou envie o boleto ao cliente com antecedência.";
    case "PIX":
      return "Prepare a chave PIX ou cobrança.";
    case "DINHEIRO":
      return "Separe o valor para recebimento presencial.";
    case "CHEQUE":
      return "Confirme dados e prazo de compensação.";
    case "CARTAO":
      return "Confirme limite/link de pagamento com o cliente.";
    case "TRANSFERENCIA":
      return "Confirme dados bancários com o cliente.";
    default:
      return "Verifique o recebimento com o cliente.";
  }
}
