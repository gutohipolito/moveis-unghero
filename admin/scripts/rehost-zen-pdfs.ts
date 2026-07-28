/**
 * Rehospeda PDFs oficiais Zen no Vercel Blob com Content-Type correto
 * (o site Zen serve application/octet-stream + attachment, que quebra o iframe).
 *
 * Uso: npx tsx scripts/rehost-zen-pdfs.ts
 * Requer BLOB_READ_WRITE_TOKEN no .env
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { put } from "@vercel/blob";
import { PrismaClient } from "@prisma/client";
import { DEFAULT_COMPANY_ID } from "../src/lib/constants";

const prisma = new PrismaClient();
const ZEN_SUPPLIER_ID = "ec20b282-d03c-449d-9709-f99052ce3f7d";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** Carrega só BLOB_READ_WRITE_TOKEN do .env sem depender do pacote dotenv. */
function loadBlobToken(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  for (const name of [".env", ".env.local"]) {
    const path = join(__dirname, "..", name);
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const m = trimmed.match(/^BLOB_READ_WRITE_TOKEN\s*=\s*(.*)$/);
      if (!m) continue;
      let val = m[1].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (val) return val;
    }
  }
  return undefined;
}

async function main() {
  const token = loadBlobToken();
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN ausente no .env");

  let company = await prisma.company.findUnique({ where: { id: DEFAULT_COMPANY_ID } });
  if (!company) company = await prisma.company.findFirst();
  if (!company) throw new Error("Empresa não encontrada");

  const pdfs = await prisma.productCatalog.findMany({
    where: {
      company_id: company.id,
      supplier_id: ZEN_SUPPLIER_ID,
      OR: [
        { mime_type: "application/pdf" },
        { arquivo_url: { contains: ".pdf" } },
      ],
    },
  });

  console.log(`PDFs Zen: ${pdfs.length}`);

  for (const pdf of pdfs) {
    if (pdf.arquivo_url.includes("blob.vercel-storage.com")) {
      console.log(`OK (já no Blob): ${pdf.titulo}`);
      continue;
    }

    console.log(`Baixando: ${pdf.titulo}`);
    console.log(`  ← ${pdf.arquivo_url}`);
    const res = await fetch(pdf.arquivo_url, {
      headers: { "User-Agent": UA, Accept: "application/pdf,*/*" },
      redirect: "follow",
    });
    if (!res.ok) {
      console.warn(`  FAIL HTTP ${res.status}`);
      continue;
    }

    const buf = Buffer.from(await res.arrayBuffer());
    console.log(`  ${Math.round(buf.length / 1024 / 1024)} MB`);

    const safeName = (pdf.arquivo_nome || "catalogo-zen.pdf")
      .replace(/[^\w.\-]+/g, "-")
      .replace(/-+/g, "-");

    const blob = await put(`catalogos/zen/${safeName}`, buf, {
      access: "public",
      contentType: "application/pdf",
      token,
      addRandomSuffix: true,
    });

    await prisma.productCatalog.update({
      where: { id: pdf.id },
      data: {
        arquivo_url: blob.url,
        mime_type: "application/pdf",
        size_bytes: buf.length,
        arquivo_nome: safeName.endsWith(".pdf") ? safeName : `${safeName}.pdf`,
      },
    });

    console.log(`  → ${blob.url}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
