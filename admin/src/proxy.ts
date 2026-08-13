import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { parseClientSessionToken } from "@/lib/clientSession";
import { parsePartnerSessionToken } from "@/lib/partnerSession";
import { checkRateLimitAsync, getRequestIp } from "@/lib/rateLimit";

const PUBLIC_PATHS = new Set([
  "/login",
  "/cliente/login",
  "/parceiro/login",
  "/briefing",
  "/cadastro-parceiro",
]);

const PUBLIC_PREFIXES = ["/api/auth", "/api/o/", "/api/r/", "/api/public/"];

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
  "/perfil",
  "/produtos",
  "/sem-acesso",
];

/** Login: 8 tentativas / 15 min por IP (freia força-bruta). */
const LOGIN_RATE = { limit: 8, windowMs: 15 * 60 * 1000 };

/** Links públicos compartilháveis: freia enumeração de códigos. */
const SHARE_RATE = { limit: 60, windowMs: 15 * 60 * 1000 };

/** Unlock de PIN (orçamento/recibo): teto grosso por IP; o bloqueio por código está na rota. */
const SHARE_UNLOCK_IP_RATE = { limit: 20, windowMs: 15 * 60 * 1000 };

const PUBLIC_SITE = "https://moveisunghero.com.br";

/** Forms públicos (quando passam pelo proxy). */
const PUBLIC_FORM_RATE = { limit: 20, windowMs: 60 * 60 * 1000 };

/** Bootstrap de admin: bem restrito (rota também limita). */
const ADMIN_BOOTSTRAP_RATE = { limit: 5, windowMs: 15 * 60 * 1000 };

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
    pathname.startsWith("/a/") ||
    pathname.startsWith("/catalogos/")
  );
}

function isPublicFormPath(pathname: string) {
  return (
    pathname === "/briefing" ||
    pathname === "/cadastro" ||
    pathname.startsWith("/a/") ||
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
  const { pathname, search } = request.nextUrl;
  const ip = getRequestIp(request.headers);

  // URL canônica do portal: moveisunghero.com.br/parceiro/...
  // Só redireciona navegação top-level no host admin.*; iframe/RSC ficam no admin.
  const host = (request.headers.get("host") || "").toLowerCase();
  const dest = (request.headers.get("sec-fetch-dest") || "").toLowerCase();
  if (
    host === "admin.moveisunghero.com.br" &&
    pathname.startsWith("/parceiro") &&
    dest === "document"
  ) {
    return NextResponse.redirect(`${PUBLIC_SITE}${pathname}${search}`, 308);
  }

  // Fecha cadastro público de operadores via Better Auth.
  // Criação de colaborador usa auth.api.signUpEmail no servidor (não passa pelo proxy).
  if (isAuthSignUp(pathname)) {
    return NextResponse.json(
      { message: "Cadastro público desativado. Operadores são criados pela equipe." },
      { status: 403 }
    );
  }

  if (pathname === "/api/create-admin-prod" && request.method === "POST") {
    const result = await checkRateLimitAsync(`admin-bootstrap:${ip}`, ADMIN_BOOTSTRAP_RATE);
    if (!result.ok) {
      return rateLimitedJson(
        `Muitas tentativas. Aguarde ${result.retryAfterSec}s e tente novamente.`,
        result.retryAfterSec,
        ADMIN_BOOTSTRAP_RATE.limit
      );
    }
  }

  if (isAuthSignIn(pathname, request.method)) {
    const result = await checkRateLimitAsync(`signin:${ip}`, LOGIN_RATE);
    if (!result.ok) {
      return rateLimitedJson(
        `Muitas tentativas de login. Aguarde ${result.retryAfterSec}s e tente novamente.`,
        result.retryAfterSec,
        LOGIN_RATE.limit
      );
    }
  }

  if (
    request.method === "POST" &&
    /^\/api\/(o|r)\/[^/]+\/unlock$/.test(pathname)
  ) {
    const result = await checkRateLimitAsync(`share-pin-proxy:${ip}`, SHARE_UNLOCK_IP_RATE);
    if (!result.ok) {
      return rateLimitedJson(
        `Muitas tentativas. Aguarde ${result.retryAfterSec}s e tente novamente.`,
        result.retryAfterSec,
        SHARE_UNLOCK_IP_RATE.limit
      );
    }
  }

  if (pathname.startsWith("/api/o/") || pathname.startsWith("/api/r/")) {
    const result = await checkRateLimitAsync(`quote-unlock:${ip}`, SHARE_RATE);
    if (!result.ok) {
      return rateLimitedJson(
        `Muitas tentativas. Aguarde ${result.retryAfterSec}s e tente novamente.`,
        result.retryAfterSec,
        SHARE_RATE.limit
      );
    }
  }

  if (isPublicSharePath(pathname)) {
    const result = await checkRateLimitAsync(`share:${ip}`, SHARE_RATE);
    if (!result.ok) {
      return new NextResponse("Muitas requisições. Tente novamente em breve.", {
        status: 429,
        headers: { "Retry-After": String(result.retryAfterSec) },
      });
    }
  }

  if (isPublicFormPath(pathname) && request.method === "POST") {
    const result = await checkRateLimitAsync(`public-form:${ip}`, PUBLIC_FORM_RATE);
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
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/") {
    const sessionToken = getSessionToken(request);
    if (!sessionToken) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    // Deixa a page.tsx escolher /factory ou /crm conforme o cargo.
    return NextResponse.next();
  }

  if (pathname.startsWith("/cliente/dashboard")) {
    const clientSession = request.cookies.get("cliente-session")?.value;
    if (!parseClientSessionToken(clientSession)) {
      return NextResponse.redirect(new URL("/cliente/login", request.url));
    }
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/parceiro/painel") ||
    pathname.startsWith("/parceiro/produtos") ||
    pathname.startsWith("/parceiro/clientes") ||
    pathname.startsWith("/parceiro/comissoes") ||
    pathname.startsWith("/parceiro/marketing") ||
    pathname.startsWith("/parceiro/projetos")
  ) {
    const partnerSession = request.cookies.get("parceiro-session")?.value;
    if (!parsePartnerSessionToken(partnerSession)) {
      return NextResponse.redirect(new URL("/parceiro/login", request.url));
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
    "/api/create-admin-prod",
    "/api/public/:path*",
    "/api/o/:path*",
    "/api/r/:path*",
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
    "/perfil",
    "/perfil/:path*",
    "/produtos/:path*",
    "/sem-acesso",
    "/cliente/login",
    "/cliente/dashboard/:path*",
    "/parceiro",
    "/parceiro/login",
    "/parceiro/painel",
    "/parceiro/painel/:path*",
    "/parceiro/produtos",
    "/parceiro/produtos/:path*",
    "/parceiro/clientes",
    "/parceiro/clientes/:path*",
    "/parceiro/comissoes",
    "/parceiro/comissoes/:path*",
    "/parceiro/marketing",
    "/parceiro/marketing/:path*",
    "/parceiro/projetos",
    "/parceiro/projetos/:path*",
    "/api/parceiro/:path*",
    "/briefing",
    "/cadastro",
    "/cadastro-parceiro",
    "/cadastro-fornecedor",
    "/o/:path*",
    "/a/:path*",
    "/c/:path*",
    "/r/:path*",
    "/catalogos/:path*",
  ],
};
