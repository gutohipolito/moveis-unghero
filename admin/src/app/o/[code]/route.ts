import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugifyFileName } from "@/lib/quoteWhatsApp";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;
  const normalized = code.trim().toLowerCase();

  if (!/^[a-z0-9]{6,12}$/.test(normalized)) {
    return new NextResponse("Link inválido.", { status: 404 });
  }

  const quote = await prisma.quote.findFirst({
    where: { pdf_share_code: normalized },
    select: {
      pdf_share_url: true,
      project: {
        select: {
          client: {
            select: { nome: true },
          },
        },
      },
    },
  });

  if (!quote?.pdf_share_url) {
    return new NextResponse("Orçamento não encontrado ou link expirado.", { status: 404 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(quote.pdf_share_url, { cache: "no-store" });
  } catch (error) {
    console.error("Falha ao buscar PDF do orçamento:", error);
    return new NextResponse("Não foi possível abrir o PDF.", { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return new NextResponse("PDF indisponível no momento.", { status: 502 });
  }

  const clientSlug = slugifyFileName(quote.project.client.nome);
  const filename = `orcamento-${clientSlug}.pdf`;

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, max-age=3600",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
