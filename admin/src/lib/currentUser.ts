import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionSafe } from "@/lib/auth";
import { ADMIN_EMAIL } from "@/lib/constants";

export { ADMIN_EMAIL } from "@/lib/constants";

/** Resolve o usuário da sessão atual ou o administrador principal. */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const session = await getSessionSafe(await headers());
    if (session?.user?.id) return session.user.id;

    const admin = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
      select: { id: true },
    });
    if (admin) return admin.id;

    const firstUser = await prisma.user.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    return firstUser?.id ?? null;
  } catch (error) {
    console.warn("Não foi possível resolver o usuário atual:", error);
    return null;
  }
}

/** Garante um ID de usuário para FK em timeline e orçamentos. */
export async function ensureActorUserId(): Promise<string> {
  const current = await getCurrentUserId();
  if (current) return current;

  const admin = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
    select: { id: true },
  });
  if (admin) return admin.id;

  throw new Error(
    `Administrador não encontrado. Crie o usuário ${ADMIN_EMAIL} via /api/create-admin-prod.`
  );
}
