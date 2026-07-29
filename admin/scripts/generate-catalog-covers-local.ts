/**
 * Gera PNGs da 1ª página dos PDFs de catálogo sem capa (local).
 * Uso: npx tsx scripts/generate-catalog-covers-local.ts
 *
 * Grava em public/catalog-covers/ e atualiza capa_url no banco
 * para o path público /catalog-covers/<id>.png
 */

import { createServer } from "http";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
import { DEFAULT_COMPANY_ID } from "../src/lib/constants";

const prisma = new PrismaClient();
const ZEN_SUPPLIER_ID = "ec20b282-d03c-449d-9709-f99052ce3f7d";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function renderPdfFirstPage(pdfBuf: Buffer): Promise<Buffer> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const server = createServer((req, res) => {
      if (req.url === "/pdf") {
        res.writeHead(200, {
          "Content-Type": "application/pdf",
          "Content-Length": pdfBuf.length,
          "Access-Control-Allow-Origin": "*",
        });
        res.end(pdfBuf);
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const addr = server.address();
    if (!addr || typeof addr === "string") throw new Error("porta inválida");
    const pdfUrl = `http://127.0.0.1:${addr.port}/pdf`;

    await page.goto("about:blank");
    await page.addScriptTag({
      url: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
    });
    await page.waitForFunction(
      () => Boolean((window as unknown as { pdfjsLib?: unknown }).pdfjsLib),
      null,
      { timeout: 30000 }
    );

    const dataUrl = await page.evaluate(async (src) => {
      const pdfjsLib = (window as unknown as {
        pdfjsLib: {
          GlobalWorkerOptions: { workerSrc: string };
          getDocument: (opts: unknown) => {
            promise: Promise<{
              getPage: (n: number) => Promise<{
                getViewport: (o: { scale: number }) => { width: number; height: number };
                render: (o: unknown) => { promise: Promise<void> };
              }>;
            }>;
          };
        };
      }).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      const res = await fetch(src);
      const data = new Uint8Array(await res.arrayBuffer());
      const pdf = await pdfjsLib.getDocument({ data }).promise;
      const pdfPage = await pdf.getPage(1);
      const viewport = pdfPage.getViewport({ scale: 1.4 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas 2d indisponível");
      await pdfPage.render({ canvasContext: ctx, viewport }).promise;
      return canvas.toDataURL("image/png");
    }, pdfUrl);

    server.close();
    return Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ""), "base64");
  } finally {
    await browser.close();
  }
}

async function main() {
  let company = await prisma.company.findUnique({ where: { id: DEFAULT_COMPANY_ID } });
  if (!company) company = await prisma.company.findFirst();
  if (!company) throw new Error("Empresa não encontrada");

  const catalogs = await prisma.productCatalog.findMany({
    where: {
      company_id: company.id,
      mime_type: "application/pdf",
      capa_url: null,
      OR: [
        { supplier_id: ZEN_SUPPLIER_ID },
        { titulo: { contains: "Catálogo", mode: "insensitive" } },
      ],
    },
    orderBy: { titulo: "asc" },
  });

  const outDir = join(__dirname, "..", "public", "catalog-covers");
  mkdirSync(outDir, { recursive: true });
  console.log(`Sem capa: ${catalogs.length}`);

  for (const cat of catalogs) {
    console.log(`\n→ ${cat.titulo}`);
    const res = await fetch(cat.arquivo_url, {
      headers: { "User-Agent": UA, Accept: "application/pdf,*/*" },
      redirect: "follow",
    });
    if (!res.ok) {
      console.warn(`  FAIL HTTP ${res.status}`);
      continue;
    }
    const pdfBuf = Buffer.from(await res.arrayBuffer());
    console.log(`  PDF ${Math.round(pdfBuf.length / 1024 / 1024)} MB`);

    const png = await renderPdfFirstPage(pdfBuf);
    const fileName = `${cat.id}.png`;
    const filePath = join(outDir, fileName);
    writeFileSync(filePath, png);
    const publicPath = `/catalog-covers/${fileName}`;
    await prisma.productCatalog.update({
      where: { id: cat.id },
      data: { capa_url: publicPath },
    });
    console.log(`  capa ${Math.round(png.length / 1024)} KB → ${publicPath}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
