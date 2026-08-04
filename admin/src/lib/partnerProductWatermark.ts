import "server-only";

import { createHash } from "crypto";
import { readFile } from "fs/promises";
import path from "path";
import sharp, { type OverlayOptions } from "sharp";

const MAX_EDGE = 1000;
const JPEG_QUALITY = 80;
const MAX_TILES = 28;
/** Logo do sistema (MU + MÓVEIS UNGHERO) — public/logo.png */
const LOGO_FILE = "logo.png";
const LOGO_ASPECT = 266 / 55;

let logoPngCache: Buffer | null = null;

function hashSeed(seed: string) {
  const hex = createHash("sha256").update(seed).digest();
  return {
    ox: hex[0]! / 255,
    oy: hex[1]! / 255,
    rotDeg: (hex[2]! / 255) * 10 - 5,
    phase: hex[3]! / 255,
  };
}

/** Converte o logo do sistema (branco no preto) em PNG branco com alpha. */
async function getTransparentLogoPng(): Promise<Buffer> {
  if (logoPngCache) return logoPngCache;

  const file = await readFile(path.join(process.cwd(), "public", LOGO_FILE));
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const lum = (data[i]! + data[i + 1]! + data[i + 2]!) / 3;
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    data[i + 3] = Math.round(lum);
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
 * Grava o logo Unghero do sistema nos pixels (não é overlay CSS).
 * Tiles + cantos com public/logo.png.
 */
export async function applyPartnerProductWatermark(
  source: Buffer,
  seed: string
): Promise<{ buffer: Buffer; contentType: "image/jpeg" }> {
  const baseMeta = await sharp(source, { failOn: "none" }).metadata();
  const srcW = baseMeta.width || 800;
  const srcH = baseMeta.height || 800;
  const edge = Math.max(srcW, srcH);
  const scale = edge > MAX_EDGE ? MAX_EDGE / edge : 1;
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));

  const seedVals = hashSeed(seed);
  const logoPng = await getTransparentLogoPng();

  // Logo horizontal: largura ~22% da menor aresta
  const tileW = Math.max(90, Math.round(Math.min(w, h) * 0.22));
  const tileH = Math.max(20, Math.round(tileW / LOGO_ASPECT));
  const cornerW = Math.max(72, Math.round(Math.min(w, h) * 0.18));
  const cornerH = Math.max(16, Math.round(cornerW / LOGO_ASPECT));

  const [tileLogo, cornerLogo] = await Promise.all([
    fadeLogo(logoPng, tileW, tileH, 0.18),
    fadeLogo(logoPng, cornerW, cornerH, 0.32),
  ]);

  const tileMeta = await sharp(tileLogo).metadata();
  const tw = tileMeta.width || tileW;
  const th = tileMeta.height || tileH;
  const gapX = Math.round(tw * 1.55);
  const gapY = Math.round(th * 2.4);
  const offsetX = Math.round(seedVals.ox * gapX);
  const offsetY = Math.round(seedVals.oy * gapY);

  const composites: OverlayOptions[] = [];
  let tileCount = 0;
  for (let y = -gapY; y < h + gapY && tileCount < MAX_TILES; y += gapY) {
    const row = Math.round(y / gapY);
    const stagger = row % 2 === 0 ? 0 : Math.round(gapX * 0.45);
    for (let x = -gapX; x < w + gapX && tileCount < MAX_TILES; x += gapX) {
      const left = x + offsetX + stagger;
      const top = y + offsetY;
      if (left + tw < 0 || top + th < 0 || left >= w || top >= h) continue;
      composites.push({
        input: tileLogo,
        left: Math.max(0, Math.min(w - tw, left)),
        top: Math.max(0, Math.min(h - th, top)),
      });
      tileCount += 1;
    }
  }

  const cMeta = await sharp(cornerLogo).metadata();
  const cw = cMeta.width || cornerW;
  const ch = cMeta.height || cornerH;
  const pad = Math.max(10, Math.round(Math.min(w, h) * 0.025));
  composites.push({ input: cornerLogo, left: pad, top: pad });
  composites.push({
    input: cornerLogo,
    left: Math.max(0, w - pad - cw),
    top: Math.max(0, h - pad - ch),
  });

  const buffer = await sharp(source, { failOn: "none" })
    .rotate()
    .resize(w, h, { fit: "fill" })
    .composite(composites)
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();

  return { buffer, contentType: "image/jpeg" };
}
