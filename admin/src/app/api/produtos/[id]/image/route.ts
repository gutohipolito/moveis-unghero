import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { getAuthContext, assertCompanyAccess } from "@/lib/auth-guard";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
  }

  const { id: productId } = await context.params;

  const product = await prisma.showcaseProduct.findFirst({
    where: { id: productId, company_id: auth.companyId },
  });
  if (!product) {
    return NextResponse.json({ success: false, error: "Produto não encontrado" }, { status: 404 });
  }

  try {
    assertCompanyAccess(auth, product.company_id);
  } catch {
    return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        success: false,
        error: "Armazenamento não configurado. Adicione BLOB_READ_WRITE_TOKEN na Vercel.",
      },
      { status: 503 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ success: false, error: "Arquivo inválido" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { success: false, error: "Imagem excede o limite de 8 MB" },
      { status: 400 }
    );
  }

  const mimeType = file.type || "application/octet-stream";
  if (!ALLOWED_MIME.has(mimeType)) {
    return NextResponse.json(
      { success: false, error: "Use JPG, PNG ou WEBP." },
      { status: 400 }
    );
  }

  const safeName = file.name.replace(/[^\w.\-() ]+/g, "_").slice(0, 80);
  const ext = safeName.includes(".") ? safeName.split(".").pop() : mimeType.split("/")[1];
  const pathname = `produtos/${auth.companyId}/${productId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  try {
    if (
      product.imagem_url &&
      product.imagem_url.includes("blob.vercel-storage.com")
    ) {
      await del(product.imagem_url, { token: process.env.BLOB_READ_WRITE_TOKEN });
    }

    const blob = await put(pathname, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: mimeType,
    });

    const updated = await prisma.showcaseProduct.update({
      where: { id: productId },
      data: {
        imagem_url: blob.url,
        imagem_mime: mimeType,
      },
    });

    return NextResponse.json({
      success: true,
      imagem_url: updated.imagem_url,
      imagem_mime: updated.imagem_mime,
    });
  } catch (error) {
    console.error("Erro no upload de imagem do produto:", error);
    return NextResponse.json(
      { success: false, error: "Não foi possível salvar a imagem." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
  }

  const { id: productId } = await context.params;
  const product = await prisma.showcaseProduct.findFirst({
    where: { id: productId, company_id: auth.companyId },
  });
  if (!product) {
    return NextResponse.json({ success: false, error: "Produto não encontrado" }, { status: 404 });
  }

  try {
    if (
      product.imagem_url &&
      process.env.BLOB_READ_WRITE_TOKEN &&
      product.imagem_url.includes("blob.vercel-storage.com")
    ) {
      await del(product.imagem_url, { token: process.env.BLOB_READ_WRITE_TOKEN });
    }

    await prisma.showcaseProduct.update({
      where: { id: productId },
      data: { imagem_url: null, imagem_mime: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao remover imagem do produto:", error);
    return NextResponse.json(
      { success: false, error: "Não foi possível remover a imagem." },
      { status: 500 }
    );
  }
}
