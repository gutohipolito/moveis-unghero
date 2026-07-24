import { DEFAULT_COMPANY_ID } from "@/lib/constants";

/**
 * Empresa usada por formulários públicos.
 * Nunca confiar em company_id enviado pelo cliente (IDOR / tenant pollution).
 * Opcional: PUBLIC_FORM_COMPANY_ID na Vercel para override explícito.
 */
export function resolvePublicCompanyId(): string {
  const fromEnv = process.env.PUBLIC_FORM_COMPANY_ID?.trim();
  if (fromEnv) return fromEnv;
  return DEFAULT_COMPANY_ID;
}
