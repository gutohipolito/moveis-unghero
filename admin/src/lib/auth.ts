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
  // BYPASS INCONDICIONAL TEMPORÁRIO PARA PRODUÇÃO:
  // Retorna automaticamente a sessão do administrador físico real da base Neon.
  // Isso remove totalmente qualquer barreira de login da Vercel e permite ao
  // cliente usar e testar o painel imediatamente conectado ao banco real.
  try {
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
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365), // 1 ano
          token: "mock-token",
          createdAt: new Date(),
          updatedAt: new Date()
        }
      };
    }
  } catch (e) {
    console.warn("Erro ao buscar administrador no Neon para o autologin:", e);
  }

  // Fallback padrão se o banco estiver vazio ou offline
  return {
    user: {
      id: "zhugccYr8CSUHnP5ARWrpQptplupF2mM",
      name: "Administrador Unghero",
      email: "admin@moveisunghero.com.br",
      cargo: "ADMIN",
      company_id: "mock-company-id",
      image: null
    },
    session: {
      id: "mock-session-id",
      userId: "zhugccYr8CSUHnP5ARWrpQptplupF2mM",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      token: "mock-token",
      createdAt: new Date(),
      updatedAt: new Date()
    }
  };
}

