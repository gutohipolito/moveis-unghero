import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { parsePartnerSessionToken } from "@/lib/partnerSession";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const partnerId = parsePartnerSessionToken(cookieStore.get("parceiro-session")?.value);
  if (!partnerId) {
    return NextResponse.json({ success: false, error: "Sessão expirada. Entre novamente." }, { status: 401 });
  }

  const partner = await prisma.professionalPartner.findFirst({
    where: { id: partnerId, ativo: true },
    select: { id: true, company_id: true },
  });
  if (!partner) {
    return NextResponse.json({ success: false, error: "Parceiro não encontrado." }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ success: false, error: "Arquivo inválido." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ success: false, error: "Arquivo excede 10 MB." }, { status: 400 });
  }
  const mimeType = file.type || "application/octet-stream";
  if (!ALLOWED.has(mimeType)) {
    return NextResponse.json({ success: false, error: "Use JPG, PNG ou WEBP." }, { status: 400 });
  }

  const safeName = file.name.replace(/[^\w.\-() ]+/g, "_").slice(0, 120);
  const ext = safeName.includes(".") ? safeName.split(".").pop() : mimeType.split("/")[1];

  let fileUrl = "";
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        success: false,
        error: "Upload indisponível no momento. Tente novamente mais tarde.",
      },
      { status: 503 }
    );
  }

  try {
    const pathname = `partners/${partner.company_id}/${partner.id}/avatar/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const blob = await put(pathname, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: mimeType,
    });
    fileUrl = blob.url;
  } catch (error) {
    console.error("Upload avatar parceiro:", error);
    return NextResponse.json({ success: false, error: "Falha ao salvar a imagem." }, { status: 500 });
  }

  try {
    const updated = await prisma.professionalPartner.update({
      where: { id: partner.id },
      data: { fotoUrl: fileUrl },
      select: { id: true, fotoUrl: true },
    });
    return NextResponse.json({ success: true, fotoUrl: updated.fotoUrl });
  } catch (error) {
    console.error("Update foto parceiro:", error);
    return NextResponse.json({ success: false, error: "Erro ao gravar a foto." }, { status: 500 });
  }
}
