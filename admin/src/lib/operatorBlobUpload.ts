import { upload } from "@vercel/blob/client";
import { describeUploadException } from "@/lib/uploadErrors";

export async function uploadOperatorBlob(
  file: File,
  options: {
    pathname: string;
    handleUploadUrl: string;
    access: "public" | "private";
    maxBytes: number;
    clientPayload?: Record<string, unknown>;
  }
) {
  try {
    return await upload(options.pathname, file, {
      access: options.access,
      handleUploadUrl: options.handleUploadUrl,
      clientPayload: JSON.stringify({
        originalName: file.name,
        ...(options.clientPayload ?? {}),
      }),
    });
  } catch (error) {
    throw new Error(
      describeUploadException(error, {
        maxBytes: options.maxBytes,
        fileName: file.name,
      })
    );
  }
}

export function safeUploadFilename(name: string): string {
  const base = name.trim().split(/[\\/]/).pop() || "arquivo";
  return base.replace(/[^\w.\-() ]+/g, "_").slice(0, 120) || "arquivo";
}
