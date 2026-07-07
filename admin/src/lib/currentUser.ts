import { headers } from "next/headers";
import { getSessionSafe } from "@/lib/auth";

export { ADMIN_EMAIL } from "@/lib/constants";

/** Resolve o usuário autenticado da sessão atual. */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const session = await getSessionSafe(await headers());
    return session?.user?.id ?? null;
  } catch (error) {
    console.warn("Não foi possível resolver o usuário atual:", error);
    return null;
  }
}

/** Garante um ID de usuário autenticado para FK em timeline e orçamentos. */
export async function ensureActorUserId(): Promise<string> {
  const current = await getCurrentUserId();
  if (current) return current;

  throw new Error("Não autenticado");
}
