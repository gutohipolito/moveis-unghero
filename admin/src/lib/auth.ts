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

export async function getSessionSafe(headersList: Headers) {
  try {
    return await auth.api.getSession({ headers: headersList });
  } catch (error) {
    console.warn("Erro ao obter sessão:", error);
    return null;
  }
}
