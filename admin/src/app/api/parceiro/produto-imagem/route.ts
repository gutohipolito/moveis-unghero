import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { parsePartnerSessionToken } from "@/lib/partnerSession";

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

function guessContentType(sourceUrl: string, headerType: string | null): string {
  const header = (headerType || "").split(";")[0]?.trim().toLowerCase();
  if (header?.startsWith("image/")) return header;
  const lower = sourceUrl.toLowerCase();
  if (lower.includes(".png")) return "image/png";
  if (lower.includes(".webp")) return "image/webp";
  if (lower.includes(".gif")) return "image/gif";
  if (lower.includes(".avif")) return "image/avif";
  return "image/jpeg";
}

function imageResponse(
  body: Buffer | Uint8Array,
  contentType: string,
  cacheControl = "private, max-age=86400, stale-while-revalidate=604800"
) {
  return new NextResponse(new Uint8Array(body), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": cacheControl,
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
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
  let upstreamType: string | null = null;
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
    upstreamType = upstream.headers.get("content-type");
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

  const fallbackType = guessContentType(sourceUrl, upstreamType);

  try {
    // Import dinâmico: se o sharp falhar ao carregar no runtime, ainda servimos a imagem.
    const { applyPartnerProductWatermark } = await import(
      "@/lib/partnerProductWatermark"
    );
    const { buffer, contentType } = await applyPartnerProductWatermark(
      source,
      `${product.id}:${index}`
    );
    return imageResponse(buffer, contentType);
  } catch (error) {
    console.error("parceiro/produto-imagem watermark failed; serving source", error);
    return imageResponse(source, fallbackType, "private, max-age=300");
  }
}
