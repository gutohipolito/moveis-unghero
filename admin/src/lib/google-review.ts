/** Place ID oficial da ficha Móveis Unghero no Google Maps. */
export const GOOGLE_PLACE_ID = "ChIJee6nW4GgHpUR2WclzXUjUOo";

/** Abre direto na tela de avaliação (exige login Google do cliente). */
export const GOOGLE_REVIEW_URL = `https://search.google.com/local/writereview?placeid=${GOOGLE_PLACE_ID}`;

export const GOOGLE_REVIEW_SHORT_PATH = "/avaliar";

/** Base do link curto — admin na Vercel até o site institucional migrar. */
export const REVIEW_SHORT_BASE_URL =
  process.env.NEXT_PUBLIC_REVIEW_SHORT_URL?.replace(/\/$/, "") ??
  "https://admin.moveisunghero.com.br";

export function getGoogleReviewShortUrl() {
  return `${REVIEW_SHORT_BASE_URL}${GOOGLE_REVIEW_SHORT_PATH}`;
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
