import { headers } from "next/headers";
import { getSessionSafe } from "@/lib/auth";

import { DEFAULT_COMPANY_ID } from "@/lib/constants";

export { DEFAULT_COMPANY_ID };

export async function getSessionCompanyId(): Promise<string> {
  const session = await getSessionSafe(await headers()).catch(() => null);
  return session?.user?.company_id || DEFAULT_COMPANY_ID;
}
