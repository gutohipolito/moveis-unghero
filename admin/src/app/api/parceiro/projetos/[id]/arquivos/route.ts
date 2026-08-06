import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { parsePartnerSessionToken } from "@/lib/partnerSession";
import { assertPartnerOwnsProject } from "@/lib/partnerPortal";
import { checkRateLimit, getRequestIp } from "@/lib/rateLimit";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/dwg",
  "image/vnd.dwg",
  "application/acad",
  "application/x-autocad",
  "application/octet-stream",
]);

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { id: projectId } = await context.params;
  const cookieStore = await cookies();
  const partnerId = parsePartnerSessionToken(cookieStore.get("parceiro-session")?.value);
  if (!partnerId) {
    return NextResponse.json(
      { success: false, error: "Sessão expirada. Entre novamente." },
      { status: 401 }
    );
  }

  const ip = getRequestIp(request.headers);
  const rate = checkRateLimit(`parceiro-file:${partnerId}:${ip}`, {
    limit: 40,
    windowMs: 60 * 60 * 1000,
  });
  if (!rate.ok) {
    return NextResponse.json(
      { success: false, error: `Muitas tentativas. Aguarde ${rate.retryAfterSec}s.` },
      { status: 429 }
    );
  }

  const ownership = await assertPartnerOwnsProject(partnerId, projectId);
  if (!ownership.ok) {
    return NextResponse.json({ success: false, error: "Projeto não encontrado." }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ success: false, error: "Arquivo inválido." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { success: false, error: "Arquivo excede 20 MB." },
      { status: 400 }
    );
  }

  const mimeType = file.type || "application/octet-stream";
  const lowerName = file.name.toLowerCase();
  const extOk =
    lowerName.endsWith(".pdf") ||
    lowerName.endsWith(".jpg") ||
    lowerName.endsWith(".jpeg") ||
    lowerName.endsWith(".png") ||
    lowerName.endsWith(".webp") ||
    lowerName.endsWith(".doc") ||
    lowerName.endsWith(".docx") ||
    lowerName.endsWith(".dwg") ||
    lowerName.endsWith(".dxf");
  if (!ALLOWED.has(mimeType) && !extOk) {
    return NextResponse.json(
      { success: false, error: "Use PDF, imagem, Word ou DWG/DXF." },
      { status: 400 }
    );
  }

  const safeName = file.name.replace(/[^\w.\-() ]+/g, "_").slice(0, 120);
  const ext = safeName.includes(".") ? safeName.split(".").pop() : mimeType.split("/")[1] || "bin";

  let fileUrl = "";
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    fileUrl = `https://example.invalid/partner-file-${Date.now()}.${ext}`;
  } else {
    try {
      const pathname = `partners/${ownership.companyId}/${partnerId}/projects/${projectId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const blob = await put(pathname, file, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
        contentType: mimeType,
      });
      fileUrl = blob.url;
    } catch (error) {
      console.error("Upload arquivo parceiro:", error);
      return NextResponse.json(
        { success: false, error: "Falha ao salvar o arquivo." },
        { status: 500 }
      );
    }
  }

  try {
    const created = await prisma.partnerProjectFile.create({
      data: {
        project_id: projectId,
        partner_id: partnerId,
        company_id: ownership.companyId,
        nome: safeName || `arquivo.${ext}`,
        mime_type: mimeType,
        url: fileUrl,
        size_bytes: file.size,
      },
      select: {
        id: true,
        nome: true,
        mime_type: true,
        url: true,
        size_bytes: true,
        createdAt: true,
        partner: { select: { nome: true } },
      },
    });

    revalidatePath(`/parceiro/projetos/${projectId}`);
    revalidatePath(`/projects/${projectId}`);

    return NextResponse.json({
      success: true,
      file: {
        id: created.id,
        nome: created.nome,
        mime_type: created.mime_type,
        url: created.url,
        size_bytes: created.size_bytes,
        partnerNome: created.partner.nome,
        createdAt: created.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Gravar PartnerProjectFile:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao gravar o arquivo." },
      { status: 500 }
    );
  }
}
