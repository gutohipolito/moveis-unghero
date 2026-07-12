export type ClientAttachmentDTO = {
  id: string;
  nome: string;
  mime_type: string;
  url: string;
  tipo: "FOTO" | "DOCUMENTO";
  size_bytes: number | null;
  createdAt: string;
  uploaded_by: string | null;
  project_id: string | null;
};

export const CLIENT_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export const CLIENT_ATTACHMENT_ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf";

export const CLIENT_ATTACHMENT_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

export function isImageMime(mime: string) {
  return mime.startsWith("image/");
}

export function formatAttachmentSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
