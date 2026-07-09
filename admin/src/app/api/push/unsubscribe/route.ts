import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-guard";

export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
  }

  let endpoint: string | undefined;
  try {
    const body = await request.json();
    endpoint = body.endpoint;
  } catch {
    return NextResponse.json({ success: false, error: "JSON inválido" }, { status: 400 });
  }

  if (!endpoint) {
    return NextResponse.json({ success: false, error: "Endpoint obrigatório" }, { status: 400 });
  }

  await prisma.pushSubscription.deleteMany({
    where: { endpoint, user_id: auth.userId },
  });

  return NextResponse.json({ success: true });
}
