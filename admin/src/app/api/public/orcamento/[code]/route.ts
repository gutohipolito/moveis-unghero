import { NextResponse } from "next/server";
import {
  buildPublicQuoteHtmlDocument,
  loadPublicQuoteByShareCode,
} from "@/lib/quotePublicHtml";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;
  const data = await loadPublicQuoteByShareCode(code);

  if (!data) {
    return new NextResponse("Orçamento não encontrado ou link expirado.", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "private, no-cache, must-revalidate",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  const html = buildPublicQuoteHtmlDocument(data);

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-cache, must-revalidate",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
