/**
 * Move fichas Zen (imagens) de ProductCatalog → ShowcaseProduct (vitrine).
 * Mantém os PDFs oficiais em Catálogos.
 *
 * Uso: npx tsx scripts/move-zen-catalogs-to-showcase.ts
 */

import { PrismaClient } from "@prisma/client";
import { DEFAULT_COMPANY_ID } from "../src/lib/constants";

const prisma = new PrismaClient();
const ZEN_SUPPLIER_ID = "ec20b282-d03c-449d-9709-f99052ce3f7d";

function isPdf(row: { mime_type: string; arquivo_url: string }): boolean {
  return (
    row.mime_type === "application/pdf" ||
    /\.pdf(\?|$)/i.test(row.arquivo_url)
  );
}

function normalizeFonte(url: string): string {
  return url.trim().replace(/\/+$/, "").toLowerCase();
}

function extractFonte(descricao: string | null): string | null {
  if (!descricao) return null;
  const m = descricao.match(/^Fonte:\s*(.+)$/m) || descricao.match(/Fonte:\s*(.+)/i);
  return m?.[1]?.trim() || null;
}

function mimeFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const lower = url.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return null;
}

async function main() {
  let company = await prisma.company.findUnique({ where: { id: DEFAULT_COMPANY_ID } });
  if (!company) company = await prisma.company.findFirst();
  if (!company) throw new Error("Empresa não encontrada");

  const supplier = await prisma.supplier.findFirst({
    where: {
      company_id: company.id,
      OR: [
        { id: ZEN_SUPPLIER_ID },
        { nome: { contains: "Zen Acessorios", mode: "insensitive" } },
      ],
    },
  });
  if (!supplier) throw new Error("Fornecedor Zen não encontrado");

  const catalogs = await prisma.productCatalog.findMany({
    where: { company_id: company.id, supplier_id: supplier.id },
  });

  const pdfs = catalogs.filter(isPdf);
  const fichas = catalogs.filter((c) => !isPdf(c));

  console.log(`PDFs (permanecem em catálogos): ${pdfs.length}`);
  console.log(`Fichas a mover para vitrine: ${fichas.length}`);

  const existing = await prisma.showcaseProduct.findMany({
    where: { company_id: company.id, supplier_id: supplier.id },
    select: { id: true, nome: true, descricao: true, imagem_url: true, imagens: true },
  });

  const byFonte = new Map<string, (typeof existing)[0]>();
  for (const row of existing) {
    const fonte = extractFonte(row.descricao);
    if (fonte) byFonte.set(normalizeFonte(fonte), row);
  }

  let created = 0;
  let updated = 0;
  let deleted = 0;

  for (const cat of fichas) {
    const fonte = extractFonte(cat.descricao);
    const descricao = cat.descricao || null;
    const capa = cat.capa_url || cat.arquivo_url;
    const spec = cat.arquivo_url;
    // Galeria: capa + especificação técnica (se distinta)
    const imagens = Array.from(
      new Set([capa, spec].filter((u): u is string => Boolean(u)))
    );

    const payload = {
      nome: cat.titulo.trim().slice(0, 180),
      descricao,
      categoria: cat.marca?.trim() || "Zen",
      imagem_url: capa,
      imagem_mime: mimeFromUrl(capa),
      imagens,
      supplier_id: supplier.id,
      ativo: cat.ativo,
      ordem: cat.ordem,
    };

    const prev = fonte ? byFonte.get(normalizeFonte(fonte)) : undefined;
    if (prev) {
      await prisma.showcaseProduct.update({
        where: { id: prev.id },
        data: payload,
      });
      updated++;
    } else {
      await prisma.showcaseProduct.create({
        data: {
          company_id: company.id,
          ...payload,
        },
      });
      created++;
    }

    await prisma.productCatalog.delete({ where: { id: cat.id } });
    deleted++;
  }

  console.log(`Vitrine: criados ${created}, atualizados ${updated}`);
  console.log(`Catálogos fichas removidos: ${deleted}`);
  console.log(`PDFs restantes: ${pdfs.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
