import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret: process.env.BETTER_AUTH_SECRET || "better-auth-secret-key-32-characters-min",
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
  
  // Detecta se há um token de bypass simulado de ADMIN nos headers da requisição
  const cookieHeader = headersList.get("cookie") || "";
  const hasBypassToken = cookieHeader.includes("better-auth.session_token=mock-token-ADMIN");

  if (isDatabaseOffline() || hasBypassToken) {
    try {
      // Busca o administrador real cadastrado no Neon para associar os orçamentos ao usuário físico real
      const dbAdmin = await prisma.user.findFirst({
        where: { cargo: "ADMIN" }
      });

      if (dbAdmin) {
        return {
          user: {
            id: dbAdmin.id,
            name: dbAdmin.name,
            email: dbAdmin.email,
            cargo: dbAdmin.cargo,
            company_id: dbAdmin.company_id,
            image: null
          },
          session: {
            id: "mock-session-id",
            userId: dbAdmin.id,
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
            token: "mock-token",
            createdAt: new Date(),
            updatedAt: new Date()
          }
        };
      }
    } catch (e) {
      console.warn("Erro ao buscar administrador no banco real para o bypass:", e);
    }

    return {
      user: {
        id: "zhugccYr8CSUHnP5ARWrpQptplupF2mM", // Admin cadastrado via better-auth
        name: "Administrador Unghero",
        email: "admin@moveisunghero.com.br",
        cargo: "ADMIN",
        company_id: "mock-company-id",
        image: null
      },
      session: {
        id: "mock-session-id",
        userId: "zhugccYr8CSUHnP5ARWrpQptplupF2mM",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
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

