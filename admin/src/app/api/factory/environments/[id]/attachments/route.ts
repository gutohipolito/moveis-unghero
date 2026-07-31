import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import type { EnvironmentAttachmentCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthContext, requireEnvironmentInCompany } from "@/lib/auth-guard";
import {
  ENVIRONMENT_ATTACHMENT_MAX_BYTES,
  ENVIRONMENT_ATTACHMENT_MIME_TYPES,
  ENVIRONMENT_ATTACHMENT_CATEGORIES,
  canManageEnvironmentAttachments,
} from "@/lib/factoryEnvironment";

const VALID_CATEGORIES = new Set(
  ENVIRONMENT_ATTACHMENT_CATEGORIES.map((item) => item.value)
);

function mapAttachment(record: {
  id: string;
  nome: string;
  mime_type: string;
  url: string;
  size_bytes: number | null;
  categoria: EnvironmentAttachmentCategory;
  createdAt: Date;
  uploaded_by: { name: string } | null;
}) {
  return {
    id: record.id,
    nome: record.nome,
    mime_type: record.mime_type,
    url: record.url,
    size_bytes: record.size_bytes,
    categoria: record.categoria,
    createdAt: record.createdAt.toISOString(),
    uploaded_by: record.uploaded_by?.name ?? null,
  };
}

function parseCategory(raw: FormDataEntryValue | null): EnvironmentAttachmentCategory {
  if (typeof raw === "string" && VALID_CATEGORIES.has(raw as EnvironmentAttachmentCategory)) {
    return raw as EnvironmentAttachmentCategory;
  }
  return "FOTO";
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
  }

  if (!canManageEnvironmentAttachments(auth.cargo)) {
    return NextResponse.json(
      { success: false, error: "Marceneiro pode apenas visualizar os arquivos." },
      { status: 403 }
    );
  }

  const { id: environmentId } = await context.params;

  try {
    await requireEnvironmentInCompany(environmentId, auth.companyId);
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
  const categoria = parseCategory(formData.get("categoria"));
  const setAsCover = formData.get("setAsCover") === "true";

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ success: false, error: "Arquivo inválido" }, { status: 400 });
  }

  if (file.size > ENVIRONMENT_ATTACHMENT_MAX_BYTES) {
    return NextResponse.json(
      { success: false, error: "Arquivo excede o limite de 10 MB" },
      { status: 400 }
    );
  }

  const mimeType = file.type || "application/octet-stream";
  if (!ENVIRONMENT_ATTACHMENT_MIME_TYPES.has(mimeType)) {
    return NextResponse.json(
      { success: false, error: "Formato não suportado. Use JPG, PNG, WEBP ou PDF." },
      { status: 400 }
    );
  }

  const safeName = file.name.replace(/[^\w.\-() ]+/g, "_").slice(0, 120);
  const ext = safeName.includes(".") ? safeName.split(".").pop() : mimeType.split("/")[1];
  const pathname = `factory/${auth.companyId}/environments/${environmentId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  try {
    const blob = await put(pathname, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: mimeType,
    });

    const attachment = await prisma.environmentAttachment.create({
      data: {
        environment_id: environmentId,
        company_id: auth.companyId,
        nome: safeName || `arquivo.${ext}`,
        mime_type: mimeType,
        url: blob.url,
        size_bytes: file.size,
        categoria,
        uploaded_by_id: auth.userId,
      },
      include: {
        uploaded_by: { select: { name: true } },
      },
    });

    if (setAsCover && mimeType.startsWith("image/")) {
      await prisma.environment.update({
        where: { id: environmentId },
        data: { capa_attachment_id: attachment.id },
      });
    }

    return NextResponse.json({ success: true, attachment: mapAttachment(attachment) });
  } catch (error) {
    console.error("Erro no upload de anexo do cômodo:", error);
    return NextResponse.json(
      { success: false, error: "Não foi possível salvar o arquivo." },
      { status: 500 }
    );
  }
}
