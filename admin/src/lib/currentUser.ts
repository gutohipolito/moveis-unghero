import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionSafe } from "@/lib/auth";

/** Resolve o usuário da sessão atual ou o primeiro usuário do banco. */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const session = await getSessionSafe(await headers());
    if (session?.user?.id) return session.user.id;

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

/**
 * Garante um ID de usuário para FK em timeline (ex.: base vazia em produção).
 * Usa sessão → primeiro usuário → bootstrap mínimo da empresa/admin.
 */
export async function ensureActorUserId(): Promise<string> {
  const current = await getCurrentUserId();
  if (current) return current;

  await prisma.company.upsert({
    where: { id: "mock-company-id" },
    update: {},
    create: {
      id: "mock-company-id",
      nome: "Móveis Unghero",
      cnpj: "13.415.510/0001-71",
      telefone: "(54) 9 9997-1050",
      email: "moveisunghero@gmail.com",
    },
  });

  const mockUser = await prisma.user.upsert({
    where: { id: "system-admin-mock-id" },
    update: {},
    create: {
      id: "system-admin-mock-id",
      name: "Gustavo Hipólito",
      email: "gustavo@moveisunghero.com.br",
      cargo: "ADMIN",
      company_id: "mock-company-id",
    },
  });

  return mockUser.id;
}
