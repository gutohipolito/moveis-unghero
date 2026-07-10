import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

const DEV_AUTH_SECRET = "dev-only-secret-min-32-characters-long";
const BUILD_AUTH_SECRET = "build-only-placeholder-secret-32chars-min";

function isNextProductionBuild() {
  return (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.NEXT_PHASE === "phase-export"
  );
}

function resolveAuthSecret() {
  const authSecret = process.env.BETTER_AUTH_SECRET;
  if (authSecret) return authSecret;

  if (process.env.NODE_ENV !== "production") {
    return DEV_AUTH_SECRET;
  }

  // Vercel Preview builds run with NODE_ENV=production but may not have
  // preview-scoped env vars during page data collection.
  if (isNextProductionBuild()) {
    return BUILD_AUTH_SECRET;
  }

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
  secret: resolveAuthSecret(),
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
