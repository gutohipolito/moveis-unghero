import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getAuthContext } from "@/lib/auth-guard";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        success: false,
        error: "Armazenamento não configurado. Adicione BLOB_READ_WRITE_TOKEN na Vercel.",
      },
      { status: 503 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ success: false, error: "Arquivo inválido." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { success: false, error: "A imagem excede o limite de 2 MB." },
      { status: 400 }
    );
  }

  const mimeType = file.type || "application/octet-stream";
  if (!ALLOWED.has(mimeType)) {
    return NextResponse.json(
      { success: false, error: "Formato não suportado. Use JPG, PNG ou WEBP." },
      { status: 400 }
    );
  }

  const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
  const pathname = `perfil/${auth.companyId}/${auth.userId}-${Date.now()}.${ext}`;

  try {
    const blob = await put(pathname, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: mimeType,
      addRandomSuffix: true,
    });

    return NextResponse.json({
      success: true,
      url: blob.url,
      mimeType,
      sizeBytes: file.size,
    });
  } catch (error) {
    console.error("Erro no upload de foto de perfil:", error);
    return NextResponse.json(
      { success: false, error: "Não foi possível salvar a imagem." },
      { status: 500 }
    );
  }
}
