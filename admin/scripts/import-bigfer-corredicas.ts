/**
 * Importa produtos Bigfer (corrediças) no mostruário (ShowcaseProduct).
 * Uso: npx tsx scripts/import-bigfer-corredicas.ts
 *
 * Imagens: URLs públicas da Bigfer (sem reupload para Blob).
 * Idempotente por nome (case-insensitive): cria novos e atualiza descrição/cor/imagem se o produto já existir
 * e ainda não tiver imagem própria no Blob.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";
import { DEFAULT_COMPANY_ID } from "../src/lib/constants";

const prisma = new PrismaClient();

const CATEGORIA = "Gavetas";

type BigferProduct = {
  titulo: string;
  descricao: string;
  cor: string | null;
  imagem: string | null;
  fonte: string;
};

function buildDescricao(item: BigferProduct): string {
  const parts = (item.descricao || "")
    .split("|")
    .map((p) => p.trim())
    .filter(Boolean);

  const lines: string[] = [];
  if (parts[0]) lines.push(parts[0]);
  for (const part of parts.slice(1)) {
    lines.push(part);
  }
  if (item.cor?.trim()) {
    lines.push(`Cores: ${item.cor.trim()}`);
  }
  return lines.join("\n");
}

function isVercelBlob(url: string | null | undefined): boolean {
  return Boolean(url && url.includes("blob.vercel-storage.com"));
}

async function main() {
  const dataPath = join(__dirname, "data", "bigfer-corredicas.json");
  const items = JSON.parse(readFileSync(dataPath, "utf8")) as BigferProduct[];
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("JSON de produtos vazio ou inválido.");
  }

  let company = await prisma.company.findUnique({ where: { id: DEFAULT_COMPANY_ID } });
  if (!company) {
    company = await prisma.company.findFirst();
  }
  if (!company) {
    throw new Error("Nenhuma empresa encontrada no banco.");
  }

  console.log(`Empresa: ${company.nome} (${company.id})`);
  console.log(`Produtos no JSON: ${items.length}`);

  const maxOrdem = await prisma.showcaseProduct.aggregate({
    where: { company_id: company.id },
    _max: { ordem: true },
  });
  let nextOrdem = (maxOrdem._max.ordem ?? 0) + 1;

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const item of items) {
    const nome = item.titulo?.trim();
    if (!nome) continue;

    const descricao = buildDescricao(item);
    const imagem = item.imagem?.trim() || null;

    const existing = await prisma.showcaseProduct.findFirst({
      where: {
        company_id: company.id,
        nome: { equals: nome, mode: "insensitive" },
      },
    });

    if (existing) {
      const keepBlobCover = isVercelBlob(existing.imagem_url);
      const keepBlobGallery =
        (existing.imagens || []).length > 0 && (existing.imagens || []).every(isVercelBlob);

      await prisma.showcaseProduct.update({
        where: { id: existing.id },
        data: {
          descricao,
          categoria: existing.categoria || CATEGORIA,
          ativo: true,
          ...(keepBlobCover
            ? {}
            : {
                imagem_url: imagem,
                imagem_mime: imagem ? "image/png" : null,
              }),
          ...(keepBlobGallery ? {} : { imagens: imagem ? [imagem] : [] }),
        },
      });
      updated++;
      console.log(`  atualizado: ${nome}`);
      continue;
    }

    await prisma.showcaseProduct.create({
      data: {
        company_id: company.id,
        nome,
        descricao,
        categoria: CATEGORIA,
        imagem_url: imagem,
        imagem_mime: imagem ? "image/png" : null,
        imagens: imagem ? [imagem] : [],
        preco_exibicao: null,
        ordem: nextOrdem++,
        ativo: true,
      },
    });
    created++;
    console.log(`  criado: ${nome}`);
  }

  const total = await prisma.showcaseProduct.count({
    where: { company_id: company.id, ativo: true, categoria: CATEGORIA },
  });

  console.log("---");
  console.log(`Criados: ${created}`);
  console.log(`Atualizados: ${updated}`);
  console.log(`Ignorados: ${skipped}`);
  console.log(`Total ativo em "${CATEGORIA}": ${total}`);
}

main()
  .catch((error) => {
    console.error("Falha na importação:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
