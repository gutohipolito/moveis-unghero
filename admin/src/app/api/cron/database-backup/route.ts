import { NextRequest, NextResponse } from "next/server";
import { reencryptStoredVaultSecrets } from "@/lib/accessVaultRotate";
import { runDailyDatabaseBackup } from "@/lib/neonBackup";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

/**
 * Snapshot diário do banco (clientes, orçamentos, comercial, etc.)
 * via branch Neon `backup/YYYY-MM-DD`, com retenção de 30 dias.
 *
 * GET /api/cron/database-backup
 * Authorization: Bearer $CRON_SECRET
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
  }

  if (!process.env.NEON_API_KEY || !process.env.NEON_PROJECT_ID) {
    return NextResponse.json(
      {
        success: false,
        error: "NEON_API_KEY e NEON_PROJECT_ID não configurados na Vercel.",
      },
      { status: 503 }
    );
  }

  try {
    let vault: { updated: number; skipped: boolean } | undefined;
    try {
      vault = await reencryptStoredVaultSecrets();
    } catch (error) {
      console.error("Falha ao re-criptografar o cofre:", error);
    }

    const result = await runDailyDatabaseBackup();
    return NextResponse.json({ success: true, vault, ...result });
  } catch (error) {
    console.error("Falha no backup diário:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Falha ao criar backup.",
      },
      { status: 500 }
    );
  }
}
