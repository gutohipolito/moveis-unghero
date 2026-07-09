import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { sendTestPushToUser } from "@/lib/pushDelivery";
import { isWebPushConfigured } from "@/lib/webPush";

export async function POST() {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
  }

  if (!isWebPushConfigured()) {
    return NextResponse.json({ success: false, error: "Push não configurado" }, { status: 503 });
  }

  const ok = await sendTestPushToUser(auth.userId);
  return NextResponse.json({ success: ok });
}
