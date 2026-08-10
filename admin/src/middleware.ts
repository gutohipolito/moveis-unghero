import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_SITE = "https://moveisunghero.com.br";

/**
 * Portal do parceiro: URL canônica no site institucional.
 * Só redireciona navegação top-level (aba/janela). Pedidos do iframe,
 * RSC e assets no admin.* seguem normais.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (!pathname.startsWith("/parceiro")) {
    return NextResponse.next();
  }

  const host = (request.headers.get("host") || "").toLowerCase();
  if (host !== "admin.moveisunghero.com.br") {
    return NextResponse.next();
  }

  const dest = (request.headers.get("sec-fetch-dest") || "").toLowerCase();
  // Apenas abertura em aba/janela — nunca iframe, empty (fetch/RSC) ou embed
  if (dest !== "document") {
    return NextResponse.next();
  }

  return NextResponse.redirect(`${PUBLIC_SITE}${pathname}${search}`, 308);
}

export const config = {
  matcher: ["/parceiro", "/parceiro/:path*"],
};
