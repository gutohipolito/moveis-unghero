/** Link oficial do Google Business que abre direto na tela de avaliação. */
export const GOOGLE_REVIEW_URL = "https://share.google/7eXTn12GCgAnKr0yI";

export const GOOGLE_REVIEW_SHORT_PATH = "/avaliar";

export const PUBLIC_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://moveisunghero.com.br";

export function getGoogleReviewShortUrl() {
  return `${PUBLIC_SITE_URL.replace(/\/$/, "")}${GOOGLE_REVIEW_SHORT_PATH}`;
}

export function getFirstName(nome: string) {
  return nome.trim().split(/\s+/)[0] || nome;
}

export function formatPhoneForWhatsApp(telefone: string) {
  const digits = telefone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  return `55${digits}`;
}

export function buildGoogleReviewWhatsAppMessage(options?: {
  clientName?: string;
  reviewUrl?: string;
}) {
  const url = options?.reviewUrl ?? getGoogleReviewShortUrl();
  const greeting = options?.clientName
    ? `Olá ${getFirstName(options.clientName)}, tudo bem?`
    : "Olá, tudo bem?";

  return `${greeting}

Esperamos que esteja satisfeito(a) com seu projeto de móveis planejados!

Se puder, deixe sua avaliação no Google — leva menos de 1 minuto e nos ajuda muito:

${url}

Obrigado pela confiança!
Equipe Móveis Unghero`;
}

export function buildWhatsAppUrl(phone: string, message: string) {
  const num = formatPhoneForWhatsApp(phone);
  if (!num) return "";
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

export interface GoogleReviewClientOption {
  id: string;
  nome: string;
  telefone: string;
}
