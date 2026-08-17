import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { getAuthContext, requireClientInCompany } from "@/lib/auth-guard";
import { requireWriteAccess } from "@/lib/moduleAccess";
import { canManageOperationalMedia } from "@/lib/permissions";
import { putSensitiveBlob } from "@/lib/secureBlob";
import {
  CLIENT_ATTACHMENT_MAX_BYTES,
  clientAttachmentExtension,
  isAllowedClientAttachment,
  CLIENT_FOLDER_RESIDENCIA,
  isDefaultClientFolder,
  isImageMime,
  normalizeClientFolderName,
  resolveClientFolders,
} from "@/lib/clientAttachments";
import type { ClientAttachmentType } from "@prisma/client";

const CLIENT_UPLOAD_MAX_FILES = 20;

function denyMediaWrite(cargo: string | null | undefined) {
  if (canManageOperationalMedia(cargo)) return null;
  return NextResponse.json(
    { success: false, error: "Este cargo pode apenas visualizar os arquivos do cliente." },
    { status: 403 }
  );
}

function toClientUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith("blob.vercel-storage.com")) return url;
    const pathname = parsed.pathname.replace(/^\//, "");
    return `/api/secure-blob?pathname=${encodeURIComponent(pathname)}&fallback=${encodeURIComponent(url)}`;
  } catch {
    return url;
  }
}

function mapAttachment(record: {
  id: string;
  nome: string;
  mime_type: string;
  url: string;
  tipo: ClientAttachmentType;
  folder: string;
  size_bytes: number | null;
  createdAt: Date;
  uploaded_by: { name: string } | null;
  project_id: string | null;
}) {
  return {
    id: record.id,
    nome: record.nome,
    mime_type: record.mime_type,
    url: toClientUrl(record.url),
    tipo: record.tipo,
    folder: record.folder || CLIENT_FOLDER_RESIDENCIA,
    size_bytes: record.size_bytes,
    createdAt: record.createdAt.toISOString(),
    uploaded_by: record.uploaded_by?.name ?? null,
    project_id: record.project_id ?? null,
  };
}

async function resolveProjectId(
  rawProjectId: unknown,
  clientId: string
): Promise<string | null> {
  if (typeof rawProjectId !== "string" || rawProjectId.trim() === "") {
    return null;
  }
  const project = await prisma.project.findFirst({
    where: { id: rawProjectId, client_id: clientId },
    select: { id: true },
  });
  return project?.id ?? null;
}

async function loadFolders(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { attachment_folders: true },
  });
  const attachments = await prisma.clientAttachment.findMany({
    where: { client_id: clientId, project_id: null },
    select: { folder: true },
  });
  return resolveClientFolders(client?.attachment_folders, attachments);
}

async function optimizeImageFile(file: File): Promise<{
  buffer: Buffer;
  contentType: string;
  ext: string;
  nome: string;
}> {
  const input = Buffer.from(await file.arrayBuffer());
  const baseName = file.name.replace(/\.[^.]+$/, "").replace(/[^\w.\-() ]+/g, "_").slice(0, 100);
  try {
    const buffer = await sharp(input)
      .rotate()
      .resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    return {
      buffer,
      contentType: "image/webp",
      ext: "webp",
      nome: `${baseName || "foto"}.webp`,
    };
  } catch (error) {
    console.warn("Sharp não converteu a imagem do cliente; envia o original:", error);
    const mimeType = file.type || "application/octet-stream";
    const ext = file.name.includes(".")
      ? file.name.split(".").pop() || "jpg"
      : mimeType.split("/")[1] || "jpg";
    return {
      buffer: input,
      contentType: mimeType,
      ext,
      nome: file.name.replace(/[^\w.\-() ]+/g, "_").slice(0, 120) || `arquivo.${ext}`,
    };
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ clientId: string }> }
) {
  let auth;
  try {
    auth = await requireWriteAccess("clientes");
  } catch {
    return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
  }
  const mediaDenied = denyMediaWrite(auth.cargo);
  if (mediaDenied) return mediaDenied;

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
  const projectId = await resolveProjectId(formData.get("projectId"), clientId);
  const folderName = normalizeClientFolderName(String(formData.get("folder") || ""));

  if (!projectId && !folderName) {
    return NextResponse.json(
      { success: false, error: "Abra uma pasta para enviar arquivos." },
      { status: 400 }
    );
  }

  const files = formData
    .getAll("file")
    .filter((item): item is File => item instanceof File && item.size > 0);

  if (files.length === 0) {
    return NextResponse.json({ success: false, error: "Arquivo inválido" }, { status: 400 });
  }

  if (files.length > CLIENT_UPLOAD_MAX_FILES) {
    return NextResponse.json(
      { success: false, error: `Envie no máximo ${CLIENT_UPLOAD_MAX_FILES} arquivos por vez.` },
      { status: 400 }
    );
  }

  for (const file of files) {
    if (file.size > CLIENT_ATTACHMENT_MAX_BYTES) {
      return NextResponse.json(
        { success: false, error: `"${file.name}" excede o limite de 10 MB.` },
        { status: 400 }
      );
    }
    if (!isAllowedClientAttachment(file)) {
      return NextResponse.json(
        {
          success: false,
          error: `"${file.name}" não é um formato suportado. Envie imagem, PDF, Office, ZIP, DWG, SketchUp ou vídeo curto.`,
        },
        { status: 400 }
      );
    }
  }

  const folder = folderName || CLIENT_FOLDER_RESIDENCIA;

  try {
    if (!projectId) {
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: { attachment_folders: true },
      });
      const folders = resolveClientFolders(client?.attachment_folders, [{ folder }]);
      if (!folders.some((name) => name.toLowerCase() === folder.toLowerCase())) {
        await prisma.client.update({
          where: { id: clientId },
          data: { attachment_folders: folders.filter((name) => !isDefaultClientFolder(name)) },
        });
      }
    }

    const created = [];
    for (const file of files) {
      const mimeType = file.type || "application/octet-stream";
      const ext = clientAttachmentExtension(file.name);
      const isImage =
        isImageMime(mimeType) ||
        ["jpg", "jpeg", "png", "webp", "heic", "heif", "gif", "avif", "bmp", "tif", "tiff"].includes(
          ext
        );
      const optimized = isImage
        ? await optimizeImageFile(file)
        : {
            buffer: Buffer.from(await file.arrayBuffer()),
            contentType: mimeType,
            ext: file.name.includes(".")
              ? file.name.split(".").pop() || "pdf"
              : "pdf",
            nome: file.name.replace(/[^\w.\-() ]+/g, "_").slice(0, 120) || "documento.pdf",
          };

      const pathname = `clients/${auth.companyId}/${clientId}/${Date.now()}-${crypto.randomUUID()}.${optimized.ext}`;
      const blob = await putSensitiveBlob(pathname, optimized.buffer, {
        contentType: optimized.contentType,
      });
      const tipo: ClientAttachmentType = optimized.contentType.startsWith("image/")
        ? "FOTO"
        : "DOCUMENTO";

      created.push(
        await prisma.clientAttachment.create({
          data: {
            client_id: clientId,
            company_id: auth.companyId,
            project_id: projectId,
            nome: optimized.nome,
            mime_type: optimized.contentType,
            url: blob.url,
            tipo,
            folder,
            size_bytes: optimized.buffer.length,
            uploaded_by_id: auth.userId,
          },
          include: {
            uploaded_by: { select: { name: true } },
          },
        })
      );
    }

    const attachments = created.map(mapAttachment);
    return NextResponse.json({
      success: true,
      attachment: attachments[0],
      attachments,
      folders: await loadFolders(clientId),
    });
  } catch (error) {
    console.error("Erro no upload de anexo do cliente:", error);
    return NextResponse.json(
      { success: false, error: "Não foi possível salvar o arquivo." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ clientId: string }> }
) {
  let auth;
  try {
    auth = await requireWriteAccess("clientes");
  } catch {
    return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
  }
  const mediaDenied = denyMediaWrite(auth.cargo);
  if (mediaDenied) return mediaDenied;

  const { clientId } = await context.params;

  try {
    await requireClientInCompany(clientId, auth.companyId);
  } catch {
    return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
  }

  let body: {
    action?: "create-folder" | "rename-folder" | "delete-folder";
    folder?: string;
    nextName?: string;
    id?: string;
    projectId?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Corpo inválido" }, { status: 400 });
  }

  if (body.action === "create-folder") {
    const folderName = normalizeClientFolderName(body.folder || "");
    if (!folderName) {
      return NextResponse.json({ success: false, error: "Informe o nome da pasta." }, { status: 400 });
    }
    const folders = await loadFolders(clientId);
    if (folders.some((name) => name.toLowerCase() === folderName.toLowerCase())) {
      return NextResponse.json({ success: false, error: "Já existe uma pasta com este nome." }, { status: 400 });
    }
    const extras = folders
      .filter((name) => !isDefaultClientFolder(name))
      .concat(isDefaultClientFolder(folderName) ? [] : [folderName]);
    await prisma.client.update({
      where: { id: clientId },
      data: { attachment_folders: extras },
    });
    return NextResponse.json({
      success: true,
      folders: resolveClientFolders(extras, []),
    });
  }

  if (body.action === "rename-folder") {
    const from = normalizeClientFolderName(body.folder || "");
    const next = normalizeClientFolderName(body.nextName || "");
    if (!from || !next) {
      return NextResponse.json({ success: false, error: "Informe o novo nome da pasta." }, { status: 400 });
    }
    if (isDefaultClientFolder(from)) {
      return NextResponse.json(
        { success: false, error: "As pastas Residência e Documentos não podem ser renomeadas." },
        { status: 400 }
      );
    }
    const folders = await loadFolders(clientId);
    if (
      next.toLowerCase() !== from.toLowerCase() &&
      folders.some((name) => name.toLowerCase() === next.toLowerCase())
    ) {
      return NextResponse.json({ success: false, error: "Já existe uma pasta com este nome." }, { status: 400 });
    }
    await prisma.clientAttachment.updateMany({
      where: { client_id: clientId, company_id: auth.companyId, folder: from, project_id: null },
      data: { folder: next },
    });
    const extras = folders
      .filter((name) => !isDefaultClientFolder(name) && name.toLowerCase() !== from.toLowerCase())
      .concat(isDefaultClientFolder(next) ? [] : [next]);
    await prisma.client.update({
      where: { id: clientId },
      data: { attachment_folders: extras },
    });
    return NextResponse.json({
      success: true,
      folders: await loadFolders(clientId),
    });
  }

  if (body.action === "delete-folder") {
    const folderName = normalizeClientFolderName(body.folder || "");
    if (!folderName) {
      return NextResponse.json({ success: false, error: "Pasta inválida." }, { status: 400 });
    }
    if (isDefaultClientFolder(folderName)) {
      return NextResponse.json(
        { success: false, error: "As pastas Residência e Documentos não podem ser excluídas." },
        { status: 400 }
      );
    }
    const toDelete = await prisma.clientAttachment.findMany({
      where: {
        client_id: clientId,
        company_id: auth.companyId,
        folder: folderName,
        project_id: null,
      },
    });
    for (const attachment of toDelete) {
      if (process.env.BLOB_READ_WRITE_TOKEN && attachment.url.includes("blob.vercel-storage.com")) {
        try {
          await del(attachment.url, { token: process.env.BLOB_READ_WRITE_TOKEN });
        } catch (err) {
          console.error("Erro ao deletar arquivo no Vercel Blob:", err);
        }
      }
    }
    await prisma.clientAttachment.deleteMany({
      where: { id: { in: toDelete.map((item) => item.id) } },
    });
    const folders = await loadFolders(clientId);
    const extras = folders.filter(
      (name) => !isDefaultClientFolder(name) && name.toLowerCase() !== folderName.toLowerCase()
    );
    await prisma.client.update({
      where: { id: clientId },
      data: { attachment_folders: extras },
    });
    return NextResponse.json({
      success: true,
      folders: resolveClientFolders(extras, []),
      deletedIds: toDelete.map((item) => item.id),
    });
  }

  if (!body.id) {
    return NextResponse.json({ success: false, error: "ID do arquivo obrigatório" }, { status: 400 });
  }

  const existing = await prisma.clientAttachment.findFirst({
    where: { id: body.id, client_id: clientId, company_id: auth.companyId },
  });

  if (!existing) {
    return NextResponse.json({ success: false, error: "Arquivo não encontrado" }, { status: 404 });
  }

  const projectId = await resolveProjectId(body.projectId, clientId);

  try {
    const updated = await prisma.clientAttachment.update({
      where: { id: existing.id },
      data: { project_id: projectId },
      include: { uploaded_by: { select: { name: true } } },
    });
    return NextResponse.json({ success: true, attachment: mapAttachment(updated) });
  } catch (error) {
    console.error("Erro ao reatribuir anexo do cliente:", error);
    return NextResponse.json(
      { success: false, error: "Não foi possível atualizar o arquivo." },
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
  const mediaDenied = denyMediaWrite(auth.cargo);
  if (mediaDenied) return mediaDenied;

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
