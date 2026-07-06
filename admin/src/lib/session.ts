import { cache } from "react";
import { headers } from "next/headers";
import { getSessionSafe } from "@/lib/auth";
import { DEFAULT_COMPANY_ID } from "@/lib/constants";

export { DEFAULT_COMPANY_ID };

/** Sessão deduplicada por request (evita múltiplas idas ao Better Auth). */
export const getCachedSession = cache(async () => {
  return getSessionSafe(await headers()).catch(() => null);
});

export async function getSessionCompanyId(): Promise<string> {
  const session = await getCachedSession();
  return session?.user?.company_id || DEFAULT_COMPANY_ID;
}
