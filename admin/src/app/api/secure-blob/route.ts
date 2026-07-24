import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { readPrivateBlob } from "@/lib/secureBlob";

const ALLOWED_ROOTS = new Set([
  "clients",
  "suppliers",
  "chamados",
  "colaboradores",
  "factory",
]);

function pathAllowedForCompany(pathname: string, companyId: string): boolean {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 2) return false;
  if (!ALLOWED_ROOTS.has(parts[0])) return false;
  // Formato esperado: {root}/{companyId}/...
  return parts[1] === companyId;
}

/**
 * Serve arquivos sensíveis só para usuários autenticados.
 * Private: get() do Blob. Public (fallback): stream da URL direta sem expor no browser.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
  }

  const pathname = request.nextUrl.searchParams.get("pathname")?.trim();
  const fallback = request.nextUrl.searchParams.get("fallback")?.trim();

  if (!pathname || pathname.includes("..")) {
    return NextResponse.json({ success: false, error: "pathname obrigatório" }, { status: 400 });
  }

  if (!pathAllowedForCompany(pathname, auth.companyId)) {
    return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
  }

  try {
    const privateResult = await readPrivateBlob(pathname);
    if (privateResult && privateResult.statusCode === 200 && privateResult.stream) {
      return new NextResponse(privateResult.stream, {
        headers: {
          "Content-Type": privateResult.blob.contentType || "application/octet-stream",
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
  } catch {
    // store público ou blob inexistente em private — tenta fallback
  }

  if (fallback) {
    try {
      const fallbackUrl = new URL(fallback);
      if (!fallbackUrl.hostname.endsWith("blob.vercel-storage.com")) {
        return NextResponse.json({ success: false, error: "URL inválida" }, { status: 400 });
      }
      const upstream = await fetch(fallbackUrl.toString());
      if (!upstream.ok || !upstream.body) {
        return NextResponse.json({ success: false, error: "Arquivo não encontrado" }, { status: 404 });
      }
      return new NextResponse(upstream.body, {
        headers: {
          "Content-Type": upstream.headers.get("content-type") || "application/octet-stream",
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch (error) {
      console.error("Erro ao buscar blob público:", error);
      return NextResponse.json({ success: false, error: "Arquivo não encontrado" }, { status: 404 });
    }
  }

  return NextResponse.json({ success: false, error: "Arquivo não encontrado" }, { status: 404 });
}
