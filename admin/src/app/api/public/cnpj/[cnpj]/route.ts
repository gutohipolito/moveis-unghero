import { NextRequest, NextResponse } from "next/server";
import { cleanCnpjDigits, lookupCnpjServer } from "@/lib/cnpjLookup";
import { checkRateLimit, getRequestIp } from "@/lib/rateLimit";

const ALLOWED_ORIGINS = new Set([
  "https://moveisunghero.com.br",
  "https://www.moveisunghero.com.br",
  "https://admin.moveisunghero.com.br",
]);

function corsHeaders(origin: string | null): Record<string, string> {
  const allowOrigin =
    origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://admin.moveisunghero.com.br";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request.headers.get("origin")),
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ cnpj: string }> }
) {
  const headers = corsHeaders(request.headers.get("origin"));
  const ip = getRequestIp(request.headers);
  const rate = checkRateLimit(`api-public-cnpj:${ip}`, {
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });
  if (!rate.ok) {
    return NextResponse.json(
      { success: false, error: `Muitas consultas. Aguarde ${rate.retryAfterSec}s.` },
      { status: 429, headers: { ...headers, "Retry-After": String(rate.retryAfterSec) } }
    );
  }

  const { cnpj: raw } = await context.params;
  const cnpj = cleanCnpjDigits(raw || "");
  if (cnpj.length !== 14) {
    return NextResponse.json(
      { success: false, error: "Informe um CNPJ válido com 14 dígitos." },
      { status: 400, headers }
    );
  }

  const result = await lookupCnpjServer(cnpj);
  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 404, headers }
    );
  }

  return NextResponse.json({ success: true, ...result.data }, { status: 200, headers });
}
