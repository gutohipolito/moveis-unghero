import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { requireWriteAccess } from "@/lib/moduleAccess";
import { revalidatePath } from "next/cache";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

type PresetType = "item" | "detail";

function parseType(raw: string): PresetType | null {
  if (raw === "item" || raw === "detail") return raw;
  return null;
}

async function loadPreset(type: PresetType, id: string, companyId: string) {
  if (type === "item") {
    return prisma.quoteItemPreset.findFirst({
      where: { id, company_id: companyId },
      select: { id: true, imagem_url: true },
    });
  }
  return prisma.quoteDetailPreset.findFirst({
    where: { id, company_id: companyId },
    select: { id: true, imagem_url: true },
  });
}

async function setImagemUrl(type: PresetType, id: string, imagem_url: string | null) {
  if (type === "item") {
    return prisma.quoteItemPreset.update({
      where: { id },
      data: { imagem_url },
      select: { id: true, descricao: true, imagem_url: true },
    });
  }
  return prisma.quoteDetailPreset.update({
    where: { id },
    data: { imagem_url },
    select: {
      id: true,
      texto: true,
      imagem_url: true,
      inventory_item_id: true,
      inventoryItem: { select: { nome: true } },
    },
  });
}

async function optimizeImage(file: File): Promise<{ body: Blob; contentType: string }> {
  const input = Buffer.from(await file.arrayBuffer());
  try {
    const buffer = await sharp(input)
      .rotate()
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    // Cópia em ArrayBuffer “limpo”: Buffer do Sharp pode usar SharedArrayBuffer
    // e o fetch do @vercel/blob rejeita com "SharedArrayBuffer is not allowed".
    const bytes = new Uint8Array(buffer.byteLength);
    bytes.set(buffer);
    return {
      body: new Blob([bytes], { type: "image/webp" }),
      contentType: "image/webp",
    };
  } catch {
    const mime = file.type || "application/octet-stream";
    const bytes = new Uint8Array(input.byteLength);
    bytes.set(input);
    return { body: new Blob([bytes], { type: mime }), contentType: mime };
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ type: string; id: string }> }
) {
  let auth;
  try {
    auth = await requireWriteAccess("quotes");
  } catch {
    return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
  }

  const { type: rawType, id } = await context.params;
  const type = parseType(rawType);
  if (!type) {
    return NextResponse.json({ success: false, error: "Tipo inválido." }, { status: 400 });
  }
  // Imagens só nas descrições salvas (não nos detalhes).
  if (type !== "item") {
    return NextResponse.json(
      { success: false, error: "Imagem só é permitida em descrições salvas." },
      { status: 400 }
    );
  }

  const preset = await loadPreset(type, id, auth.companyId);
  if (!preset) {
    return NextResponse.json({ success: false, error: "Item não encontrado." }, { status: 404 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { success: false, error: "Armazenamento não configurado." },
      { status: 503 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ success: false, error: "Arquivo inválido." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ success: false, error: "Imagem excede 8 MB." }, { status: 400 });
  }
  const mime = file.type || "application/octet-stream";
  if (!ALLOWED_MIME.has(mime)) {
    return NextResponse.json(
      { success: false, error: "Formato não suportado. Use JPG, PNG ou WEBP." },
      { status: 400 }
    );
  }

  try {
    const optimized = await optimizeImage(file);
    const pathname = `quote-presets/${auth.companyId}/${type}/${id}/${Date.now()}.webp`;
    const blob = await put(pathname, optimized.body, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: optimized.contentType,
    });

    if (preset.imagem_url?.includes("blob.vercel-storage.com")) {
      await del(preset.imagem_url, { token: process.env.BLOB_READ_WRITE_TOKEN }).catch(
        () => undefined
      );
    }

    const updated = await setImagemUrl(type, id, blob.url);
    revalidatePath("/quotes");
    return NextResponse.json({ success: true, preset: updated, imagem_url: blob.url });
  } catch (error) {
    console.error("Erro no upload de imagem do preset:", error);
    return NextResponse.json(
      { success: false, error: "Não foi possível salvar a imagem." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ type: string; id: string }> }
) {
  let auth;
  try {
    auth = await requireWriteAccess("quotes");
  } catch {
    return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
  }

  const { type: rawType, id } = await context.params;
  const type = parseType(rawType);
  if (!type) {
    return NextResponse.json({ success: false, error: "Tipo inválido." }, { status: 400 });
  }
  if (type !== "item") {
    return NextResponse.json(
      { success: false, error: "Imagem só é permitida em descrições salvas." },
      { status: 400 }
    );
  }

  const preset = await loadPreset(type, id, auth.companyId);
  if (!preset) {
    return NextResponse.json({ success: false, error: "Item não encontrado." }, { status: 404 });
  }

  try {
    if (
      process.env.BLOB_READ_WRITE_TOKEN &&
      preset.imagem_url?.includes("blob.vercel-storage.com")
    ) {
      await del(preset.imagem_url, { token: process.env.BLOB_READ_WRITE_TOKEN }).catch(
        () => undefined
      );
    }
    const updated = await setImagemUrl(type, id, null);
    revalidatePath("/quotes");
    return NextResponse.json({ success: true, preset: updated, imagem_url: null });
  } catch (error) {
    console.error("Erro ao remover imagem do preset:", error);
    return NextResponse.json(
      { success: false, error: "Não foi possível remover a imagem." },
      { status: 500 }
    );
  }
}
