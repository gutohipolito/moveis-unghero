import { NextRequest, NextResponse } from "next/server";
import { submitPublicClientSignupAction } from "@/app/actions/clientSignup";
import { checkRateLimit, getRequestIp } from "@/lib/rateLimit";

const ALLOWED_ORIGINS = new Set([
  "https://moveisunghero.com.br",
  "https://www.moveisunghero.com.br",
]);

function corsHeaders(origin: string | null): Record<string, string> {
  const allowOrigin =
    origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://moveisunghero.com.br";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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

export async function POST(request: NextRequest) {
  const headers = corsHeaders(request.headers.get("origin"));

  const ip = getRequestIp(request.headers);
  const rate = checkRateLimit(`api-public-client-signup:${ip}`, {
    limit: 8,
    windowMs: 60 * 60 * 1000,
  });
  if (!rate.ok) {
    return NextResponse.json(
      {
        success: false,
        error: `Muitas tentativas. Aguarde ${rate.retryAfterSec}s e tente novamente.`,
      },
      {
        status: 429,
        headers: { ...headers, "Retry-After": String(rate.retryAfterSec) },
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Dados inválidos." },
      { status: 400, headers }
    );
  }

  const data = (body ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);

  // company_id do body é ignorado de propósito (resolvePublicCompanyId no action).
  const result = await submitPublicClientSignupAction({
    tipo_pessoa: str(data.tipo_pessoa) === "PJ" ? "PJ" : "PF",
    documento: str(data.documento),
    nome: str(data.nome) ?? "",
    email: str(data.email),
    telefone: str(data.telefone) ?? "",
    cep: str(data.cep),
    endereco: str(data.endereco),
    numero: str(data.numero),
    bairro: str(data.bairro),
    cidade: str(data.cidade),
    uf: str(data.uf),
    tipo_imovel: str(data.tipo_imovel),
    observacoes: str(data.observacoes),
    lgpd_aceite: data.lgpd_aceite === true || data.lgpd_aceite === "true",
    marketing_aceite: data.marketing_aceite === true || data.marketing_aceite === "true",
  });

  return NextResponse.json(result, {
    status: result.success ? 200 : 400,
    headers,
  });
}
