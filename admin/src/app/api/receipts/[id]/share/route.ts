import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-guard";
import {
  buildReceiptShortUrl,
  ensureReceiptShareCode,
} from "@/lib/receiptShare";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await context.params;

  const receipt = await prisma.paymentReceipt.findFirst({
    where: { id, company_id: auth.companyId },
    select: { id: true, share_code: true },
  });

  if (!receipt) {
    return NextResponse.json({ success: false, error: "Recibo não encontrado" }, { status: 404 });
  }

  const shareCode = await ensureReceiptShareCode(id);
  if (!shareCode) {
    return NextResponse.json(
      { success: false, error: "Não foi possível gerar o link" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    url: buildReceiptShortUrl(shareCode),
  });
}
