import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import type { EnvironmentAttachmentCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthContext, requireEnvironmentInCompany } from "@/lib/auth-guard";
import {
  ENVIRONMENT_ATTACHMENT_ALLOWED_HINT,
  ENVIRONMENT_ATTACHMENT_MAX_BYTES,
  ENVIRONMENT_ATTACHMENT_CATEGORIES,
  canManageEnvironmentAttachments,
  formatAttachmentSize,
  guessEnvironmentAttachmentMime,
  isAllowedEnvironmentAttachment,
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

function parseCategory(raw: unknown): EnvironmentAttachmentCategory {
  if (typeof raw === "string" && VALID_CATEGORIES.has(raw as EnvironmentAttachmentCategory)) {
    return raw as EnvironmentAttachmentCategory;
  }
  return "FOTO";
}

function isVercelBlobUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith("blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json(
      { success: false, error: "Sua sessão expirou. Entre de novo no painel e tente enviar o arquivo." },
      { status: 401 }
    );
  }

  if (!canManageEnvironmentAttachments(auth.cargo)) {
    return NextResponse.json(
      {
        success: false,
        error: "Este cargo não pode enviar arquivos nesta pasta. Peça para o projetista ou a diretoria.",
      },
      { status: 403 }
    );
  }

  const { id: environmentId } = await context.params;

  try {
    await requireEnvironmentInCompany(environmentId, auth.companyId);
  } catch {
    return NextResponse.json(
      { success: false, error: "Não encontramos este cômodo. Atualize a página e tente de novo." },
      { status: 403 }
    );
  }

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    let body: {
      url?: string;
      nome?: string;
      mime_type?: string;
      size_bytes?: number;
      categoria?: string;
      setAsCover?: boolean;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: "Não foi possível ler os dados do arquivo." }, { status: 400 });
    }

    const url = typeof body.url === "string" ? body.url.trim() : "";
    const nome = (body.nome || "arquivo").replace(/[^\w.\-() ]+/g, "_").slice(0, 120);
    if (!isVercelBlobUrl(url)) {
      return NextResponse.json(
        { success: false, error: "O arquivo enviado não chegou ao armazenamento. Tente de novo." },
        { status: 400 }
      );
    }
    if (!isAllowedEnvironmentAttachment({ name: nome, type: body.mime_type })) {
      return NextResponse.json(
        { success: false, error: `"${nome}" não é um formato aceito. ${ENVIRONMENT_ATTACHMENT_ALLOWED_HINT}` },
        { status: 400 }
      );
    }
    const sizeBytes = typeof body.size_bytes === "number" ? body.size_bytes : null;
    if (sizeBytes && sizeBytes > ENVIRONMENT_ATTACHMENT_MAX_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `"${nome}" ultrapassa o limite de ${formatAttachmentSize(ENVIRONMENT_ATTACHMENT_MAX_BYTES)}.`,
        },
        { status: 400 }
      );
    }

    const mimeType = guessEnvironmentAttachmentMime(nome, body.mime_type);
    const categoria = parseCategory(body.categoria);
    try {
      const attachment = await prisma.environmentAttachment.create({
        data: {
          environment_id: environmentId,
          company_id: auth.companyId,
          nome,
          mime_type: mimeType,
          url,
          size_bytes: sizeBytes,
          categoria,
          uploaded_by_id: auth.userId,
        },
        include: { uploaded_by: { select: { name: true } } },
      });
      if (body.setAsCover && mimeType.startsWith("image/")) {
        await prisma.environment.update({
          where: { id: environmentId },
          data: { capa_attachment_id: attachment.id },
        });
      }
      return NextResponse.json({ success: true, attachment: mapAttachment(attachment) });
    } catch (error) {
      console.error("Erro ao registrar anexo do cômodo:", error);
      return NextResponse.json(
        { success: false, error: "O servidor não conseguiu salvar o arquivo. Tente de novo em instantes." },
        { status: 500 }
      );
    }
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
  const categoria = parseCategory(formData.get("categoria"));
  const setAsCover = formData.get("setAsCover") === "true";

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ success: false, error: "Arquivo inválido. Escolha outro e tente de novo." }, { status: 400 });
  }

  if (file.size > ENVIRONMENT_ATTACHMENT_MAX_BYTES) {
    return NextResponse.json(
      {
        success: false,
        error: `"${file.name}" ultrapassa o limite de ${formatAttachmentSize(ENVIRONMENT_ATTACHMENT_MAX_BYTES)}.`,
      },
      { status: 400 }
    );
  }

  if (!isAllowedEnvironmentAttachment(file)) {
    return NextResponse.json(
      { success: false, error: `"${file.name}" não é um formato aceito. ${ENVIRONMENT_ATTACHMENT_ALLOWED_HINT}` },
      { status: 400 }
    );
  }

  const mimeType = guessEnvironmentAttachmentMime(file.name, file.type);
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
      { success: false, error: "O servidor não conseguiu salvar o arquivo. Tente de novo em instantes." },
      { status: 500 }
    );
  }
}
