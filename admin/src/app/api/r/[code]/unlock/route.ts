import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPhoneLastFourDigits } from "@/lib/phone";
import {
  checkSharePinCodeLimit,
  pinsMatch,
  sharePinLockedResponse,
} from "@/lib/sharePinUnlock";
import {
  createReceiptShareUnlockToken,
  RECEIPT_SHARE_UNLOCK_MAX_AGE_SEC,
  receiptShareUnlockCookieName,
} from "@/lib/receiptShareAccess";

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

  const limited = await checkSharePinCodeLimit("receipt", code);
  if (!limited.ok) {
    return sharePinLockedResponse(limited.retryAfterSec);
  }

  const receipt = await prisma.paymentReceipt.findFirst({
    where: { share_code: code },
    select: {
      client: { select: { telefone: true } },
    },
  });

  if (!receipt) {
    return NextResponse.json({ success: false, error: "Recibo não encontrado." }, { status: 404 });
  }

  const expected = getPhoneLastFourDigits(receipt.client?.telefone || "");
  if (!expected) {
    return NextResponse.json(
      { success: false, error: "Este recibo não possui senha configurada." },
      { status: 400 }
    );
  }

  if (!pinsMatch(pin, expected)) {
    return NextResponse.json({ success: false, error: "Senha incorreta." }, { status: 401 });
  }

  const unlockToken = createReceiptShareUnlockToken(code);
  const response = NextResponse.json({ success: true, unlockToken });
  response.cookies.set(receiptShareUnlockCookieName(code), unlockToken, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: RECEIPT_SHARE_UNLOCK_MAX_AGE_SEC,
  });

  return response;
}
