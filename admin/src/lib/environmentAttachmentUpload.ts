import type { EnvironmentAttachmentCategory } from "@prisma/client";
import {
  ENVIRONMENT_ATTACHMENT_ALLOWED_HINT,
  ENVIRONMENT_ATTACHMENT_MAX_BYTES,
  guessEnvironmentAttachmentMime,
  isAllowedEnvironmentAttachment,
  type EnvironmentAttachmentDTO,
} from "@/lib/factoryEnvironment";
import { safeUploadFilename, uploadOperatorBlob } from "@/lib/operatorBlobUpload";
import { readUploadResponse, validateOperatorFile } from "@/lib/uploadErrors";

export async function uploadEnvironmentAttachmentFile(
  environmentId: string,
  file: File,
  options: { categoria: EnvironmentAttachmentCategory; setAsCover?: boolean }
): Promise<EnvironmentAttachmentDTO> {
  const invalid = validateOperatorFile(file, {
    maxBytes: ENVIRONMENT_ATTACHMENT_MAX_BYTES,
    isAllowed: isAllowedEnvironmentAttachment,
    allowedHint: ENVIRONMENT_ATTACHMENT_ALLOWED_HINT,
  });
  if (invalid) throw new Error(invalid);

  const blob = await uploadOperatorBlob(file, {
    pathname: `factory-env/${environmentId}/${safeUploadFilename(file.name)}`,
    handleUploadUrl: `/api/factory/environments/${environmentId}/attachments/upload`,
    access: "public",
    maxBytes: ENVIRONMENT_ATTACHMENT_MAX_BYTES,
  });

  const response = await fetch(`/api/factory/environments/${environmentId}/attachments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: blob.url,
      nome: file.name,
      mime_type: guessEnvironmentAttachmentMime(file.name, file.type),
      size_bytes: file.size,
      categoria: options.categoria,
      setAsCover: Boolean(options.setAsCover),
    }),
  });

  const parsed = await readUploadResponse(response, {
    maxBytes: ENVIRONMENT_ATTACHMENT_MAX_BYTES,
    fileName: file.name,
    allowedHint: ENVIRONMENT_ATTACHMENT_ALLOWED_HINT,
  });
  if (!parsed.ok) throw new Error(parsed.error);
  const attachment = parsed.json?.attachment as EnvironmentAttachmentDTO | undefined;
  if (!attachment) {
    throw new Error("O arquivo subiu, mas não apareceu na lista. Atualize a página.");
  }
  return attachment;
}
