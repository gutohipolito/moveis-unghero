import "server-only";

import { createCanvas, loadImage, type Image, type SKRSContext2D } from "@napi-rs/canvas";
import { createHash } from "crypto";
import { readFile } from "fs/promises";
import path from "path";

const MAX_EDGE = 1600;
const JPEG_QUALITY = 86;

let logoImage: Image | null = null;

function hashSeed(seed: string) {
  const hex = createHash("sha256").update(seed).digest();
  return {
    ox: hex[0]! / 255,
    oy: hex[1]! / 255,
    rot: ((hex[2]! / 255) * 14 - 7) * (Math.PI / 180),
    phase: hex[3]! / 255,
  };
}

/** Converte o MU (branco no preto) em logo branca com alpha. */
async function getTransparentLogo(): Promise<Image> {
  if (logoImage) return logoImage;

  const file = await readFile(path.join(process.cwd(), "public", "mu-watermark.png"));
  const img = await loadImage(file);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, img.width, img.height);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    const lum = (px[i]! + px[i + 1]! + px[i + 2]!) / 3;
    px[i] = 255;
    px[i + 1] = 255;
    px[i + 2] = 255;
    px[i + 3] = Math.round(lum);
  }
  ctx.putImageData(data, 0, 0);
  logoImage = await loadImage(canvas.toBuffer("image/png"));
  return logoImage;
}

function drawTiledLogos(
  ctx: SKRSContext2D,
  logo: Image,
  w: number,
  h: number,
  seed: ReturnType<typeof hashSeed>
) {
  const tile = Math.max(72, Math.min(w, h) * 0.16);
  const gapX = tile * 1.55;
  const gapY = tile * 1.35;
  const offsetX = seed.ox * gapX;
  const offsetY = seed.oy * gapY;
  const logoH = tile * (logo.height / logo.width);

  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-18 * (Math.PI / 180) + seed.rot);
  ctx.translate(-w / 2, -h / 2);

  for (let y = -gapY; y < h + gapY; y += gapY) {
    const row = Math.round(y / gapY);
    const stagger = row % 2 === 0 ? 0 : gapX * 0.5;
    for (let x = -gapX; x < w + gapX; x += gapX) {
      ctx.drawImage(logo, x + offsetX + stagger, y + offsetY, tile, logoH);
    }
  }
  ctx.restore();
}

function drawDiagonalText(
  ctx: SKRSContext2D,
  w: number,
  h: number,
  seed: ReturnType<typeof hashSeed>
) {
  const label = "MÓVEIS UNGHERO  ·  ";
  const fontSize = Math.max(14, Math.min(w, h) * 0.028);
  ctx.save();
  ctx.font = `600 ${fontSize}px "Helvetica Neue", Arial, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.textBaseline = "middle";

  const bandGap = fontSize * 4.2;
  const textW = ctx.measureText(label).width;
  const angle = -28 * (Math.PI / 180) + seed.rot * 0.4;

  ctx.translate(w / 2, h / 2);
  ctx.rotate(angle);
  ctx.translate(-w / 2, -h / 2);

  const extend = Math.max(w, h);
  for (let y = -extend; y < h + extend; y += bandGap) {
    const shift = ((y / bandGap) * textW * 0.35 + seed.phase * textW) % textW;
    for (let x = -textW - shift; x < w + extend; x += textW) {
      ctx.fillText(label, x, y);
    }
  }
  ctx.restore();

  // Segunda faixa mais fraca, ângulo cruzado — dificulta inpainting uniforme
  ctx.save();
  ctx.font = `500 ${fontSize * 0.85}px "Helvetica Neue", Arial, sans-serif`;
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  ctx.translate(w / 2, h / 2);
  ctx.rotate(22 * (Math.PI / 180) - seed.rot * 0.3);
  ctx.translate(-w / 2, -h / 2);
  for (let y = -extend; y < h + extend; y += bandGap * 1.3) {
    for (let x = -textW; x < w + extend; x += textW) {
      ctx.fillText(label, x, y);
    }
  }
  ctx.restore();
}

function drawCornerMarks(ctx: SKRSContext2D, logo: Image, w: number, h: number) {
  const size = Math.max(40, Math.min(w, h) * 0.1);
  const pad = size * 0.35;
  const logoH = size * (logo.height / logo.width);

  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.drawImage(logo, pad, pad, size, logoH);
  ctx.drawImage(logo, w - pad - size, h - pad - logoH, size, logoH);
  ctx.restore();
}

/** Ruído luminoso fraco e determinístico — atrapalha remoção “limpa” por IA. */
function drawSeedNoise(ctx: SKRSContext2D, w: number, h: number, seed: string) {
  const step = Math.max(6, Math.round(Math.min(w, h) / 90));
  const hex = createHash("sha256").update(`noise:${seed}`).digest();
  ctx.save();
  for (let y = 0, i = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step, i++) {
      const bit = hex[i % hex.length]!;
      if (bit < 90) continue;
      const a = ((bit % 40) + 10) / 1000; // 0.01–0.049
      ctx.fillStyle = bit % 2 === 0 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }
  ctx.restore();
}

function fitDimensions(srcW: number, srcH: number) {
  const edge = Math.max(srcW, srcH);
  if (edge <= MAX_EDGE) return { w: srcW, h: srcH };
  const scale = MAX_EDGE / edge;
  return {
    w: Math.max(1, Math.round(srcW * scale)),
    h: Math.max(1, Math.round(srcH * scale)),
  };
}

/**
 * Grava a marca Unghero nos pixels (não é overlay CSS).
 * Camadas: tiles do monograma, texto diagonal cruzado, cantos e micro-ruído.
 */
export async function applyPartnerProductWatermark(
  source: Buffer,
  seed: string
): Promise<{ buffer: Buffer; contentType: "image/jpeg" }> {
  const img = await loadImage(source);
  const { w, h } = fitDimensions(img.width, img.height);
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);

  const logo = await getTransparentLogo();
  const seedVals = hashSeed(seed);

  drawTiledLogos(ctx, logo, w, h, seedVals);
  drawDiagonalText(ctx, w, h, seedVals);
  drawCornerMarks(ctx, logo, w, h);
  drawSeedNoise(ctx, w, h, seed);

  return {
    buffer: canvas.toBuffer("image/jpeg", JPEG_QUALITY),
    contentType: "image/jpeg",
  };
}
