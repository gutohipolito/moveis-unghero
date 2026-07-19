import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { getAuthContext, assertCompanyAccess } from "@/lib/auth-guard";

const MAX_BYTES = 8 * 1024 * 1024;
const MAX_IMAGES = 12;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

function resolveImagens(product: { imagens: string[]; imagem_url: string | null }) {
  const fromArray = (product.imagens || []).filter(Boolean);
  if (fromArray.length > 0) return fromArray;
  return product.imagem_url ? [product.imagem_url] : [];
}

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
  const files = formData
    .getAll("file")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length === 0) {
    return NextResponse.json({ success: false, error: "Arquivo inválido" }, { status: 400 });
  }

  const current = resolveImagens(product);
  if (current.length + files.length > MAX_IMAGES) {
    return NextResponse.json(
      { success: false, error: `Limite de ${MAX_IMAGES} fotos por produto.` },
      { status: 400 }
    );
  }

  const uploadedUrls: string[] = [];
  let lastMime: string | null = product.imagem_mime;

  try {
    for (const file of files) {
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

      const blob = await put(pathname, file, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
        contentType: mimeType,
      });

      uploadedUrls.push(blob.url);
      lastMime = mimeType;
    }

    const imagens = [...current, ...uploadedUrls];
    const updated = await prisma.showcaseProduct.update({
      where: { id: productId },
      data: {
        imagens,
        imagem_url: imagens[0] || null,
        imagem_mime: lastMime,
      },
    });

    return NextResponse.json({
      success: true,
      imagem_url: updated.imagem_url,
      imagem_mime: updated.imagem_mime,
      imagens: updated.imagens,
    });
  } catch (error) {
    console.error("Erro no upload de imagem do produto:", error);
    return NextResponse.json(
      { success: false, error: "Não foi possível salvar a imagem." },
      { status: 500 }
    );
  }
}

/** Define a capa do produto (move a URL escolhida para o índice 0). */
export async function PATCH(
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

  let coverUrl: string | undefined;
  try {
    const body = (await request.json()) as { coverUrl?: string };
    coverUrl = typeof body.coverUrl === "string" ? body.coverUrl.trim() : undefined;
  } catch {
    return NextResponse.json({ success: false, error: "Payload inválido." }, { status: 400 });
  }

  if (!coverUrl) {
    return NextResponse.json({ success: false, error: "Informe a URL da capa." }, { status: 400 });
  }

  const current = resolveImagens(product);
  if (!current.includes(coverUrl)) {
    return NextResponse.json(
      { success: false, error: "Imagem não pertence a este produto." },
      { status: 400 }
    );
  }

  const imagens = [coverUrl, ...current.filter((url) => url !== coverUrl)];

  try {
    const updated = await prisma.showcaseProduct.update({
      where: { id: productId },
      data: {
        imagens,
        imagem_url: imagens[0] || null,
      },
    });

    return NextResponse.json({
      success: true,
      imagem_url: updated.imagem_url,
      imagens: updated.imagens,
    });
  } catch (error) {
    console.error("Erro ao definir capa do produto:", error);
    return NextResponse.json(
      { success: false, error: "Não foi possível definir a capa." },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

  const targetUrl = request.nextUrl.searchParams.get("url");
  const current = resolveImagens(product);

  try {
    if (targetUrl) {
      const next = current.filter((url) => url !== targetUrl);
      if (
        process.env.BLOB_READ_WRITE_TOKEN &&
        targetUrl.includes("blob.vercel-storage.com")
      ) {
        await del(targetUrl, { token: process.env.BLOB_READ_WRITE_TOKEN }).catch(() => undefined);
      }

      const updated = await prisma.showcaseProduct.update({
        where: { id: productId },
        data: {
          imagens: next,
          imagem_url: next[0] || null,
          imagem_mime: next.length ? product.imagem_mime : null,
        },
      });

      return NextResponse.json({
        success: true,
        imagem_url: updated.imagem_url,
        imagens: updated.imagens,
      });
    }

    // Remove todas as fotos
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      await Promise.all(
        current
          .filter((url) => url.includes("blob.vercel-storage.com"))
          .map((url) =>
            del(url, { token: process.env.BLOB_READ_WRITE_TOKEN }).catch(() => undefined)
          )
      );
    }

    await prisma.showcaseProduct.update({
      where: { id: productId },
      data: { imagem_url: null, imagem_mime: null, imagens: [] },
    });

    return NextResponse.json({ success: true, imagem_url: null, imagens: [] });
  } catch (error) {
    console.error("Erro ao remover imagem do produto:", error);
    return NextResponse.json(
      { success: false, error: "Não foi possível remover a imagem." },
      { status: 500 }
    );
  }
}
