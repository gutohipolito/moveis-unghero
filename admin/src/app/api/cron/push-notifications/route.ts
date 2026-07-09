import { NextRequest, NextResponse } from "next/server";
import { deliverPendingPushNotifications } from "@/lib/pushDelivery";
import { isWebPushConfigured } from "@/lib/webPush";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
  }

  if (!isWebPushConfigured()) {
    return NextResponse.json({ success: false, error: "VAPID não configurado" }, { status: 503 });
  }

  const result = await deliverPendingPushNotifications();
  return NextResponse.json({ success: true, ...result });
}
