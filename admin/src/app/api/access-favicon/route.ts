import { NextRequest, NextResponse } from "next/server";

/** Proxy de favicon (mesmo-origin) para extrair cores no canvas sem CORS. */
export async function GET(request: NextRequest) {
  const domain = (request.nextUrl.searchParams.get("domain") || "")
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");

  if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
    return NextResponse.json({ error: "Domínio inválido" }, { status: 400 });
  }

  const upstream = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;

  try {
    const res = await fetch(upstream, {
      headers: { "User-Agent": "MoveisUngheroAdmin/1.0" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Favicon indisponível" }, { status: 404 });
    }

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "image/png";

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
