"use server";

import { cookies } from "next/headers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const ALLOWED_DEV_ROLES = ["ADMIN", "COMERCIAL", "PROJETISTA", "PRODUCAO", "FINANCEIRO"];

export async function loginSimulated(role: string) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Login de demonstração não está disponível em produção.");
  }

  const normalizedRole = role.toUpperCase();
  if (!ALLOWED_DEV_ROLES.includes(normalizedRole)) {
    throw new Error("Perfil de demonstração inválido.");
  }

  const cookieStore = await cookies();
  cookieStore.set(
    "better-auth.session_token",
    `mock-token-${normalizedRole}-${Math.random().toString(36).substring(2, 9)}`,
    {
      path: "/",
      httpOnly: true,
      secure: false,
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    }
  );

  redirect("/crm");
}

export async function logout() {
  try {
    await auth.api.signOut({ headers: await headers() });
  } catch {
    // Limpa cookies manualmente se a API falhar
  }

  const cookieStore = await cookies();
  cookieStore.delete("better-auth.session_token");
  cookieStore.delete("__Secure-better-auth.session_token");

  redirect("/login");
}
