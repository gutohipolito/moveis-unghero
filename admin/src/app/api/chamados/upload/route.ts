import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getAuthContext } from "@/lib/auth-guard";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json(
      { success: false, error: "Sua sessão expirou. Entre de novo no painel e tente enviar o arquivo." },
      { status: 401 }
    );
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        success: false,
        error: "O armazenamento de arquivos está indisponível no momento. Avise a diretoria.",
      },
      { status: 503 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ success: false, error: "Arquivo inválido" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { success: false, error: `"${file.name}" ultrapassa o limite de 10 MB.` },
      { status: 400 }
    );
  }

  const mimeType = file.type || "application/octet-stream";
  if (!ALLOWED.has(mimeType)) {
    return NextResponse.json(
      { success: false, error: `"${file.name}" não é um formato aceito. Use JPG, PNG ou WEBP.` },
      { status: 400 }
    );
  }

  const ext = mimeType.split("/")[1] || "jpg";
  const pathname = `chamados/${auth.companyId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  try {
    const blob = await put(pathname, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: mimeType,
    });
    return NextResponse.json({ success: true, url: blob.url });
  } catch (error) {
    console.error("Erro no upload de imagem do chamado:", error);
    return NextResponse.json(
      { success: false, error: "Não foi possível enviar a imagem." },
      { status: 500 }
    );
  }
}
