import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain"
]);

export async function POST(request: NextRequest) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        success: false,
        error: "Armazenamento de arquivos não configurado. Adicione BLOB_READ_WRITE_TOKEN.",
      },
      { status: 503 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ success: false, error: "Arquivo inválido ou ausente." }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { success: false, error: "O arquivo excede o limite de 10 MB." },
        { status: 400 }
      );
    }

    const mimeType = file.type || "application/octet-stream";
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        { success: false, error: "Formato não suportado. Use PDF, Excel (XLS/XLSX), JPG, PNG ou WEBP." },
        { status: 400 }
      );
    }

    const safeName = file.name.replace(/[^\w.\-() ]+/g, "_").slice(0, 120);
    const ext = safeName.includes(".") ? safeName.split(".").pop() : mimeType.split("/")[1];
    const pathname = `suppliers/uploads/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const blob = await put(pathname, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: mimeType,
    });

    return NextResponse.json({
      success: true,
      url: blob.url,
      name: safeName,
      sizeBytes: file.size,
      mimeType: mimeType
    });
  } catch (error) {
    console.error("Erro no upload de arquivo do fornecedor:", error);
    return NextResponse.json(
      { success: false, error: "Não foi possível salvar o arquivo." },
      { status: 500 }
    );
  }
}
