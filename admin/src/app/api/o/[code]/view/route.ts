import { NextRequest, NextResponse } from "next/server";
import { loadPublicQuoteByShareCode } from "@/lib/quotePublicShare";
import {
  isQuoteProxyUserAgent,
  recordQuotePublicView,
  refineQuotePublicView,
  resolveQuoteViewUserAgent,
  type QuoteClientDeviceSignals,
} from "@/lib/quoteViewTracking";

const ALLOWED_ORIGINS = [
  "https://moveisunghero.com.br",
  "https://www.moveisunghero.com.br",
  "https://admin.moveisunghero.com.br",
];

function corsHeaders(request: NextRequest) {
  const origin = request.headers.get("origin") || "";
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  const { code: rawCode } = await context.params;
  const code = rawCode.trim().toLowerCase();
  const headers = corsHeaders(request);

  if (!/^[a-z0-9]{6,12}$/.test(code)) {
    return NextResponse.json({ success: false }, { status: 400, headers });
  }

  let body: {
    refine?: boolean;
    userAgent?: string;
    hints?: { mobile?: string | null; platform?: string | null };
    client?: QuoteClientDeviceSignals;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const data = await loadPublicQuoteByShareCode(code);
  if (!data) {
    return NextResponse.json({ success: false }, { status: 404, headers });
  }

  const fromHeaders = resolveQuoteViewUserAgent(request.headers);
  const bodyUa = typeof body.userAgent === "string" ? body.userAgent.trim() : "";
  const userAgent =
    (bodyUa && !isQuoteProxyUserAgent(bodyUa) ? bodyUa : null) ||
    fromHeaders.userAgent;
  const hints = {
    mobile: body.hints?.mobile ?? fromHeaders.hints.mobile,
    platform: body.hints?.platform ?? fromHeaders.hints.platform,
  };
  const client = body.client || null;

  if (body.refine) {
    await refineQuotePublicView(data.quoteId, userAgent, hints, client);
  } else {
    await recordQuotePublicView(data.quoteId, userAgent, hints, client);
  }

  return NextResponse.json({ success: true }, { headers });
}
