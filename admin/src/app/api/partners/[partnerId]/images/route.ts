import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-guard";
import { canManageParceiros } from "@/lib/permissions";
import {
  addPartnerFolder,
  addPartnerImage,
  parsePartnerGallery,
  removePartnerFolder,
  removePartnerImage,
  renamePartnerFolder,
  serializePartnerGallery,
} from "@/lib/partnerImages";

const PARTNER_IMAGE_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const PARTNER_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

function denyWrite(cargo: string | null | undefined) {
  if (!canManageParceiros(cargo)) {
    return "Este cargo só pode visualizar imagens de parceiros.";
  }
  return null;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ partnerId: string }> }
) {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
  }
  const denied = denyWrite(auth.cargo);
  if (denied) {
    return NextResponse.json({ success: false, error: denied }, { status: 403 });
  }

  const { partnerId } = await context.params;

  const partner = await prisma.professionalPartner.findFirst({
    where: { id: partnerId, company_id: auth.companyId },
  });

  if (!partner) {
    return NextResponse.json(
      { success: false, error: "Parceiro não encontrado ou acesso negado." },
      { status: 404 }
    );
  }

  const formData = await request.formData();
  const uploadType = String(formData.get("type") || "galeria");

  // Criar pasta vazia (sem arquivo)
  if (uploadType === "folder") {
    const folderName = String(formData.get("folder") || "");
    const gallery = parsePartnerGallery(partner.imagens);
    const next = addPartnerFolder(gallery, folderName);
    if ("error" in next) {
      return NextResponse.json({ success: false, error: next.error }, { status: 400 });
    }
    const updatedPartner = await prisma.professionalPartner.update({
      where: { id: partnerId },
      data: { imagens: serializePartnerGallery(next) },
    });
    return NextResponse.json({
      success: true,
      partner: updatedPartner,
      gallery: next,
    });
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ success: false, error: "Arquivo inválido." }, { status: 400 });
  }

  if (file.size > PARTNER_IMAGE_MAX_BYTES) {
    return NextResponse.json(
      { success: false, error: "Arquivo excede o limite de 10 MB." },
      { status: 400 }
    );
  }

  const mimeType = file.type || "application/octet-stream";
  if (!PARTNER_IMAGE_MIME_TYPES.has(mimeType)) {
    return NextResponse.json(
      { success: false, error: "Formato não suportado. Use JPG, PNG ou WEBP." },
      { status: 400 }
    );
  }

  const safeName = file.name.replace(/[^\w.\-() ]+/g, "_").slice(0, 120);
  const ext = safeName.includes(".") ? safeName.split(".").pop() : mimeType.split("/")[1];

  let fileUrl = "";

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.warn(
      "BLOB_READ_WRITE_TOKEN não configurado. Utilizando fallback mockup para testes locais."
    );
    const mockupImages = [
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=800&q=80",
    ];
    if (uploadType === "avatar") {
      fileUrl =
        "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&h=256&q=80";
    } else {
      fileUrl = mockupImages[Math.floor(Math.random() * mockupImages.length)];
    }
  } else {
    try {
      const pathname = `partners/${auth.companyId}/${partnerId}/${uploadType}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const blob = await put(pathname, file, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
        contentType: mimeType,
      });
      fileUrl = blob.url;
    } catch (error) {
      console.error("Erro no upload para Vercel Blob:", error);
      return NextResponse.json(
        { success: false, error: "Falha ao salvar no storage." },
        { status: 500 }
      );
    }
  }

  try {
    if (uploadType === "avatar") {
      const updatedPartner = await prisma.professionalPartner.update({
        where: { id: partnerId },
        data: { fotoUrl: fileUrl },
      });
      return NextResponse.json({ success: true, partner: updatedPartner, fileUrl });
    }

    const folder = String(formData.get("folder") || "");
    const gallery = addPartnerImage(parsePartnerGallery(partner.imagens), fileUrl, folder);
    const updatedPartner = await prisma.professionalPartner.update({
      where: { id: partnerId },
      data: { imagens: serializePartnerGallery(gallery) },
    });

    return NextResponse.json({
      success: true,
      partner: updatedPartner,
      fileUrl,
      gallery,
    });
  } catch (error) {
    console.error("Erro ao atualizar dados do parceiro com a imagem:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao gravar informações no banco de dados." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ partnerId: string }> }
) {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
  }
  const denied = denyWrite(auth.cargo);
  if (denied) {
    return NextResponse.json({ success: false, error: denied }, { status: 403 });
  }

  const { partnerId } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    action?: "rename-folder" | "delete-folder";
    folder?: string;
    nextName?: string;
    deleteImages?: boolean;
  } | null;

  if (!body?.action || !body.folder) {
    return NextResponse.json({ success: false, error: "Ação inválida." }, { status: 400 });
  }

  const partner = await prisma.professionalPartner.findFirst({
    where: { id: partnerId, company_id: auth.companyId },
  });
  if (!partner) {
    return NextResponse.json(
      { success: false, error: "Parceiro não encontrado ou acesso negado." },
      { status: 404 }
    );
  }

  const gallery = parsePartnerGallery(partner.imagens);
  const next =
    body.action === "rename-folder"
      ? renamePartnerFolder(gallery, body.folder, body.nextName || "")
      : removePartnerFolder(gallery, body.folder, {
          deleteImages: Boolean(body.deleteImages),
        });

  if ("error" in next) {
    return NextResponse.json({ success: false, error: next.error }, { status: 400 });
  }

  const updatedPartner = await prisma.professionalPartner.update({
    where: { id: partnerId },
    data: { imagens: serializePartnerGallery(next) },
  });

  return NextResponse.json({ success: true, partner: updatedPartner, gallery: next });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ partnerId: string }> }
) {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
  }
  const denied = denyWrite(auth.cargo);
  if (denied) {
    return NextResponse.json({ success: false, error: denied }, { status: 403 });
  }

  const { partnerId } = await context.params;
  const imageUrl = request.nextUrl.searchParams.get("url");
  const isAvatar = request.nextUrl.searchParams.get("avatar") === "true";

  if (!imageUrl) {
    return NextResponse.json(
      { success: false, error: "URL da imagem obrigatória." },
      { status: 400 }
    );
  }

  const partner = await prisma.professionalPartner.findFirst({
    where: { id: partnerId, company_id: auth.companyId },
  });

  if (!partner) {
    return NextResponse.json(
      { success: false, error: "Parceiro não encontrado ou acesso negado." },
      { status: 404 }
    );
  }

  try {
    if (process.env.BLOB_READ_WRITE_TOKEN && imageUrl.includes("blob.vercel-storage.com")) {
      try {
        await del(imageUrl, { token: process.env.BLOB_READ_WRITE_TOKEN });
      } catch (err) {
        console.error("Erro ao deletar arquivo no Vercel Blob:", err);
      }
    }

    if (isAvatar) {
      const updatedPartner = await prisma.professionalPartner.update({
        where: { id: partnerId },
        data: { fotoUrl: null },
      });
      return NextResponse.json({ success: true, partner: updatedPartner });
    }

    const gallery = removePartnerImage(parsePartnerGallery(partner.imagens), imageUrl);
    const updatedPartner = await prisma.professionalPartner.update({
      where: { id: partnerId },
      data: { imagens: serializePartnerGallery(gallery) },
    });

    return NextResponse.json({ success: true, partner: updatedPartner, gallery });
  } catch (error) {
    console.error("Erro ao excluir imagem do parceiro:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao remover a imagem do banco." },
      { status: 500 }
    );
  }
}
