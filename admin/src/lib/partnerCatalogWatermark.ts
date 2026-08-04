import "server-only";

import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import {
  applyPartnerProductWatermark,
  getTransparentLogoPng,
} from "@/lib/partnerProductWatermark";

const LOGO_ASPECT = 266 / 55;
/** Opacidade sutil — alinhada às fotos do portal. */
const CENTER_OPACITY = 0.14;

async function fadeLogoForPdf(logoPng: Buffer, opacity: number): Promise<Uint8Array> {
  const { data, info } = await sharp(logoPng)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 3; i < data.length; i += 4) {
    data[i] = Math.round(data[i]! * opacity);
  }

  const png = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();

  return new Uint8Array(png);
}

/**
 * Marca d'água central (logo MU) em cada página do PDF.
 */
export async function applyPartnerCatalogPdfWatermark(
  source: Buffer
): Promise<{ buffer: Buffer; contentType: "application/pdf" }> {
  const pdfDoc = await PDFDocument.load(source, { ignoreEncryption: true });
  const logoPng = await getTransparentLogoPng();
  const fadedLogo = await fadeLogoForPdf(logoPng, CENTER_OPACITY);
  const embedded = await pdfDoc.embedPng(fadedLogo);

  for (const page of pdfDoc.getPages()) {
    const { width, height } = page.getSize();
    const logoW = Math.max(80, Math.min(width, height) * 0.38);
    const logoH = logoW / LOGO_ASPECT;
    const x = (width - logoW) / 2;
    const y = (height - logoH) / 2;
    page.drawImage(embedded, {
      x,
      y,
      width: logoW,
      height: logoH,
    });
  }

  const bytes = await pdfDoc.save();
  return {
    buffer: Buffer.from(bytes),
    contentType: "application/pdf",
  };
}

/**
 * Aplica marca d'água conforme o tipo do arquivo (PDF ou imagem).
 */
export async function applyPartnerCatalogWatermark(
  source: Buffer,
  mimeType: string,
  seed: string
): Promise<{ buffer: Buffer; contentType: string }> {
  const isPdf =
    mimeType === "application/pdf" || mimeType === "application/x-pdf";

  if (isPdf) {
    return applyPartnerCatalogPdfWatermark(source);
  }

  if (mimeType.startsWith("image/")) {
    return applyPartnerProductWatermark(source, seed);
  }

  if (source.subarray(0, 4).toString("ascii") === "%PDF") {
    return applyPartnerCatalogPdfWatermark(source);
  }

  return applyPartnerProductWatermark(source, seed);
}
