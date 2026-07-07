/** Place ID oficial da ficha Móveis Unghero no Google Maps. */
export const GOOGLE_PLACE_ID = "ChIJee6nW4GgHpUR2WclzXUjUOo";

/** Abre direto na tela de avaliação (exige login Google do cliente). */
export const GOOGLE_REVIEW_URL = `https://search.google.com/local/writereview?placeid=${GOOGLE_PLACE_ID}`;

export const GOOGLE_REVIEW_SHORT_PATH = "/avaliar";

export const REVIEW_SHORT_BASE_URL =
  process.env.NEXT_PUBLIC_REVIEW_SHORT_URL?.replace(/\/$/, "") ??
  "https://admin.moveisunghero.com.br";

export function getGoogleReviewShortUrl() {
  return `${REVIEW_SHORT_BASE_URL}${GOOGLE_REVIEW_SHORT_PATH}`;
}
