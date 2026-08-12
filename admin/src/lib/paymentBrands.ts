/** Bandeiras hospedadas em /public/payments (fontes: datatrans/payment-logos, jeffdrumgod/payment-brands-images, Wikimedia). */
export const PAYMENT_BRANDS = [
  { id: "pix", src: "/payments/pix.svg", alt: "Pix", width: 44, height: 16 },
  { id: "visa", src: "/payments/visa.svg", alt: "Visa", width: 36, height: 24 },
  { id: "mastercard", src: "/payments/mastercard.svg", alt: "Mastercard", width: 36, height: 24 },
  { id: "elo", src: "/payments/elo.svg", alt: "Elo", width: 36, height: 24 },
  { id: "hipercard", src: "/payments/hipercard.svg", alt: "Hipercard", width: 36, height: 24 },
  { id: "boleto", src: "/payments/boleto.png", alt: "Boleto bancário", width: 36, height: 24 },
] as const;

export type ReceiptPaymentBrand = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

/** Logos para o método de pagamento do recibo (quando houver asset). */
export function receiptPaymentBrands(
  method: string | null | undefined
): ReceiptPaymentBrand[] {
  switch ((method || "").toUpperCase()) {
    case "PIX":
      return [{ src: "/payments/pix.svg", alt: "PIX", width: 34, height: 12 }];
    case "BOLETO":
      return [{ src: "/payments/boleto.png", alt: "Boleto", width: 28, height: 18 }];
    case "CARTAO":
      return [
        { src: "/payments/visa.svg", alt: "Visa", width: 26, height: 16 },
        { src: "/payments/mastercard.svg", alt: "Mastercard", width: 26, height: 16 },
      ];
    default:
      return [];
  }
}

