export const CLIENT_FOLDER_RESIDENCIA = "Residência";
export const CLIENT_FOLDER_DOCUMENTOS = "Documentos";
export const CLIENT_DEFAULT_FOLDERS = [
  CLIENT_FOLDER_RESIDENCIA,
  CLIENT_FOLDER_DOCUMENTOS,
] as const;

export type ClientAttachmentDTO = {
  id: string;
  nome: string;
  mime_type: string;
  url: string;
  tipo: "FOTO" | "DOCUMENTO";
  folder: string;
  size_bytes: number | null;
  createdAt: string;
  uploaded_by: string | null;
  project_id: string | null;
};

export const CLIENT_ATTACHMENT_MAX_BYTES = 200 * 1024 * 1024; // 200 MB (upload direto no Blob)

export const CLIENT_ATTACHMENT_ALLOWED_HINT =
  "Envie imagem, PDF, Office, ZIP, DWG, SketchUp (.skp) ou vídeo curto (até 200 MB).";

const CLIENT_ATTACHMENT_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "heic",
  "heif",
  "gif",
  "avif",
  "bmp",
  "tif",
  "tiff",
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "odt",
  "ods",
  "txt",
  "csv",
  "zip",
  "rar",
  "7z",
  "dwg",
  "dxf",
  "skp",
  "3ds",
  "obj",
  "stl",
  "mp4",
  "mov",
] as const;

export const CLIENT_ATTACHMENT_ACCEPT = [
  "image/*",
  "application/pdf",
  ...CLIENT_ATTACHMENT_EXTENSIONS.map((ext) => `.${ext}`),
].join(",");

export const CLIENT_ATTACHMENT_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/gif",
  "image/avif",
  "image/bmp",
  "image/tiff",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/vnd.rar",
  "application/x-7z-compressed",
  "image/vnd.dwg",
  "application/acad",
  "application/dxf",
  "image/vnd.dxf",
  "application/vnd.sketchup.skp",
  "video/mp4",
  "video/quicktime",
]);

const CLIENT_ATTACHMENT_EXT_SET = new Set<string>(CLIENT_ATTACHMENT_EXTENSIONS);

export function clientAttachmentExtension(name: string): string {
  const base = name.trim().split(/[\\/]/).pop() || "";
  const dot = base.lastIndexOf(".");
  if (dot < 0 || dot === base.length - 1) return "";
  return base.slice(dot + 1).toLowerCase();
}

export function isAllowedClientAttachment(file: { name: string; type?: string | null }): boolean {
  const mime = (file.type || "").toLowerCase();
  if (mime && mime !== "application/octet-stream" && CLIENT_ATTACHMENT_MIME_TYPES.has(mime)) {
    return true;
  }
  const ext = clientAttachmentExtension(file.name);
  return CLIENT_ATTACHMENT_EXT_SET.has(ext);
}

export function isImageMime(mime: string) {
  return mime.startsWith("image/");
}

export function formatAttachmentSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function normalizeClientFolderName(name: string): string {
  return name.trim().replace(/\s+/g, " ").slice(0, 60);
}

export function isDefaultClientFolder(name: string): boolean {
  return CLIENT_DEFAULT_FOLDERS.some(
    (folder) => folder.toLowerCase() === name.trim().toLowerCase()
  );
}

export function resolveClientFolders(
  stored: string[] | null | undefined,
  attachments: { folder?: string | null }[]
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of [
    ...CLIENT_DEFAULT_FOLDERS,
    ...(stored || []),
    ...attachments.map((item) => item.folder || ""),
  ]) {
    const name = normalizeClientFolderName(raw);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}
