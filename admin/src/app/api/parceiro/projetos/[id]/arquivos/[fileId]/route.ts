import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { parsePartnerSessionToken } from "@/lib/partnerSession";
import { assertPartnerOwnsProject } from "@/lib/partnerPortal";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string; fileId: string }> };

/**
 * Download autenticado de arquivo do projeto — não expõe a URL do Blob no portal.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { id: projectId, fileId } = await context.params;
  const cookieStore = await cookies();
  const partnerId = parsePartnerSessionToken(cookieStore.get("parceiro-session")?.value);
  if (!partnerId) {
    return NextResponse.json(
      { success: false, error: "Sessão expirada. Entre novamente." },
      { status: 401 }
    );
  }

  const ownership = await assertPartnerOwnsProject(partnerId, projectId);
  if (!ownership.ok) {
    return NextResponse.json({ success: false, error: "Projeto não encontrado." }, { status: 404 });
  }

  const file = await prisma.partnerProjectFile.findFirst({
    where: { id: fileId, project_id: projectId },
    select: { id: true, nome: true, mime_type: true, url: true },
  });
  if (!file) {
    return NextResponse.json({ success: false, error: "Arquivo não encontrado." }, { status: 404 });
  }

  try {
    const blobUrl = new URL(file.url);
    if (!blobUrl.hostname.endsWith("blob.vercel-storage.com")) {
      return NextResponse.json({ success: false, error: "URL inválida." }, { status: 400 });
    }

    const upstream = await fetch(blobUrl.toString());
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ success: false, error: "Arquivo indisponível." }, { status: 404 });
    }

    const headers = new Headers();
    headers.set("Content-Type", file.mime_type || upstream.headers.get("content-type") || "application/octet-stream");
    headers.set("Cache-Control", "private, no-store");
    headers.set("X-Content-Type-Options", "nosniff");
    const dispositionName = file.nome.replace(/[^\w.\- ()\[\]]+/g, "_").slice(0, 120);
    headers.set("Content-Disposition", `inline; filename="${dispositionName}"`);

    return new NextResponse(upstream.body, { status: 200, headers });
  } catch (error) {
    console.error("Proxy arquivo parceiro:", error);
    return NextResponse.json({ success: false, error: "Falha ao abrir o arquivo." }, { status: 500 });
  }
}
