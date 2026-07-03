import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function GET() {
  const cookieStore = await cookies();
  
  // Injeta o cookie de bypass de ADMIN de produção
  cookieStore.set("better-auth.session_token", `mock-token-ADMIN-${Math.random().toString(36).substring(2, 9)}`, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 7 dias
    sameSite: "lax"
  });

  // Redireciona diretamente para a listagem de orçamentos em produção
  redirect("/quotes");
}
