import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { getCompanyLiveVersions } from "@/lib/liveVersions";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const versions = await getCompanyLiveVersions(auth.companyId, auth.userId);
  return NextResponse.json({ versions });
}
