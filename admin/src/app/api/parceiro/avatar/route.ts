import { NextRequest, NextResponse } from "next/server";
import { del, put } from "@vercel/blob";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { parsePartnerSessionToken } from "@/lib/partnerSession";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const AVATAR_PROXY_PATH = "/api/parceiro/avatar";

async function requirePartner() {
  const cookieStore = await cookies();
  const partnerId = parsePartnerSessionToken(cookieStore.get("parceiro-session")?.value);
  if (!partnerId) return null;

  return prisma.professionalPartner.findFirst({
    where: { id: partnerId, ativo: true },
    select: { id: true, company_id: true, fotoUrl: true },
  });
}

/** Serve a foto do parceiro logado sem expor a URL do Blob. */
export async function GET() {
  const partner = await requirePartner();
  if (!partner) {
    return NextResponse.json({ success: false, error: "Sessão expirada." }, { status: 401 });
  }
  if (!partner.fotoUrl) {
    return NextResponse.json({ success: false, error: "Sem foto." }, { status: 404 });
  }

  try {
    const blobUrl = new URL(partner.fotoUrl);
    if (!blobUrl.hostname.endsWith("blob.vercel-storage.com")) {
      return NextResponse.redirect(partner.fotoUrl);
    }

    const upstream = await fetch(blobUrl.toString());
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ success: false, error: "Foto indisponível." }, { status: 404 });
    }

    return new NextResponse(upstream.body, {
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Proxy avatar parceiro:", error);
    return NextResponse.json({ success: false, error: "Falha ao abrir a foto." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const partner = await requirePartner();
  if (!partner) {
    return NextResponse.json({ success: false, error: "Sessão expirada. Entre novamente." }, { status: 401 });
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

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        success: false,
        error: "Upload indisponível no momento. Tente novamente mais tarde.",
      },
      { status: 503 }
    );
  }

  let fileUrl = "";
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

  const previousUrl = partner.fotoUrl;

  try {
    await prisma.professionalPartner.update({
      where: { id: partner.id },
      data: { fotoUrl: fileUrl },
      select: { id: true },
    });

    if (
      previousUrl &&
      previousUrl !== fileUrl &&
      previousUrl.includes("blob.vercel-storage.com")
    ) {
      del(previousUrl, { token: process.env.BLOB_READ_WRITE_TOKEN }).catch(() => undefined);
    }

    return NextResponse.json({ success: true, fotoUrl: AVATAR_PROXY_PATH });
  } catch (error) {
    console.error("Update foto parceiro:", error);
    return NextResponse.json({ success: false, error: "Erro ao gravar a foto." }, { status: 500 });
  }
}
