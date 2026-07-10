import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    select: { pdf_share_url: true },
  });

  if (!quote?.pdf_share_url) {
    return new NextResponse("Orçamento não encontrado ou link expirado.", { status: 404 });
  }

  return NextResponse.redirect(quote.pdf_share_url, 302);
}
