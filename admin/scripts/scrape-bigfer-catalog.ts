/**
 * Raspa o catálogo Bigfer a partir do índice do menu.
 * Uso: npx tsx scripts/scrape-bigfer-catalog.ts
 *
 * Lê:  scripts/data/bigfer-menu-index.json
 * Grava: scripts/data/bigfer-catalog.json
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

type MenuItem = {
  categoria_pai: string;
  caminho: string;
  titulo_menu: string;
  url: string;
};

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

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const CONCURRENCY = 2; // Wordfence bloqueia com rajadas maiores

function clean(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
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
    let val = m[2].trim();
    if (/rediç|Ver Todos|Nossos Produtos/i.test(val)) continue;
    if (val.length < 2 || val.length > 220) continue;
    val = val.replace(/^s:\s*/i, "");
    if (/^acabamento/i.test(key)) key = "Acabamento";
    else if (/^carga/i.test(key)) key = "Carga máxima";
    else if (/^material/i.test(key)) key = "Material";
    specs[key] = val;
  }
  return specs;
}

function colorsFromAcabamento(acab: string | undefined): string | null {
  if (!acab) return null;
  const parts = acab
    .split(/\s*\|\s*|\s+e\s+/i)
    .map((p) => p.replace(/^Pintura\s+/i, "").trim())
    .filter(Boolean);
  if (!parts.length) return null;
  return parts.join("; ");
}

function buildDescricao(ogDesc: string | null, specs: Record<string, string>, cor: string | null): string {
  const lines: string[] = [];
  if (ogDesc) lines.push(ogDesc);
  for (const key of ["Material", "Carga máxima"]) {
    if (specs[key]) lines.push(`${key}: ${specs[key]}`);
  }
  // extras úteis das listagens (ex.: roldana)
  // cor separada
  if (cor) lines.push(`Cores: ${cor}`);
  return lines.join("\n");
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function scrapeOne(item: MenuItem, retries = 1): Promise<ScrapedProduct> {
  const base: ScrapedProduct = {
    categoria_pai: item.categoria_pai,
    caminho: item.caminho,
    titulo_menu: item.titulo_menu,
    titulo: item.titulo_menu,
    descricao: "",
    cor: null,
    imagem: null,
    fonte: item.url,
    ok: false,
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(item.url, {
        headers: { "User-Agent": UA, Accept: "text/html" },
        redirect: "follow",
      });
      if (res.status === 503 || res.status === 429) {
        await sleep(1200 * attempt);
        continue;
      }
      if (!res.ok) {
        return { ...base, erro: `HTTP ${res.status}` };
      }
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
      const imagem = meta(html, "og:image");

      return {
        ...base,
        titulo,
        descricao: buildDescricao(ogDesc, specs, cor),
        cor,
        imagem,
        ok: true,
      };
    } catch (e) {
      if (attempt === retries) {
        return { ...base, erro: e instanceof Error ? e.message : String(e) };
      }
      await sleep(800 * attempt);
    }
  }
  return { ...base, erro: "esgotou retries" };
}

async function mapPool<T, R>(items: T[], concurrency: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
      if ((i + 1) % 20 === 0 || i + 1 === items.length) {
        console.log(`  progresso: ${i + 1}/${items.length}`);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return out;
}

async function main() {
  const dataDir = join(__dirname, "data");
  const outPath = join(dataDir, "bigfer-catalog.json");
  const retryOnly = process.argv.includes("--retry");

  if (retryOnly) {
    const catalog = JSON.parse(readFileSync(outPath, "utf8")) as ScrapedProduct[];
    const failed = catalog.filter((p) => !p.ok);
    console.log(`Retentando ${failed.length} falhas (1 a 1, com pausa)…`);
    let done = 0;
    for (let i = 0; i < catalog.length; i++) {
      if (catalog[i].ok) continue;
      const menu: MenuItem = {
        categoria_pai: catalog[i].categoria_pai,
        caminho: catalog[i].caminho,
        titulo_menu: catalog[i].titulo_menu,
        url: catalog[i].fonte,
      };
      catalog[i] = await scrapeOne(menu, 5);
      done++;
      if (done % 10 === 0 || done === failed.length) {
        const okN = catalog.filter((p) => p.ok).length;
        console.log(`  ${done}/${failed.length} | OK total ${okN}/${catalog.length}`);
      }
      await sleep(750);
    }
    writeFileSync(outPath, JSON.stringify(catalog, null, 2), "utf8");
    const fail = catalog.filter((p) => !p.ok);
    console.log(`---\nOK: ${catalog.length - fail.length}\nFalhas: ${fail.length}`);
    for (const f of fail.slice(0, 20)) console.log(`  ! ${f.fonte} — ${f.erro}`);
    console.log(`Salvo: ${outPath}`);
    return;
  }

  const index = JSON.parse(readFileSync(join(dataDir, "bigfer-menu-index.json"), "utf8")) as {
    produtos: MenuItem[];
  };

  console.log(`Raspando ${index.produtos.length} páginas (concorrência ${CONCURRENCY})…`);
  const scraped = await mapPool(index.produtos, CONCURRENCY, (item) => scrapeOne(item, 3));

  const ok = scraped.filter((p) => p.ok);
  const fail = scraped.filter((p) => !p.ok);
  writeFileSync(outPath, JSON.stringify(scraped, null, 2), "utf8");

  console.log("---");
  console.log(`OK: ${ok.length}`);
  console.log(`Falhas: ${fail.length}`);
  if (fail.length) {
    for (const f of fail.slice(0, 15)) {
      console.log(`  ! ${f.fonte} — ${f.erro}`);
    }
  }
  console.log(`Salvo: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
