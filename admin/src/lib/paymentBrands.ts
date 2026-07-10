/** Bandeiras hospedadas em /public/payments (fontes: datatrans/payment-logos, jeffdrumgod/payment-brands-images, Wikimedia). */
export const PAYMENT_BRANDS = [
  { id: "pix", src: "/payments/pix.svg", alt: "Pix", width: 44, height: 16 },
  { id: "visa", src: "/payments/visa.svg", alt: "Visa", width: 36, height: 24 },
  { id: "mastercard", src: "/payments/mastercard.svg", alt: "Mastercard", width: 36, height: 24 },
  { id: "elo", src: "/payments/elo.svg", alt: "Elo", width: 36, height: 24 },
  { id: "hipercard", src: "/payments/hipercard.svg", alt: "Hipercard", width: 36, height: 24 },
  { id: "boleto", src: "/payments/boleto.png", alt: "Boleto bancário", width: 36, height: 24 },
] as const;
