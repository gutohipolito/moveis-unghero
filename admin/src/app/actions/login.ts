"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Server Action para simular o login e injetar o cookie de sessão
export async function loginSimulated(role: string) {
  const cookieStore = await cookies();
  
  // Injeta o cookie de sessão simulado
  cookieStore.set("better-auth.session_token", `mock-token-${role}-${Math.random().toString(36).substring(2, 9)}`, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 7 dias
    sameSite: "lax"
  });

  redirect("/crm");
}

// Server Action para simular o logout
export async function logoutSimulated() {
  const cookieStore = await cookies();
  cookieStore.delete("better-auth.session_token");
  cookieStore.delete("__Secure-better-auth.session_token");
  redirect("/login");
}
