import { NextRequest, NextResponse } from "next/server";
import { resolvePublicCompanyId } from "@/lib/publicCompany";
import {
  sendSignupConfirmationEmail,
  type SignupConfirmationKind,
} from "@/lib/signupConfirmationEmail";

/** Endpoint temporário para preview — remover após o teste. */
const PREVIEW_TOKEN = "92675b02404bb3db015a8bd54c74f7bf672ecc1edd4c509a";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (token !== PREVIEW_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    email?: string;
    nome?: string;
  };
  const email = body.email?.trim() || "gustavohip@gmail.com";
  const nome = body.nome?.trim() || "Gustavo Hipólito";
  const companyId = resolvePublicCompanyId();

  const kinds: SignupConfirmationKind[] = [
    "cliente",
    "parceiro",
    "fornecedor",
    "briefing",
  ];

  const results: { kind: SignupConfirmationKind; sent: boolean; error?: string }[] =
    [];

  for (const kind of kinds) {
    const result = await sendSignupConfirmationEmail({
      companyId,
      kind,
      nome,
      email,
    });
    results.push({ kind, ...result });
  }

  return NextResponse.json({ email, results });
}
