import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

const authSecret = process.env.BETTER_AUTH_SECRET;
if (!authSecret && process.env.NODE_ENV === "production") {
  throw new Error("BETTER_AUTH_SECRET é obrigatório em produção.");
}

export const auth = betterAuth({
  baseURL:
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
    "http://localhost:3000",
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret: authSecret || "dev-only-secret-min-32-characters-long",
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  user: {
    additionalFields: {
      company_id: {
        type: "string",
        required: true,
        defaultValue: "",
      },
      cargo: {
        type: "string",
        required: true,
        defaultValue: "COMERCIAL",
      },
    },
  },
});

const DEV_MOCK_ROLES = ["ADMIN", "COMERCIAL", "PROJETISTA", "PRODUCAO", "FINANCEIRO"] as const;

function parseDevMockRole(cookieHeader: string): string | null {
  const match = cookieHeader.match(/better-auth\.session_token=mock-token-(\w+)-/);
  if (!match) return null;
  const role = match[1].toUpperCase();
  return DEV_MOCK_ROLES.includes(role as (typeof DEV_MOCK_ROLES)[number]) ? role : null;
}

async function getDevMockSession(role: string) {
  try {
    const user = await prisma.user.findFirst({
      where: { cargo: role as (typeof DEV_MOCK_ROLES)[number] },
    });

    if (!user) return null;

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        cargo: user.cargo,
        company_id: user.company_id,
        image: user.image,
      },
      session: {
        id: "dev-mock-session",
        userId: user.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        token: "dev-mock-token",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
  } catch {
    return null;
  }
}

export async function getSessionSafe(headersList: Headers) {
  if (process.env.NODE_ENV !== "production") {
    const mockRole = parseDevMockRole(headersList.get("cookie") || "");
    if (mockRole) {
      const mockSession = await getDevMockSession(mockRole);
      if (mockSession) return mockSession;
    }
  }

  try {
    return await auth.api.getSession({ headers: headersList });
  } catch (error) {
    console.warn("Erro ao obter sessão:", error);
    return null;
  }
}
