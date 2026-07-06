"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function logout() {
  try {
    await auth.api.signOut({ headers: await headers() });
  } catch {
    // Limpa cookies manualmente se a API falhar
  }

  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  cookieStore.delete("better-auth.session_token");
  cookieStore.delete("__Secure-better-auth.session_token");

  redirect("/login");
}
