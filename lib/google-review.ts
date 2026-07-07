/** Link oficial do Google Business que abre direto na tela de avaliação. */
export const GOOGLE_REVIEW_URL = "https://share.google/7eXTn12GCgAnKr0yI";

export const GOOGLE_REVIEW_SHORT_PATH = "/avaliar";

export const PUBLIC_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://moveisunghero.com.br";

export function getGoogleReviewShortUrl() {
  return `${PUBLIC_SITE_URL.replace(/\/$/, "")}${GOOGLE_REVIEW_SHORT_PATH}`;
}
