import "server-only";

import { readFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

const MAX_EDGE = 1000;
const JPEG_QUALITY = 80;
/** Logo do sistema (MU + MÓVEIS UNGHERO) — public/logo.png (branco com alpha). */
const LOGO_FILE = "logo.png";
const LOGO_ASPECT = 266 / 55;
/** Opacidade sutil do logo central. */
const CENTER_OPACITY = 0.14;

let logoPngCache: Buffer | null = null;

/**
 * Prepara o logo com alpha correto.
 * logo.png já é branco + transparência — NÃO usar luminância (virava quadrado branco).
 * mu-watermark (fundo preto) usaria luminância; aqui preservamos o alpha existente.
 */
export async function getTransparentLogoPng(): Promise<Buffer> {
  if (logoPngCache) return logoPngCache;

  const file = await readFile(path.join(process.cwd(), "public", LOGO_FILE));
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let transparent = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i]! < 40) transparent += 1;
  }
  const total = info.width * info.height;
  const alreadyHasAlpha = transparent > total * 0.25;

  for (let i = 0; i < data.length; i += 4) {
    if (alreadyHasAlpha) {
      // Mantém o desenho do logo; só garante RGB branco
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      // alpha intacto
    } else {
      const lum = (data[i]! + data[i + 1]! + data[i + 2]!) / 3;
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = Math.round(lum);
    }
  }

  logoPngCache = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();

  return logoPngCache;
}

async function fadeLogo(logoPng: Buffer, width: number, height: number, opacity: number) {
  const resized = await sharp(logoPng)
    .resize(width, height, { fit: "inside" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const px = resized.data;
  for (let i = 3; i < px.length; i += 4) {
    px[i] = Math.round(px[i]! * opacity);
  }

  return sharp(px, {
    raw: {
      width: resized.info.width,
      height: resized.info.height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();
}

/**
 * Marca d'água sutil: só o logo do sistema no centro da imagem.
 */
export async function applyPartnerProductWatermark(
  source: Buffer,
  _seed: string
): Promise<{ buffer: Buffer; contentType: "image/jpeg" }> {
  const baseMeta = await sharp(source, { failOn: "none" }).metadata();
  const srcW = baseMeta.width || 800;
  const srcH = baseMeta.height || 800;
  const edge = Math.max(srcW, srcH);
  const scale = edge > MAX_EDGE ? MAX_EDGE / edge : 1;
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));

  const logoPng = await getTransparentLogoPng();
  const logoW = Math.max(100, Math.round(Math.min(w, h) * 0.38));
  const logoH = Math.max(22, Math.round(logoW / LOGO_ASPECT));
  const centerLogo = await fadeLogo(logoPng, logoW, logoH, CENTER_OPACITY);

  const meta = await sharp(centerLogo).metadata();
  const cw = meta.width || logoW;
  const ch = meta.height || logoH;
  const left = Math.max(0, Math.round((w - cw) / 2));
  const top = Math.max(0, Math.round((h - ch) / 2));

  const buffer = await sharp(source, { failOn: "none" })
    .rotate()
    .resize(w, h, { fit: "fill" })
    .composite([{ input: centerLogo, left, top }])
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();

  return { buffer, contentType: "image/jpeg" };
}
