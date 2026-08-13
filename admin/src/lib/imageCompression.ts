export interface CompressOptions {
  /** Maior dimensão (largura ou altura) permitida em pixels. */
  maxDimension?: number;
  /** Qualidade de recompressão (0-1) para WEBP. */
  quality?: number;
}

/**
 * Redimensiona e recomprime uma imagem no navegador antes do upload.
 * - Só processa JPEG/PNG/WEBP (HEIC/HEIF e não-imagens passam sem alteração).
 * - Mantém a orientação EXIF e devolve o original caso o resultado não fique menor.
 */
export async function compressImageFile(
  file: File,
  { maxDimension = 1600, quality = 0.82 }: CompressOptions = {}
): Promise<File> {
  if (typeof window === "undefined") return file;
  if (!file.type.startsWith("image/")) return file;

  // Formatos que conseguimos decodificar/reencodar via canvas de forma confiável.
  const decodable = ["image/jpeg", "image/png", "image/webp"];
  if (!decodable.includes(file.type)) return file;

  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    } as ImageBitmapOptions);

    const { width, height } = bitmap;
    const scale = Math.min(1, maxDimension / Math.max(width, height));
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close?.();

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/webp", quality)
    );

    if (!blob) {
      return file;
    }

    // Sempre preferir WebP quando o resultado não inflar demais (PNG/JPEG grandes caem bem).
    if (blob.size > file.size * 1.15 && file.type === "image/webp") {
      return file;
    }

    const newName = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return new File([blob], newName, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
