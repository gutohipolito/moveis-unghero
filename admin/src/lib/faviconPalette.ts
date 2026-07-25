/** Extrai paleta sutil a partir do favicon da marca (client-side). */

export type BrandPalette = {
  primary: string;
  secondary: string;
  soft: string;
  soft2: string;
  border: string;
  badgeBg: string;
  badgeText: string;
  iconBg: string;
};

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
    .join("")}`;
}

function mixWithWhite(r: number, g: number, b: number, amount: number) {
  return {
    r: Math.round(r + (255 - r) * amount),
    g: Math.round(g + (255 - g) * amount),
    b: Math.round(b + (255 - b) * amount),
  };
}

function mixWithBlack(r: number, g: number, b: number, amount: number) {
  return {
    r: Math.round(r * (1 - amount)),
    g: Math.round(g * (1 - amount)),
    b: Math.round(b * (1 - amount)),
  };
}

function luminance(r: number, g: number, b: number) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

type Bucket = { r: number; g: number; b: number; w: number };

/**
 * Amostra o favicon e devolve cores saturadas o bastante para ribbon/gradiente,
 * ignorando branco/preto/transparente.
 */
export function extractBrandPaletteFromImage(img: HTMLImageElement): BrandPalette | null {
  try {
    const size = 48;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    const buckets = new Map<string, Bucket>();

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 140) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = luminance(r, g, b);
      if (lum > 0.92 || lum < 0.08) continue;

      // Quantiza para agrupar tons próximos
      const key = `${r >> 4},${g >> 4},${b >> 4}`;
      const sat =
        (Math.max(r, g, b) - Math.min(r, g, b)) / (Math.max(r, g, b) || 1);
      const weight = 1 + sat * 2;
      const prev = buckets.get(key);
      if (prev) {
        prev.r += r * weight;
        prev.g += g * weight;
        prev.b += b * weight;
        prev.w += weight;
      } else {
        buckets.set(key, { r: r * weight, g: g * weight, b: b * weight, w: weight });
      }
    }

    if (buckets.size === 0) return null;

    const ranked = [...buckets.values()]
      .map((b) => ({
        r: b.r / b.w,
        g: b.g / b.w,
        b: b.b / b.w,
        w: b.w,
      }))
      .sort((a, b) => b.w - a.w);

    const main = ranked[0];
    const second =
      ranked.find((c) => {
        const dr = c.r - main.r;
        const dg = c.g - main.g;
        const db = c.b - main.b;
        return Math.sqrt(dr * dr + dg * dg + db * db) > 40;
      }) || mixWithBlack(main.r, main.g, main.b, 0.22);

    const soft = mixWithWhite(main.r, main.g, main.b, 0.88);
    const soft2 = mixWithWhite(second.r, second.g, second.b, 0.9);
    const darkText = mixWithBlack(main.r, main.g, main.b, 0.45);

    return {
      primary: rgbToHex(main.r, main.g, main.b),
      secondary: rgbToHex(second.r, second.g, second.b),
      soft: rgbToHex(soft.r, soft.g, soft.b),
      soft2: rgbToHex(soft2.r, soft2.g, soft2.b),
      border: rgbToHex(
        mixWithWhite(main.r, main.g, main.b, 0.55).r,
        mixWithWhite(main.r, main.g, main.b, 0.55).g,
        mixWithWhite(main.r, main.g, main.b, 0.55).b
      ),
      badgeBg: `rgba(${Math.round(main.r)}, ${Math.round(main.g)}, ${Math.round(main.b)}, 0.12)`,
      badgeText: rgbToHex(darkText.r, darkText.g, darkText.b),
      iconBg: `rgba(${Math.round(main.r)}, ${Math.round(main.g)}, ${Math.round(main.b)}, 0.14)`,
    };
  } catch {
    return null;
  }
}
