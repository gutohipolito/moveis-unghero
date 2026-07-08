import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { getAuthContext, requireClientInCompany } from "@/lib/auth-guard";
import {
  CLIENT_ATTACHMENT_MAX_BYTES,
  CLIENT_ATTACHMENT_MIME_TYPES,
} from "@/lib/clientAttachments";
import type { ClientAttachmentType } from "@prisma/client";

function mapAttachment(record: {
  id: string;
  nome: string;
  mime_type: string;
  url: string;
  tipo: ClientAttachmentType;
  size_bytes: number | null;
  createdAt: Date;
  uploaded_by: { name: string } | null;
}) {
  return {
    id: record.id,
    nome: record.nome,
    mime_type: record.mime_type,
    url: record.url,
    tipo: record.tipo,
    size_bytes: record.size_bytes,
    createdAt: record.createdAt.toISOString(),
    uploaded_by: record.uploaded_by?.name ?? null,
  };
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ clientId: string }> }
) {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
  }

  const { clientId } = await context.params;

  try {
    await requireClientInCompany(clientId, auth.companyId);
  } catch {
    return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Armazenamento de arquivos não configurado. Adicione BLOB_READ_WRITE_TOKEN na Vercel.",
      },
      { status: 503 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ success: false, error: "Arquivo inválido" }, { status: 400 });
  }

  if (file.size > CLIENT_ATTACHMENT_MAX_BYTES) {
    return NextResponse.json(
      { success: false, error: "Arquivo excede o limite de 10 MB" },
      { status: 400 }
    );
  }

  const mimeType = file.type || "application/octet-stream";
  if (!CLIENT_ATTACHMENT_MIME_TYPES.has(mimeType)) {
    return NextResponse.json(
      { success: false, error: "Formato não suportado. Use JPG, PNG, WEBP ou PDF." },
      { status: 400 }
    );
  }

  const safeName = file.name.replace(/[^\w.\-() ]+/g, "_").slice(0, 120);
  const ext = safeName.includes(".") ? safeName.split(".").pop() : mimeType.split("/")[1];
  const pathname = `clients/${auth.companyId}/${clientId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  try {
    const blob = await put(pathname, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: mimeType,
    });

    const tipo: ClientAttachmentType = mimeType.startsWith("image/") ? "FOTO" : "DOCUMENTO";

    const attachment = await prisma.clientAttachment.create({
      data: {
        client_id: clientId,
        company_id: auth.companyId,
        nome: safeName || `arquivo.${ext}`,
        mime_type: mimeType,
        url: blob.url,
        tipo,
        size_bytes: file.size,
        uploaded_by_id: auth.userId,
      },
      include: {
        uploaded_by: { select: { name: true } },
      },
    });

    return NextResponse.json({ success: true, attachment: mapAttachment(attachment) });
  } catch (error) {
    console.error("Erro no upload de anexo do cliente:", error);
    return NextResponse.json(
      { success: false, error: "Não foi possível salvar o arquivo." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ clientId: string }> }
) {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
  }

  const { clientId } = await context.params;
  const attachmentId = request.nextUrl.searchParams.get("id");

  if (!attachmentId) {
    return NextResponse.json({ success: false, error: "ID do arquivo obrigatório" }, { status: 400 });
  }

  try {
    await requireClientInCompany(clientId, auth.companyId);
  } catch {
    return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
  }

  const attachment = await prisma.clientAttachment.findFirst({
    where: { id: attachmentId, client_id: clientId, company_id: auth.companyId },
  });

  if (!attachment) {
    return NextResponse.json({ success: false, error: "Arquivo não encontrado" }, { status: 404 });
  }

  try {
    if (process.env.BLOB_READ_WRITE_TOKEN && attachment.url.includes("blob.vercel-storage.com")) {
      await del(attachment.url, { token: process.env.BLOB_READ_WRITE_TOKEN });
    }

    await prisma.clientAttachment.delete({ where: { id: attachment.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir anexo do cliente:", error);
    return NextResponse.json(
      { success: false, error: "Não foi possível excluir o arquivo." },
      { status: 500 }
    );
  }
}
