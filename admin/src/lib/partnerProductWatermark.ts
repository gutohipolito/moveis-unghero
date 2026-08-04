import "server-only";

import { createHash } from "crypto";
import { readFile } from "fs/promises";
import path from "path";
import sharp, { type OverlayOptions } from "sharp";

const MAX_EDGE = 1000;
const JPEG_QUALITY = 80;
const MAX_TILES = 36;

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

/** Converte o MU (branco no preto) em PNG branco com alpha. */
async function getTransparentLogoPng(): Promise<Buffer> {
  if (logoPngCache) return logoPngCache;

  const file = await readFile(path.join(process.cwd(), "public", "mu-watermark.png"));
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

function buildOverlaySvg(
  w: number,
  h: number,
  seed: ReturnType<typeof hashSeed>
): Buffer {
  const fontSize = Math.max(13, Math.min(w, h) * 0.03);
  const bandGap = fontSize * 5;
  const label = "MÓVEIS UNGHERO  ·  ";
  const angle1 = -26 + seed.rotDeg * 0.4;
  const angle2 = 20 - seed.rotDeg * 0.3;
  const approxTextW = Math.max(160, label.length * fontSize * 0.52);
  const lines1: string[] = [];
  const lines2: string[] = [];

  // Poucas faixas — suficiente para marcar e leve no sharp
  for (let y = fontSize; y < h + bandGap; y += bandGap) {
    const shift = (seed.phase * approxTextW + (y / bandGap) * 40) % approxTextW;
    for (let x = -approxTextW + shift; x < w + approxTextW; x += approxTextW) {
      lines1.push(`<text x="${x.toFixed(0)}" y="${y.toFixed(0)}">${label}</text>`);
    }
  }
  for (let y = fontSize * 2; y < h + bandGap; y += bandGap * 1.4) {
    for (let x = 0; x < w + approxTextW; x += approxTextW) {
      lines2.push(`<text x="${x.toFixed(0)}" y="${y.toFixed(0)}">${label}</text>`);
    }
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <g transform="rotate(${angle1.toFixed(2)} ${w / 2} ${h / 2})"
     fill="rgba(255,255,255,0.17)"
     font-family="Arial, Helvetica, sans-serif"
     font-size="${fontSize.toFixed(1)}"
     font-weight="600">${lines1.join("")}</g>
  <g transform="rotate(${angle2.toFixed(2)} ${w / 2} ${h / 2})"
     fill="rgba(0,0,0,0.09)"
     font-family="Arial, Helvetica, sans-serif"
     font-size="${(fontSize * 0.85).toFixed(1)}"
     font-weight="500">${lines2.join("")}</g>
</svg>`;

  return Buffer.from(svg);
}

/**
 * Grava a marca Unghero nos pixels (não é overlay CSS).
 * Usa sharp (nativo na Vercel) — tiles do monograma + texto diagonal + cantos.
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

  const tile = Math.max(56, Math.round(Math.min(w, h) * 0.15));
  const logoRatio = 404 / 563;
  const tileH = Math.round(tile * logoRatio);
  const [tileLogo, cornerLogo] = await Promise.all([
    fadeLogo(logoPng, tile, tileH, 0.16),
    fadeLogo(
      logoPng,
      Math.max(32, Math.round(Math.min(w, h) * 0.1)),
      Math.max(24, Math.round(Math.min(w, h) * 0.1 * logoRatio)),
      0.28
    ),
  ]);

  const tileMeta = await sharp(tileLogo).metadata();
  const tw = tileMeta.width || tile;
  const th = tileMeta.height || tileH;
  const gapX = Math.round(tile * 1.7);
  const gapY = Math.round(tile * 1.5);
  const offsetX = Math.round(seedVals.ox * gapX);
  const offsetY = Math.round(seedVals.oy * gapY);

  const composites: OverlayOptions[] = [];
  let tileCount = 0;
  for (let y = -gapY; y < h + gapY && tileCount < MAX_TILES; y += gapY) {
    const row = Math.round(y / gapY);
    const stagger = row % 2 === 0 ? 0 : Math.round(gapX * 0.5);
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
  const cw = cMeta.width || 40;
  const ch = cMeta.height || 30;
  const pad = Math.round(cw * 0.35);
  composites.push({ input: cornerLogo, left: pad, top: pad });
  composites.push({
    input: cornerLogo,
    left: Math.max(0, w - pad - cw),
    top: Math.max(0, h - pad - ch),
  });
  composites.push({ input: buildOverlaySvg(w, h, seedVals), top: 0, left: 0 });

  const buffer = await sharp(source, { failOn: "none" })
    .rotate()
    .resize(w, h, { fit: "fill" })
    .composite(composites)
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();

  return { buffer, contentType: "image/jpeg" };
}
