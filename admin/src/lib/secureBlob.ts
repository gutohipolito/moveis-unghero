import { put, get } from "@vercel/blob";

export type SecureBlobAccess = "private" | "public";

export type SecureBlobBody = File | Blob | Buffer | Uint8Array | ReadableStream | string;

export type SecureBlobResult = {
  url: string;
  pathname: string;
  access: SecureBlobAccess;
  /** URL para o cliente admin (proxy autenticado quando private). */
  clientUrl: string;
};

/** Cópia em ArrayBuffer “limpo”: Buffer do Sharp/Node pode usar SharedArrayBuffer. */
function toFetchSafeBody(body: SecureBlobBody): File | Blob | ReadableStream | string {
  if (typeof body === "string" || body instanceof ReadableStream) return body;
  if (typeof File !== "undefined" && body instanceof File) return body;
  if (typeof Blob !== "undefined" && body instanceof Blob) return body;
  const source = body as Buffer | Uint8Array;
  const bytes = new Uint8Array(source.byteLength);
  bytes.set(source);
  return new Blob([bytes]);
}

/**
 * Upload sensível: tenta Blob private; se o store for público, faz fallback.
 * clientUrl nunca aponta direto para o Blob quando private — usa /api/secure-blob.
 */
export async function putSensitiveBlob(
  pathname: string,
  body: SecureBlobBody,
  options: { contentType?: string; token?: string }
): Promise<SecureBlobResult> {
  const token = options.token ?? process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN não configurado");
  }

  const preferPrivate = process.env.BLOB_FORCE_PUBLIC !== "true";
  const safeBody = toFetchSafeBody(body);

  if (preferPrivate) {
    try {
      const blob = await put(pathname, safeBody, {
        access: "private",
        token,
        contentType: options.contentType,
      });
      return {
        url: blob.url,
        pathname: blob.pathname,
        access: "private",
        clientUrl: `/api/secure-blob?pathname=${encodeURIComponent(blob.pathname)}`,
      };
    } catch (error) {
      console.warn(
        "Blob private indisponível neste store; usando public com proxy auth.",
        error
      );
    }
  }

  const blob = await put(pathname, safeBody, {
    access: "public",
    token,
    contentType: options.contentType,
  });

  // Mesmo em public, o app serve via proxy autenticado (reduz vazamento por UI/Referer).
  return {
    url: blob.url,
    pathname: blob.pathname,
    access: "public",
    clientUrl: `/api/secure-blob?pathname=${encodeURIComponent(blob.pathname)}&fallback=${encodeURIComponent(blob.url)}`,
  };
}

export async function readPrivateBlob(pathname: string) {
  return get(pathname, {
    access: "private",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
}
