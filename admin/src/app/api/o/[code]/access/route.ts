import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPhoneLastFourDigits } from "@/lib/phone";
import {
  isValidQuoteShareUnlockToken,
  QUOTE_SHARE_UNLOCK_HEADER,
} from "@/lib/quoteShareAccess";

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

  const quote = await prisma.quote.findFirst({
    where: { pdf_share_code: code },
    select: {
      project: {
        select: {
          client: { select: { telefone: true, nome: true } },
        },
      },
    },
  });

  if (!quote) {
    return NextResponse.json(
      { exists: false, requiresPin: false, unlocked: false },
      { status: 404 }
    );
  }

  const requiresPin = Boolean(getPhoneLastFourDigits(quote.project.client.telefone || ""));
  const firstName =
    quote.project.client.nome.trim().split(/\s+/)[0] || quote.project.client.nome;

  const headerToken = request.headers.get(QUOTE_SHARE_UNLOCK_HEADER);
  const unlocked = !requiresPin || isValidQuoteShareUnlockToken(code, headerToken);

  return NextResponse.json({
    exists: true,
    requiresPin,
    unlocked,
    clientFirstName: firstName,
  });
}
