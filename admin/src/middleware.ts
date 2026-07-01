import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const sessionToken = 
    request.cookies.get("better-auth.session_token")?.value || 
    request.cookies.get("__Secure-better-auth.session_token")?.value;

  const isAuthRoute = request.nextUrl.pathname.startsWith("/login");
  const isDashboardRoute = 
    request.nextUrl.pathname.startsWith("/crm") || 
    request.nextUrl.pathname.startsWith("/projects") ||
    request.nextUrl.pathname === "/";

  // Se não estiver autenticado e tentar acessar rotas privadas, redireciona para o login
  if (isDashboardRoute && !sessionToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Se estiver autenticado e tentar acessar a página de login, redireciona para o CRM/Kanban
  if (isAuthRoute && sessionToken) {
    return NextResponse.redirect(new URL("/crm", request.url));
  }

  // Redireciona a raiz "/" para o "/crm" se estiver logado, senão para o "/login"
  if (request.nextUrl.pathname === "/") {
    if (sessionToken) {
      return NextResponse.redirect(new URL("/crm", request.url));
    } else {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/crm/:path*",
    "/projects/:path*"
  ],
};
