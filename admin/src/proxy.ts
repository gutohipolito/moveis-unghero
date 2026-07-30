import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { parseClientSessionToken } from "@/lib/clientSession";
import { checkRateLimit, getRequestIp } from "@/lib/rateLimit";

const PUBLIC_PATHS = new Set(["/login", "/cliente/login", "/briefing", "/cadastro-parceiro"]);

const PUBLIC_PREFIXES = ["/api/auth", "/api/o/", "/api/public/"];

const PROTECTED_PREFIXES = [
  "/bi",
  "/marketing",
  "/crm",
  "/quotes",
  "/clientes",
  "/contratos",
  "/colaboradores",
  "/cadastros",
  "/parceiros",
  "/agenda",
  "/factory",
  "/estoque",
  "/logistica",
  "/financeiro",
  "/acessos",
  "/projects",
  "/cliente/dashboard",
  "/permissoes",
  "/settings",
  "/chamados",
  "/melhorias",
  "/notas-da-versao",
  "/produtos",
  "/sem-acesso",
];

/** Login: 8 tentativas / 15 min por IP (freia força-bruta). */
const LOGIN_RATE = { limit: 8, windowMs: 15 * 60 * 1000 };

/** Links públicos compartilháveis: freia enumeração de códigos. */
const SHARE_RATE = { limit: 60, windowMs: 15 * 60 * 1000 };

/** Forms públicos (quando passam pelo proxy). */
const PUBLIC_FORM_RATE = { limit: 20, windowMs: 60 * 60 * 1000 };

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

function isAuthSignUp(pathname: string) {
  return pathname.startsWith("/api/auth/sign-up") || pathname.includes("/sign-up/email");
}

function isAuthSignIn(pathname: string, method: string) {
  if (method !== "POST") return false;
  return (
    pathname.startsWith("/api/auth/sign-in") ||
    pathname.includes("/sign-in/email")
  );
}

function isPublicSharePath(pathname: string) {
  return (
    pathname.startsWith("/o/") ||
    pathname.startsWith("/c/") ||
    pathname.startsWith("/r/") ||
    pathname.startsWith("/catalogos/")
  );
}

function isPublicFormPath(pathname: string) {
  return (
    pathname === "/briefing" ||
    pathname === "/cadastro" ||
    pathname === "/cadastro-parceiro" ||
    pathname === "/cadastro-fornecedor" ||
    pathname.startsWith("/api/public/")
  );
}

function rateLimitedJson(message: string, retryAfterSec: number, limit: number) {
  return NextResponse.json(
    { message },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": "0",
      },
    }
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getRequestIp(request.headers);

  // Fecha cadastro público de operadores via Better Auth.
  // Criação de colaborador usa auth.api.signUpEmail no servidor (não passa pelo proxy).
  if (isAuthSignUp(pathname)) {
    return NextResponse.json(
      { message: "Cadastro público desativado. Operadores são criados pela equipe." },
      { status: 403 }
    );
  }

  if (isAuthSignIn(pathname, request.method)) {
    const result = checkRateLimit(`signin:${ip}`, LOGIN_RATE);
    if (!result.ok) {
      return rateLimitedJson(
        `Muitas tentativas de login. Aguarde ${result.retryAfterSec}s e tente novamente.`,
        result.retryAfterSec,
        LOGIN_RATE.limit
      );
    }
  }

  if (pathname.startsWith("/api/o/")) {
    const result = checkRateLimit(`quote-unlock:${ip}`, SHARE_RATE);
    if (!result.ok) {
      return rateLimitedJson(
        `Muitas tentativas. Aguarde ${result.retryAfterSec}s e tente novamente.`,
        result.retryAfterSec,
        SHARE_RATE.limit
      );
    }
  }

  if (isPublicSharePath(pathname)) {
    const result = checkRateLimit(`share:${ip}`, SHARE_RATE);
    if (!result.ok) {
      return new NextResponse("Muitas requisições. Tente novamente em breve.", {
        status: 429,
        headers: { "Retry-After": String(result.retryAfterSec) },
      });
    }
  }

  if (isPublicFormPath(pathname) && request.method === "POST") {
    const result = checkRateLimit(`public-form:${ip}`, PUBLIC_FORM_RATE);
    if (!result.ok) {
      return rateLimitedJson(
        `Muitas tentativas. Aguarde ${result.retryAfterSec}s e tente novamente.`,
        result.retryAfterSec,
        PUBLIC_FORM_RATE.limit
      );
    }
  }

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
    "/api/auth/:path*",
    "/api/public/:path*",
    "/api/o/:path*",
    "/bi/:path*",
    "/marketing/:path*",
    "/avaliar",
    "/crm/:path*",
    "/quotes/:path*",
    "/contratos/:path*",
    "/clientes/:path*",
    "/colaboradores/:path*",
    "/cadastros/:path*",
    "/parceiros/:path*",
    "/agenda/:path*",
    "/factory/:path*",
    "/estoque/:path*",
    "/logistica/:path*",
    "/financeiro/:path*",
    "/acessos/:path*",
    "/projects/:path*",
    "/permissoes/:path*",
    "/settings/:path*",
    "/chamados/:path*",
    "/melhorias/:path*",
    "/notas-da-versao/:path*",
    "/produtos/:path*",
    "/sem-acesso",
    "/cliente/login",
    "/cliente/dashboard/:path*",
    "/briefing",
    "/cadastro",
    "/cadastro-parceiro",
    "/cadastro-fornecedor",
    "/o/:path*",
    "/c/:path*",
    "/r/:path*",
    "/catalogos/:path*",
  ],
};
