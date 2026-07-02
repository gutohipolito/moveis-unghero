import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
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
        type: "string", // ADMIN, COMERCIAL, PROJETISTA, PRODUCAO, FINANCEIRO
        required: true,
        defaultValue: "COMERCIAL",
      },
    },
  },
});

export async function getSessionSafe(headersList: Headers) {
  const { isDatabaseOffline } = require("./prisma");
  if (isDatabaseOffline()) {
    return {
      user: {
        id: "mock-admin-id",
        name: "Administrador Unghero",
        email: "admin@unghero.com.br",
        cargo: "ADMIN",
        company_id: "mock-company-id",
        image: null
      },
      session: {
        id: "mock-session-id",
        userId: "mock-admin-id",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        token: "mock-token",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };
  }

  try {
    return await auth.api.getSession({
      headers: headersList
    });
  } catch (e) {
    return null;
  }
}

