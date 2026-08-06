import { NextRequest, NextResponse } from "next/server";
import { resolvePublicCompanyId } from "@/lib/publicCompany";
import { sendSignupConfirmationEmail } from "@/lib/signupConfirmationEmail";

/** Endpoint temporário — remover após o teste. */
const PREVIEW_TOKEN = "a8f3c91e2d7b4e6a0c5d8f1b3e7a9c2d4f6b8e0a";

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

  const result = await sendSignupConfirmationEmail({
    companyId: resolvePublicCompanyId(),
    kind: "cliente",
    nome: body.nome?.trim() || "Gustavo Hipólito",
    email: body.email?.trim() || "gustavohip@gmail.com",
  });

  return NextResponse.json(result);
}
