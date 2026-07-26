import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPhoneLastFourDigits } from "@/lib/phone";
import {
  createQuoteShareUnlockToken,
  QUOTE_SHARE_UNLOCK_MAX_AGE_SEC,
  quoteShareUnlockCookieName,
} from "@/lib/quoteShareAccess";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  const { code: rawCode } = await context.params;
  const code = rawCode.trim().toLowerCase();

  if (!/^[a-z0-9]{6,12}$/.test(code)) {
    return NextResponse.json({ success: false, error: "Link inválido." }, { status: 400 });
  }

  let pin = "";
  try {
    const body = (await request.json()) as { pin?: string };
    pin = String(body.pin ?? "").replace(/\D/g, "");
  } catch {
    return NextResponse.json({ success: false, error: "Dados inválidos." }, { status: 400 });
  }

  if (pin.length !== 4) {
    return NextResponse.json(
      { success: false, error: "Informe os 4 dígitos da senha." },
      { status: 400 }
    );
  }

  const quote = await prisma.quote.findFirst({
    where: { pdf_share_code: code },
    select: {
      project: {
        select: {
          client: { select: { telefone: true } },
        },
      },
    },
  });

  if (!quote) {
    return NextResponse.json({ success: false, error: "Orçamento não encontrado." }, { status: 404 });
  }

  const expected = getPhoneLastFourDigits(quote.project.client.telefone || "");
  if (!expected) {
    return NextResponse.json(
      { success: false, error: "Este orçamento não possui senha configurada." },
      { status: 400 }
    );
  }

  if (pin !== expected) {
    return NextResponse.json({ success: false, error: "Senha incorreta." }, { status: 401 });
  }

  const unlockToken = createQuoteShareUnlockToken(code);
  const response = NextResponse.json({ success: true, unlockToken });
  response.cookies.set(quoteShareUnlockCookieName(code), unlockToken, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: QUOTE_SHARE_UNLOCK_MAX_AGE_SEC,
  });

  return response;
}
