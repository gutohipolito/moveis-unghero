import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidCatalogShareCode } from "@/lib/catalogShare";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ code: string }>;
};

/**
 * Link público do catálogo: redireciona para o arquivo no Vercel Blob.
 * A URL amigável fica em moveisunghero.com.br/catalogos/{code} (HostGator).
 */
export async function GET(_request: Request, context: RouteContext) {
  const { code: rawCode } = await context.params;
  const code = rawCode.trim().toLowerCase();

  if (!isValidCatalogShareCode(code)) {
    return new NextResponse("Catálogo não encontrado.", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  const catalog = await prisma.productCatalog.findFirst({
    where: { share_code: code, ativo: true },
    select: { arquivo_url: true, mime_type: true, titulo: true },
  });

  if (!catalog?.arquivo_url) {
    return new NextResponse("Catálogo não encontrado.", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  const response = NextResponse.redirect(catalog.arquivo_url, 302);
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  return response;
}
