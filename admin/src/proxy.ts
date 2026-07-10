import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { parseClientSessionToken } from "@/lib/clientSession";

const PUBLIC_PATHS = new Set(["/login", "/cliente/login", "/briefing", "/cadastro-parceiro"]);

const PUBLIC_PREFIXES = ["/api/auth"];

const PROTECTED_PREFIXES = [
  "/bi",
  "/marketing",
  "/crm",
  "/quotes",
  "/clientes",
  "/colaboradores",
  "/cadastros",
  "/parceiros",
  "/agenda",
  "/factory",
  "/estoque",
  "/logistica",
  "/financeiro",
  "/projects",
  "/cliente/dashboard",
];

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isProtectedPath(pathname: string) {
  if (pathname === "/") return true;
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function getSessionToken(request: NextRequest) {
  return (
    request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("__Secure-better-auth.session_token")?.value
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    const sessionToken = getSessionToken(request);
    if (sessionToken && pathname === "/login") {
      return NextResponse.redirect(new URL("/crm", request.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/") {
    const sessionToken = getSessionToken(request);
    return NextResponse.redirect(
      new URL(sessionToken ? "/crm" : "/login", request.url)
    );
  }

  if (pathname.startsWith("/cliente/dashboard")) {
    const clientSession = request.cookies.get("cliente-session")?.value;
    if (!parseClientSessionToken(clientSession)) {
      return NextResponse.redirect(new URL("/cliente/login", request.url));
    }
    return NextResponse.next();
  }

  if (isProtectedPath(pathname)) {
    const sessionToken = getSessionToken(request);
    if (!sessionToken) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/bi/:path*",
    "/marketing/:path*",
    "/avaliar",
    "/crm/:path*",
    "/quotes/:path*",
    "/clientes/:path*",
    "/colaboradores/:path*",
    "/cadastros/:path*",
    "/parceiros/:path*",
    "/agenda/:path*",
    "/factory/:path*",
    "/estoque/:path*",
    "/logistica/:path*",
    "/financeiro/:path*",
    "/projects/:path*",
    "/cliente/login",
    "/cliente/dashboard/:path*",
  ],
};
