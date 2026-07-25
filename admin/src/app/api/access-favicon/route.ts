import { NextRequest, NextResponse } from "next/server";

/** Proxy de favicon (mesmo-origin) para extrair cores no canvas sem CORS. */
export async function GET(request: NextRequest) {
  const domain = (request.nextUrl.searchParams.get("domain") || "")
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");

  if (!domain || domain.length > 253 || !/^[a-z0-9.-]+\.[a-z0-9.-]+$/i.test(domain)) {
    return NextResponse.json({ error: "Domínio inválido" }, { status: 400 });
  }

  // DuckDuckGo costuma devolver ícones maiores/mais fiéis que o fallback genérico do Google.
  const candidates = [
    `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`,
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`,
  ];

  try {
    let buffer: ArrayBuffer | null = null;
    let contentType = "image/png";

    for (const upstream of candidates) {
      const res = await fetch(upstream, {
        headers: { "User-Agent": "MoveisUngheroAdmin/1.0" },
        next: { revalidate: 86400 },
      });
      if (!res.ok) continue;
      const bytes = await res.arrayBuffer();
      if (bytes.byteLength < 32) continue;
      buffer = bytes;
      contentType = res.headers.get("content-type") || contentType;
      break;
    }

    if (!buffer) {
      return NextResponse.json({ error: "Favicon indisponível" }, { status: 404 });
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return NextResponse.json({ error: "Falha ao buscar favicon" }, { status: 502 });
  }
}
