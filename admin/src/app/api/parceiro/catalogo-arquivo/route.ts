import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { parsePartnerSessionToken } from "@/lib/partnerSession";

export const runtime = "nodejs";
export const maxDuration = 60;

const FETCH_TIMEOUT_MS = 45_000;
const MAX_SOURCE_BYTES = 100 * 1024 * 1024;

function safeFilename(name: string) {
  return name.replace(/[^\w.\-()+ ]+/g, "_").slice(0, 120) || "catalogo.pdf";
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const partnerId = parsePartnerSessionToken(
    cookieStore.get("parceiro-session")?.value
  );
  if (!partnerId) {
    return new NextResponse("Não autorizado", { status: 401 });
  }

  const catalogId = request.nextUrl.searchParams.get("id")?.trim();
  if (!catalogId) {
    return new NextResponse("Parâmetros inválidos", { status: 400 });
  }

  const partner = await prisma.professionalPartner.findFirst({
    where: { id: partnerId, ativo: true },
    select: { company_id: true },
  });
  if (!partner) {
    return new NextResponse("Parceiro não encontrado", { status: 404 });
  }

  const catalog = await prisma.productCatalog.findFirst({
    where: {
      id: catalogId,
      company_id: partner.company_id,
      ativo: true,
    },
    select: {
      id: true,
      arquivo_url: true,
      arquivo_nome: true,
      mime_type: true,
    },
  });
  if (!catalog?.arquivo_url) {
    return new NextResponse("Catálogo não encontrado", { status: 404 });
  }

  let source: Buffer;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const upstream = await fetch(catalog.arquivo_url, {
      signal: controller.signal,
      cache: "force-cache",
    });
    clearTimeout(timer);
    if (!upstream.ok) {
      return new NextResponse("Falha ao obter arquivo", { status: 502 });
    }
    const len = Number(upstream.headers.get("content-length") || 0);
    if (len > MAX_SOURCE_BYTES) {
      return new NextResponse("Arquivo muito grande", { status: 413 });
    }
    const arr = await upstream.arrayBuffer();
    if (arr.byteLength > MAX_SOURCE_BYTES) {
      return new NextResponse("Arquivo muito grande", { status: 413 });
    }
    source = Buffer.from(arr);
  } catch (error) {
    console.warn("parceiro/catalogo-arquivo fetch failed", error);
    return new NextResponse("Falha ao obter arquivo", { status: 502 });
  }

  try {
    const { applyPartnerCatalogWatermark } = await import(
      "@/lib/partnerCatalogWatermark"
    );
    const { buffer, contentType } = await applyPartnerCatalogWatermark(
      source,
      catalog.mime_type,
      catalog.id
    );
    const filename = safeFilename(catalog.arquivo_nome);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("parceiro/catalogo-arquivo watermark failed; serving source", error);
    const filename = safeFilename(catalog.arquivo_nome);
    return new NextResponse(new Uint8Array(source), {
      status: 200,
      headers: {
        "Content-Type": catalog.mime_type || "application/octet-stream",
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }
}
