/**
 * Raspa produtos Zen Design (nome, acabamentos, especificação técnica, categoria).
 * Bypass Cloudflare via Playwright (browser real).
 *
 * Uso: npx tsx scripts/scrape-zen-catalog.ts
 *      npx tsx scripts/scrape-zen-catalog.ts --retry
 *
 * Lê:  scripts/data/zen-menu-index.json
 * Grava: scripts/data/zen-catalog.json
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { chromium, type Page } from "playwright";

type IndexItem = {
  fonte: string;
  categoria_slug: string;
  categoria: string;
  linha_slug: string;
  produto_slug: string;
  titulo_lista: string;
};

type ScrapedProduct = {
  fonte: string;
  categoria: string;
  categoria_slug: string;
  linha_slug: string;
  linha: string;
  titulo: string;
  acabamentos: string[];
  especificacao_url: string | null;
  capa_url: string | null;
  imagens: string[];
  ok: boolean;
  erro?: string;
};

const OUT = join(__dirname, "data", "zen-catalog.json");
const INDEX = join(__dirname, "data", "zen-menu-index.json");
const CONCURRENCY = 4;

function clean(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function parseProductHtml(html: string, item: IndexItem): ScrapedProduct {
  const base: ScrapedProduct = {
    fonte: item.fonte,
    categoria: item.categoria,
    categoria_slug: item.categoria_slug,
    linha_slug: item.linha_slug,
    linha: titleFromSlug(item.linha_slug),
    titulo: item.titulo_lista || titleFromSlug(item.produto_slug),
    acabamentos: [],
    especificacao_url: null,
    capa_url: null,
    imagens: [],
    ok: false,
  };

  if (/Just a moment|cf-browser-verification|challenge-platform/i.test(html)) {
    return { ...base, erro: "cloudflare" };
  }

  // Título do produto (h1 com linha + nome)
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) =>
    clean(m[1].replace(/<[^>]+>/g, " "))
  );
  const skip = /^(zen design|menu|galeria|modelo 3d|acabamentos|informa|conheça|rodapé)/i;
  const titleH1 = h1s.find((t) => t.length > 3 && !skip.test(t));
  if (titleH1) base.titulo = titleH1;

  // Acabamentos: data-alt ou span após slides de acabamento
  const acabSet = new Set<string>();
  for (const m of html.matchAll(/data-alt="([^"]+)"/gi)) {
    const name = clean(m[1]);
    if (name && name.length < 60 && !/home|logo|produto/i.test(name)) acabSet.add(name);
  }
  // Seção Acabamentos … Informações
  const acabBlock = html.match(
    /Acabamentos[\s\S]*?<\/h1>([\s\S]*?)Informações[\s\S]*?Técnicas/i
  );
  if (acabBlock) {
    for (const m of acabBlock[1].matchAll(/<span>([^<]+)<\/span>/gi)) {
      const name = clean(m[1]);
      if (
        name &&
        name.length > 1 &&
        name.length < 60 &&
        !/previous|next|informa/i.test(name)
      ) {
        acabSet.add(name);
      }
    }
  }
  base.acabamentos = [...acabSet];

  // Especificação técnica: primeiro link/img em userfiles/produtos após Informações Técnicas
  const techBlock = html.match(
    /Informações[\s\S]*?Técnicas[\s\S]*?(?:Conheça Também|conheca-tambem|<footer|$)/i
  );
  const techHay = techBlock?.[0] || html;
  const techImg = techHay.match(
    /(?:href|src|data-src)=["'](https:\/\/www\.zendesign\.com\.br\/userfiles\/produtos\/[^"']+\.(?:png|jpe?g|webp))["']/i
  );
  if (techImg) base.especificacao_url = techImg[1];

  // Imagens de produto (galeria / lazy backgrounds)
  const imgs = new Set<string>();
  for (const m of html.matchAll(
    /(?:src|data-src|href)=["'](https:\/\/www\.zendesign\.com\.br\/userfiles\/produtos\/[^"']+\.(?:png|jpe?g|webp))["']/gi
  )) {
    imgs.add(m[1]);
  }
  for (const m of html.matchAll(
    /url\(["']?(https:\/\/www\.zendesign\.com\.br\/userfiles\/produtos\/[^"')]+\.(?:png|jpe?g|webp))["']?\)/gi
  )) {
    imgs.add(m[1]);
  }
  base.imagens = [...imgs];

  // Capa: preferir foto de ambiente/produto, evitar ícone e a própria especificação
  const capa =
    base.imagens.find(
      (u) =>
        u !== base.especificacao_url &&
        !/-icone\./i.test(u) &&
        !/-\d+(-\d+)+\.(png|jpe?g|webp)$/i.test(u)
    ) ||
    base.imagens.find((u) => u !== base.especificacao_url) ||
    base.especificacao_url;
  base.capa_url = capa || null;

  base.ok = Boolean(base.titulo && (base.especificacao_url || base.capa_url || base.acabamentos.length));
  if (!base.ok) base.erro = "sem_dados";
  return base;
}

async function fetchHtml(page: Page, url: string): Promise<string> {
  const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  if (!res || !res.ok()) {
    // tenta via fetch in-page (mesmo cookies CF)
    return page.evaluate(async (u) => {
      const r = await fetch(u);
      return r.text();
    }, url);
  }
  await page.waitForTimeout(400);
  return page.content();
}

async function main() {
  const retryOnly = process.argv.includes("--retry");
  const index = JSON.parse(readFileSync(INDEX, "utf8")) as IndexItem[];

  let existing: ScrapedProduct[] = [];
  if (existsSync(OUT)) {
    existing = JSON.parse(readFileSync(OUT, "utf8")) as ScrapedProduct[];
  }
  const byFonte = new Map(existing.map((p) => [p.fonte.replace(/\/+$/, ""), p]));

  const todo = index.filter((item) => {
    const key = item.fonte.replace(/\/+$/, "");
    const prev = byFonte.get(key);
    if (!prev) return true;
    if (retryOnly) return !prev.ok;
    return false;
  });

  console.log(`Índice: ${index.length} | Já raspados ok: ${[...byFonte.values()].filter((p) => p.ok).length} | A fazer: ${todo.length}`);

  if (todo.length === 0) {
    console.log("Nada a raspar.");
    return;
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    locale: "pt-BR",
  });

  // Warm-up CF
  const warm = await context.newPage();
  await warm.goto("https://www.zendesign.com.br/produtos/", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await warm.waitForTimeout(2000);
  await warm.close();

  const pages: Page[] = [];
  for (let i = 0; i < CONCURRENCY; i++) pages.push(await context.newPage());

  let done = 0;
  let okCount = 0;

  async function worker(page: Page, items: IndexItem[]) {
    for (const item of items) {
      try {
        const html = await fetchHtml(page, item.fonte);
        const scraped = parseProductHtml(html, item);
        byFonte.set(item.fonte.replace(/\/+$/, ""), scraped);
        if (scraped.ok) okCount++;
        else console.warn(`FAIL ${item.fonte} ${scraped.erro || ""}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        byFonte.set(item.fonte.replace(/\/+$/, ""), {
          fonte: item.fonte,
          categoria: item.categoria,
          categoria_slug: item.categoria_slug,
          linha_slug: item.linha_slug,
          linha: titleFromSlug(item.linha_slug),
          titulo: item.titulo_lista,
          acabamentos: [],
          especificacao_url: null,
          capa_url: null,
          imagens: [],
          ok: false,
          erro: msg.slice(0, 200),
        });
        console.warn(`ERR ${item.fonte} ${msg}`);
      }
      done++;
      if (done % 20 === 0 || done === todo.length) {
        const all = [...byFonte.values()];
        writeFileSync(OUT, JSON.stringify(all, null, 2));
        console.log(`Progresso ${done}/${todo.length} (ok nesta rodada: ${okCount})`);
      }
    }
  }

  const chunks: IndexItem[][] = Array.from({ length: CONCURRENCY }, () => []);
  todo.forEach((item, i) => chunks[i % CONCURRENCY].push(item));
  await Promise.all(pages.map((p, i) => worker(p, chunks[i])));

  const all = index.map((item) => {
    const key = item.fonte.replace(/\/+$/, "");
    return (
      byFonte.get(key) || {
        fonte: item.fonte,
        categoria: item.categoria,
        categoria_slug: item.categoria_slug,
        linha_slug: item.linha_slug,
        linha: titleFromSlug(item.linha_slug),
        titulo: item.titulo_lista,
        acabamentos: [],
        especificacao_url: null,
        capa_url: null,
        imagens: [],
        ok: false,
        erro: "missing",
      }
    );
  });
  writeFileSync(OUT, JSON.stringify(all, null, 2));
  console.log(
    `Final: ${all.filter((p) => p.ok).length}/${all.length} ok → ${OUT}`
  );

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
