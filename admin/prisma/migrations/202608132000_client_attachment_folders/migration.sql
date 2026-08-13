-- Pastas da aba Imagens do cliente (Residência e Documentos por padrão).
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "attachment_folders" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "ClientAttachment" ADD COLUMN IF NOT EXISTS "folder" TEXT NOT NULL DEFAULT 'Residência';

UPDATE "ClientAttachment"
SET "folder" = 'Documentos'
WHERE "tipo" = 'DOCUMENTO'
  AND ("mime_type" = 'application/pdf' OR "mime_type" LIKE 'application/%');
