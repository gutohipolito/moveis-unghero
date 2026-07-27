import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPhoneLastFourDigits } from "@/lib/phone";
import {
  isValidReceiptShareUnlockToken,
  RECEIPT_SHARE_UNLOCK_HEADER,
} from "@/lib/receiptShareAccess";

/** Status público do link (usado pelo proxy PHP do site). */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  const { code: rawCode } = await context.params;
  const code = rawCode.trim().toLowerCase();

  if (!/^[a-z0-9]{6,12}$/.test(code)) {
    return NextResponse.json(
      { exists: false, requiresPin: false, unlocked: false },
      { status: 400 }
    );
  }

  const receipt = await prisma.paymentReceipt.findFirst({
    where: { share_code: code },
    select: {
      cliente_nome: true,
      client: { select: { telefone: true, nome: true } },
    },
  });

  if (!receipt) {
    return NextResponse.json(
      { exists: false, requiresPin: false, unlocked: false },
      { status: 404 }
    );
  }

  const telefone = receipt.client?.telefone || "";
  const requiresPin = Boolean(getPhoneLastFourDigits(telefone));
  const displayName = (receipt.client?.nome || receipt.cliente_nome || "").trim();
  const firstName = displayName.split(/\s+/)[0] || displayName;

  const headerToken = request.headers.get(RECEIPT_SHARE_UNLOCK_HEADER);
  const unlocked = !requiresPin || isValidReceiptShareUnlockToken(code, headerToken);

  return NextResponse.json({
    exists: true,
    requiresPin,
    unlocked,
    clientFirstName: firstName,
  });
}
