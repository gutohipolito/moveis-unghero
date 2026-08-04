import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { parsePartnerSessionToken } from "@/lib/partnerSession";
import { applyPartnerProductWatermark } from "@/lib/partnerProductWatermark";

export const runtime = "nodejs";
export const maxDuration = 20;

const FETCH_TIMEOUT_MS = 12_000;
const MAX_SOURCE_BYTES = 8 * 1024 * 1024;

function resolveProductUrls(product: {
  imagens: string[];
  imagem_url: string | null;
}): string[] {
  const fromArray = (product.imagens || []).filter(Boolean);
  if (fromArray.length > 0) return fromArray;
  return product.imagem_url ? [product.imagem_url] : [];
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const partnerId = parsePartnerSessionToken(
    cookieStore.get("parceiro-session")?.value
  );
  if (!partnerId) {
    return new NextResponse("Não autorizado", { status: 401 });
  }

  const productId = request.nextUrl.searchParams.get("productId")?.trim();
  const indexRaw = request.nextUrl.searchParams.get("i") ?? "0";
  const index = Number.parseInt(indexRaw, 10);
  if (!productId || !Number.isFinite(index) || index < 0 || index > 40) {
    return new NextResponse("Parâmetros inválidos", { status: 400 });
  }

  const partner = await prisma.professionalPartner.findFirst({
    where: { id: partnerId, ativo: true },
    select: { company_id: true },
  });
  if (!partner) {
    return new NextResponse("Parceiro não encontrado", { status: 404 });
  }

  const product = await prisma.showcaseProduct.findFirst({
    where: {
      id: productId,
      company_id: partner.company_id,
      ativo: true,
    },
    select: {
      id: true,
      imagens: true,
      imagem_url: true,
    },
  });
  if (!product) {
    return new NextResponse("Produto não encontrado", { status: 404 });
  }

  const urls = resolveProductUrls(product);
  const sourceUrl = urls[index];
  if (!sourceUrl) {
    return new NextResponse("Imagem não encontrada", { status: 404 });
  }

  let source: Buffer;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const upstream = await fetch(sourceUrl, {
      signal: controller.signal,
      headers: { Accept: "image/*" },
      cache: "force-cache",
    });
    clearTimeout(timer);
    if (!upstream.ok) {
      return new NextResponse("Falha ao obter imagem", { status: 502 });
    }
    const len = Number(upstream.headers.get("content-length") || 0);
    if (len > MAX_SOURCE_BYTES) {
      return new NextResponse("Imagem muito grande", { status: 413 });
    }
    const arr = await upstream.arrayBuffer();
    if (arr.byteLength > MAX_SOURCE_BYTES) {
      return new NextResponse("Imagem muito grande", { status: 413 });
    }
    source = Buffer.from(arr);
  } catch (error) {
    console.warn("parceiro/produto-imagem fetch failed", error);
    return new NextResponse("Falha ao obter imagem", { status: 502 });
  }

  try {
    const { buffer, contentType } = await applyPartnerProductWatermark(
      source,
      `${product.id}:${index}`
    );
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=86400, stale-while-revalidate=604800",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      },
    });
  } catch (error) {
    console.error("parceiro/produto-imagem watermark failed", error);
    return new NextResponse("Falha ao processar imagem", { status: 500 });
  }
}
