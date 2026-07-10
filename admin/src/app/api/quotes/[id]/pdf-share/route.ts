import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-guard";

const MAX_PDF_BYTES = 8 * 1024 * 1024;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
  }

  const { id: quoteId } = await context.params;

  const quote = await prisma.quote.findFirst({
    where: {
      id: quoteId,
      project: { client: { company_id: auth.companyId } },
    },
    select: { id: true },
  });

  if (!quote) {
    return NextResponse.json({ success: false, error: "Orçamento não encontrado" }, { status: 404 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        success: false,
        error: "Armazenamento não configurado (BLOB_READ_WRITE_TOKEN).",
      },
      { status: 503 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ success: false, error: "PDF inválido" }, { status: 400 });
  }

  if (file.type && file.type !== "application/pdf") {
    return NextResponse.json({ success: false, error: "Envie um arquivo PDF" }, { status: 400 });
  }

  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json({ success: false, error: "PDF excede o limite de 8 MB" }, { status: 400 });
  }

  const safeName = (file.name || "orcamento.pdf").replace(/[^\w.\-() ]+/g, "_").slice(0, 120);
  const pathname = `quotes/${auth.companyId}/${quoteId}/${Date.now()}-${crypto.randomUUID()}.pdf`;

  try {
    const blob = await put(pathname, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: "application/pdf",
    });

    return NextResponse.json({
      success: true,
      url: blob.url,
      filename: safeName,
    });
  } catch (error) {
    console.error("Falha ao publicar PDF do orçamento:", error);
    return NextResponse.json(
      { success: false, error: "Não foi possível publicar o PDF" },
      { status: 500 }
    );
  }
}
