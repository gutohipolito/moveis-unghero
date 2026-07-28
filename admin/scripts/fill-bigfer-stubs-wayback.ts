/**
 * Completa stubs do catálogo Bigfer via Wayback Machine (quando o site bloqueia).
 * Uso: npx tsx scripts/fill-bigfer-stubs-wayback.ts
 * Depois: npx tsx scripts/import-bigfer-catalog.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

type ScrapedProduct = {
  categoria_pai: string;
  caminho: string;
  titulo_menu: string;
  titulo: string;
  descricao: string;
  cor: string | null;
  imagem: string | null;
  fonte: string;
  ok: boolean;
  erro?: string;
};

const TARGET_CATEGORIES = new Set([
  "Sapatas",
  "Sistemas de Fixação",
  "Sistemas e Articuladores",
  "Sistemas para Portas de Correr",
]);

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function clean(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function meta(html: string, prop?: string, name?: string): string | null {
  const attr = prop ? `property=["']${prop}["']` : `name=["']${name}["']`;
  let m = html.match(new RegExp(`<meta[^>]+${attr}[^>]+content=["']([^"']+)["']`, "i"));
  if (!m) {
    m = html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+${attr}`, "i"));
  }
  return m ? clean(m[1]) : null;
}

function extractSpecs(html: string): Record<string, string> {
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  const items = [...text.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((m) => clean(m[1]));
  const specs: Record<string, string> = {};
  for (const it of items) {
    const m = it.match(/^(Material|Carga\s*m[aá]xima|Acabamentos?)\s*:\s*(.+)$/i);
    if (!m) continue;
    let key = m[1].replace(/\s+/g, " ").trim();
    let val = m[2].trim().replace(/^s:\s*/i, "");
    if (/rediç|Ver Todos|Nossos Produtos/i.test(val) || val.length < 2 || val.length > 220) continue;
    if (/^acabamento/i.test(key)) key = "Acabamento";
    else if (/^carga/i.test(key)) key = "Carga máxima";
    else if (/^material/i.test(key)) key = "Material";
    specs[key] = val;
  }
  return specs;
}

function colorsFromAcabamento(acab: string | undefined): string | null {
  if (!acab) return null;
  return (
    acab
      .split(/\s*\|\s*|\s+e\s+/i)
      .map((p) => p.replace(/^Pintura\s+/i, "").trim())
      .filter(Boolean)
      .join("; ") || null
  );
}

function buildDescricao(ogDesc: string | null, specs: Record<string, string>, cor: string | null): string {
  const lines: string[] = [];
  if (ogDesc) lines.push(ogDesc);
  for (const key of ["Material", "Carga máxima"]) {
    if (specs[key]) lines.push(`${key}: ${specs[key]}`);
  }
  if (cor) lines.push(`Cores: ${cor}`);
  return lines.join("\n");
}

function rewriteWaybackAsset(url: string | null): string | null {
  if (!url) return null;
  // web.archive.org/web/TIMESTAMP/https://... → prefer live CDN URL when possible
  const m = url.match(/web\.archive\.org\/web\/\d+(?:im_)?\/(https?:\/\/.+)$/i);
  if (m) return m[1];
  return url;
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function waybackSnapshot(url: string): Promise<string | null> {
  // 1) API rápida
  try {
    const api = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;
    const res = await fetch(api, { headers: { "User-Agent": UA } });
    if (res.ok) {
      const data = (await res.json()) as {
        archived_snapshots?: { closest?: { available?: boolean; url?: string } };
      };
      const closest = data.archived_snapshots?.closest;
      if (closest?.available && closest.url) {
        return closest.url.replace(/^http:\/\//i, "https://");
      }
    }
  } catch {
    // fall through to CDX
  }

  // 2) CDX (mais completo)
  try {
    const cdx = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(url)}&output=json&limit=5&filter=statuscode:200&fl=timestamp,original`;
    const res = await fetch(cdx, { headers: { "User-Agent": UA } });
    if (!res.ok) return null;
    const rows = (await res.json()) as string[][];
    if (!Array.isArray(rows) || rows.length < 2) return null;
    // last row tends to be newest among returned
    const [, timestamp, original] = rows[rows.length - 1].length >= 2
      ? ["", rows[rows.length - 1][0], rows[rows.length - 1][1]]
      : ["", "", ""];
    if (!timestamp) return null;
    const target = original || url;
    return `https://web.archive.org/web/${timestamp}/${target}`;
  } catch {
    return null;
  }
}

async function scrapeViaWayback(item: ScrapedProduct): Promise<ScrapedProduct> {
  try {
    const snap = await waybackSnapshot(item.fonte);
    if (!snap) return { ...item, erro: "sem snapshot wayback" };

    const res = await fetch(snap, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      redirect: "follow",
    });
    if (!res.ok) return { ...item, erro: `wayback HTTP ${res.status}` };
    const html = await res.text();

    let titulo = meta(html, "og:title") || "";
    titulo = titulo.replace(/\s*[-|]\s*Bigfer\s*$/i, "").trim();
    if (!titulo) {
      const tm = html.match(/<title>([^<]+)<\/title>/i);
      titulo = tm ? clean(tm[1]).replace(/\s*[-|]\s*Bigfer\s*$/i, "").trim() : item.titulo_menu;
    }

    const ogDesc = meta(html, "og:description") || meta(html, undefined, "description");
    const specs = extractSpecs(html);
    const cor = colorsFromAcabamento(specs.Acabamento);
    const imagem = rewriteWaybackAsset(meta(html, "og:image"));

    return {
      ...item,
      titulo,
      descricao: buildDescricao(ogDesc, specs, cor),
      cor,
      imagem,
      ok: true,
      erro: undefined,
    };
  } catch (e) {
    return { ...item, ok: false, erro: e instanceof Error ? e.message : String(e) };
  }
}

async function main() {
  const path = join(__dirname, "data", "bigfer-catalog.json");
  const catalog = JSON.parse(readFileSync(path, "utf8")) as ScrapedProduct[];
  const idxs = catalog
    .map((p, i) => (!p.ok && TARGET_CATEGORIES.has(p.categoria_pai) ? i : -1))
    .filter((i) => i >= 0);

  console.log(`Completando ${idxs.length} stubs via Wayback…`);
  let done = 0;
  let okN = 0;
  for (const i of idxs) {
    catalog[i] = await scrapeViaWayback(catalog[i]);
    if (catalog[i].ok) okN++;
    done++;
    if (done % 10 === 0 || done === idxs.length) {
      console.log(`  ${done}/${idxs.length} | recuperados nesta rodada: ${okN}`);
      writeFileSync(path, JSON.stringify(catalog, null, 2), "utf8");
    }
    await sleep(400);
  }

  const fail = catalog.filter((p) => !p.ok && TARGET_CATEGORIES.has(p.categoria_pai));
  console.log(`---\nOK nas categorias alvo: ${idxs.length - fail.length}/${idxs.length}`);
  console.log(`Ainda falhando: ${fail.length}`);
  for (const f of fail.slice(0, 10)) console.log(`  ! ${f.fonte} — ${f.erro}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
