/**
 * Importa o catálogo Bigfer raspado no mostruário (ShowcaseProduct).
 * Uso: npx tsx scripts/import-bigfer-catalog.ts
 *
 * Lê: scripts/data/bigfer-catalog.json
 * Categoria = categoria pai Bigfer (Corrediças, Dobradiças, …).
 * Idempotente por URL de origem (campo fonte) ou nome.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";
import { DEFAULT_COMPANY_ID } from "../src/lib/constants";

const prisma = new PrismaClient();

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
};

function isVercelBlob(url: string | null | undefined): boolean {
  return Boolean(url && url.includes("blob.vercel-storage.com"));
}

function normalizeFonte(url: string): string {
  return url.trim().replace(/\/+$/, "").toLowerCase();
}

function buildDescricao(item: ScrapedProduct): string {
  const lines = (item.descricao || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Evita duplicar Cores se o scrape já incluiu
  if (item.cor?.trim() && !lines.some((l) => /^cores:/i.test(l))) {
    lines.push(`Cores: ${item.cor.trim()}`);
  }

  // Âncora estável para reimportações
  const fonteLine = `Fonte: ${item.fonte.replace(/\/+$/, "")}/`;
  const withoutFonte = lines.filter((l) => !/^fonte:/i.test(l));
  withoutFonte.push(fonteLine);

  // Contexto de linha (útil quando o título da página é curto)
  if (item.caminho && !withoutFonte.some((l) => /^linha:/i.test(l))) {
    withoutFonte.splice(Math.min(1, withoutFonte.length), 0, `Linha: ${item.caminho}`);
  }

  return withoutFonte.join("\n");
}

async function main() {
  const catalogPath = join(__dirname, "data", "bigfer-catalog.json");
  const all = JSON.parse(readFileSync(catalogPath, "utf8")) as ScrapedProduct[];
  const includeStubs = process.argv.includes("--stubs");
  const items = all
    .filter((p) => (includeStubs || p.ok) && (p.titulo?.trim() || p.titulo_menu?.trim()))
    .map((p) => {
      if (p.ok) return p;
      // Stub: produto do menu sem página raspada (ex.: bloqueio Wordfence)
      const titulo =
        p.titulo?.trim() && p.titulo !== p.titulo_menu
          ? p.titulo.trim()
          : `${p.caminho.split(" › ").slice(-1)[0] || p.categoria_pai}: ${p.titulo_menu}`.replace(
              /^:\s*/,
              ""
            );
      return {
        ...p,
        titulo,
        descricao: p.descricao || `Produto Bigfer (dados da página pendentes).\nLinha: ${p.caminho}`,
        ok: true,
      };
    });

  let company = await prisma.company.findUnique({ where: { id: DEFAULT_COMPANY_ID } });
  if (!company) company = await prisma.company.findFirst();
  if (!company) throw new Error("Nenhuma empresa encontrada no banco.");

  console.log(`Empresa: ${company.nome} (${company.id})`);
  console.log(`Produtos a importar: ${items.length}`);

  const existing = await prisma.showcaseProduct.findMany({
    where: { company_id: company.id },
    select: {
      id: true,
      nome: true,
      categoria: true,
      descricao: true,
      imagem_url: true,
      imagens: true,
    },
  });

  const byFonte = new Map<string, (typeof existing)[number]>();
  const byNome = new Map<string, (typeof existing)[number]>();
  for (const row of existing) {
    byNome.set(row.nome.toLowerCase(), row);
    const m = row.descricao?.match(/^Fonte:\s*(\S+)/im) || row.descricao?.match(/\nFonte:\s*(\S+)/i);
    if (m) byFonte.set(normalizeFonte(m[1]), row);
  }

  // Também retag "Gavetas" → "Corrediças" nos itens Bigfer já importados
  for (const row of existing) {
    if (row.categoria === "Gavetas") {
      await prisma.showcaseProduct.update({
        where: { id: row.id },
        data: { categoria: "Corrediças" },
      });
      console.log(`  retag categoria: ${row.nome} → Corrediças`);
    }
  }

  const maxOrdem = await prisma.showcaseProduct.aggregate({
    where: { company_id: company.id },
    _max: { ordem: true },
  });
  let nextOrdem = (maxOrdem._max.ordem ?? 0) + 1;

  const bigferSupplier = await prisma.supplier.findFirst({
    where: {
      company_id: company.id,
      OR: [
        { nome: { contains: "Bigfer", mode: "insensitive" } },
        { nomeFantasia: { contains: "Bigfer", mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  const bigferSupplierId = bigferSupplier?.id ?? null;

  let created = 0;
  let updated = 0;
  const nameCount = new Map<string, number>();

  for (const item of items) {
    let nome = item.titulo.trim();
    // Desambiguar títulos curtos/duplicados
    const key = nome.toLowerCase();
    const seen = nameCount.get(key) ?? 0;
    nameCount.set(key, seen + 1);
    if (seen > 0) {
      nome = `${nome} (${item.titulo_menu})`;
    }

    const descricao = buildDescricao(item);
    const imagem = item.imagem?.trim() || null;
    const categoria = item.categoria_pai.trim() || "Ferragens";

    const found =
      byFonte.get(normalizeFonte(item.fonte)) ||
      byNome.get(item.titulo.trim().toLowerCase()) ||
      byNome.get(nome.toLowerCase());

    if (found) {
      const keepBlobCover = isVercelBlob(found.imagem_url);
      const keepBlobGallery =
        (found.imagens || []).length > 0 && (found.imagens || []).every(isVercelBlob);

      await prisma.showcaseProduct.update({
        where: { id: found.id },
        data: {
          nome: found.nome, // preserva nome já cadastrado se bateu por fonte
          descricao,
          categoria,
          ativo: true,
          ...(bigferSupplierId ? { supplier_id: bigferSupplierId } : {}),
          ...(keepBlobCover
            ? {}
            : {
                imagem_url: imagem,
                imagem_mime: imagem ? "image/png" : null,
              }),
          ...(keepBlobGallery ? {} : { imagens: imagem ? [imagem] : [] }),
        },
      });
      // refresh maps
      byFonte.set(normalizeFonte(item.fonte), found);
      updated++;
      continue;
    }

    const createdRow = await prisma.showcaseProduct.create({
      data: {
        company_id: company.id,
        nome,
        descricao,
        categoria,
        imagem_url: imagem,
        imagem_mime: imagem ? "image/png" : null,
        imagens: imagem ? [imagem] : [],
        preco_exibicao: null,
        ordem: nextOrdem++,
        ativo: true,
        ...(bigferSupplierId ? { supplier_id: bigferSupplierId } : {}),
      },
    });
    byFonte.set(normalizeFonte(item.fonte), createdRow as (typeof existing)[number]);
    byNome.set(nome.toLowerCase(), createdRow as (typeof existing)[number]);
    created++;
  }

  const totals = await prisma.showcaseProduct.groupBy({
    by: ["categoria"],
    where: { company_id: company.id, ativo: true },
    _count: { _all: true },
    orderBy: { categoria: "asc" },
  });

  console.log("---");
  console.log(`Criados: ${created}`);
  console.log(`Atualizados: ${updated}`);
  console.log("Por categoria:");
  for (const t of totals) {
    console.log(`  ${(t.categoria || "(sem)").padEnd(32)} ${t._count._all}`);
  }
}

main()
  .catch((error) => {
    console.error("Falha na importação:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
