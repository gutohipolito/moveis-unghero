/**
 * Importa produtos Zen Design em ProductCatalog, vinculados ao fornecedor Zen.
 * Uso: npx tsx scripts/import-zen-catalog.ts
 *
 * Lê: scripts/data/zen-catalog.json
 * Também importa PDFs oficiais de https://www.zendesign.com.br/catalogos
 */

import { readFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";
import { DEFAULT_COMPANY_ID } from "../src/lib/constants";

const prisma = new PrismaClient();

const ZEN_SUPPLIER_ID = "ec20b282-d03c-449d-9709-f99052ce3f7d";

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
  imagens?: string[];
  ok: boolean;
  erro?: string;
};

const OFFICIAL_PDFS = [
  {
    titulo: "Catálogo Acessórios de Banho 2024",
    marca: "Banho",
    arquivo_url:
      "https://www.zendesign.com.br/download/downloads/zen-cat-acessorios-banho-site-red.pdf",
    arquivo_nome: "zen-cat-acessorios-banho-site-red.pdf",
  },
  {
    titulo: "Catálogo Alças e Maçanetas 2024",
    marca: "Alças e Maçanetas",
    arquivo_url:
      "https://www.zendesign.com.br/download/downloads/catalogo-alcas-e-macanetas-2024-site.pdf",
    arquivo_nome: "catalogo-alcas-e-macanetas-2024-site.pdf",
  },
  {
    titulo: "Catálogo Puxadores 2024",
    marca: "Puxadores",
    arquivo_url:
      "https://www.zendesign.com.br/download/downloads/catalogo-final-red-1.pdf",
    arquivo_nome: "catalogo-final-red-1.pdf",
  },
  {
    titulo: "Catálogo Lixeiras 2026",
    marca: "Lixeiras",
    arquivo_url:
      "https://www.zendesign.com.br/download/downloads/folder-lixeiras.pdf",
    arquivo_nome: "folder-lixeiras.pdf",
  },
];

function mimeFromUrl(url: string): string {
  const lower = url.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

function normalizeFonte(url: string): string {
  return url.trim().replace(/\/+$/, "").toLowerCase();
}

function buildDescricao(item: ScrapedProduct): string {
  const lines: string[] = [];
  if (item.linha) lines.push(`Linha: ${item.linha}`);
  if (item.acabamentos?.length) {
    lines.push(`Acabamentos: ${item.acabamentos.join("; ")}`);
  }
  lines.push(`Fonte: ${item.fonte.replace(/\/+$/, "")}/`);
  return lines.join("\n");
}

function arquivoNomeFromUrl(url: string, fallback: string): string {
  try {
    const path = new URL(url).pathname;
    const base = path.split("/").filter(Boolean).pop();
    if (base) return decodeURIComponent(base).slice(0, 180);
  } catch {
    /* ignore */
  }
  return fallback;
}

async function main() {
  const catalogPath = join(__dirname, "data", "zen-catalog.json");
  const all = JSON.parse(readFileSync(catalogPath, "utf8")) as ScrapedProduct[];
  const items = all.filter((p) => p.ok && p.titulo?.trim());

  let company = await prisma.company.findUnique({ where: { id: DEFAULT_COMPANY_ID } });
  if (!company) company = await prisma.company.findFirst();
  if (!company) throw new Error("Nenhuma empresa encontrada no banco.");

  const supplier = await prisma.supplier.findFirst({
    where: {
      company_id: company.id,
      OR: [
        { id: ZEN_SUPPLIER_ID },
        { nome: { contains: "Zen Acessorios", mode: "insensitive" } },
        { nomeFantasia: { contains: "Zen", mode: "insensitive" } },
      ],
    },
  });
  if (!supplier) {
    throw new Error(
      "Fornecedor Zen Acessorios para Moveis Ltda não encontrado. Cadastre-o antes."
    );
  }

  console.log(`Empresa: ${company.nome} (${company.id})`);
  console.log(`Fornecedor: ${supplier.nome} (${supplier.id})`);
  console.log(`Produtos a importar: ${items.length}`);

  const existing = await prisma.productCatalog.findMany({
    where: { company_id: company.id, supplier_id: supplier.id },
    select: { id: true, titulo: true, descricao: true, marca: true, arquivo_url: true, capa_url: true },
  });

  const byFonte = new Map<string, (typeof existing)[0]>();
  for (const row of existing) {
    const m = row.descricao?.match(/^Fonte:\\s*(.+)$/m) || row.descricao?.match(/Fonte:\\s*(.+)/i);
    if (m) byFonte.set(normalizeFonte(m[1]), row);
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  // PDFs oficiais primeiro (ordem baixa = aparecem primeiro se filtrar)
  for (let i = 0; i < OFFICIAL_PDFS.length; i++) {
    const pdf = OFFICIAL_PDFS[i];
    const fonteKey = normalizeFonte(pdf.arquivo_url);
    const found = existing.find(
      (r) =>
        normalizeFonte(r.arquivo_url) === fonteKey ||
        r.titulo === pdf.titulo
    );
    const descricao = `Catálogo oficial Zen Design (PDF).\nCategoria: ${pdf.marca}\nFonte: ${pdf.arquivo_url}`;
    if (found) {
      await prisma.productCatalog.update({
        where: { id: found.id },
        data: {
          titulo: pdf.titulo,
          marca: pdf.marca,
          descricao,
          arquivo_url: pdf.arquivo_url,
          arquivo_nome: pdf.arquivo_nome,
          mime_type: "application/pdf",
          ordem: i,
          ativo: true,
          supplier_id: supplier.id,
        },
      });
      updated++;
    } else {
      await prisma.productCatalog.create({
        data: {
          company_id: company.id,
          supplier_id: supplier.id,
          titulo: pdf.titulo,
          marca: pdf.marca,
          descricao,
          arquivo_url: pdf.arquivo_url,
          arquivo_nome: pdf.arquivo_nome,
          mime_type: "application/pdf",
          ordem: i,
          ativo: true,
        },
      });
      created++;
    }
  }

  for (const item of items) {
    const arquivoUrl = item.especificacao_url || item.capa_url;
    if (!arquivoUrl) {
      skipped++;
      continue;
    }
    const fonteKey = normalizeFonte(item.fonte);
    const descricao = buildDescricao(item);
    const titulo = item.titulo.trim().slice(0, 180);
    const marca = item.categoria;
    const mime = mimeFromUrl(arquivoUrl);
    const arquivoNome = arquivoNomeFromUrl(
      arquivoUrl,
      `${item.linha_slug || "zen"}-${item.titulo.slice(0, 40)}.png`.replace(/\s+/g, "-")
    );
    const capa = item.capa_url || null;

    const prev = byFonte.get(fonteKey);
    if (prev) {
      await prisma.productCatalog.update({
        where: { id: prev.id },
        data: {
          titulo,
          marca,
          descricao,
          arquivo_url: arquivoUrl,
          arquivo_nome: arquivoNome,
          mime_type: mime,
          capa_url: capa,
          ativo: true,
          supplier_id: supplier.id,
        },
      });
      updated++;
    } else {
      // fallback: match por título + marca
      const sameTitle = existing.find(
        (r) => r.titulo === titulo && r.marca === marca && !byFonte.has(normalizeFonte(r.arquivo_url))
      );
      if (sameTitle && sameTitle.descricao?.includes(fonteKey)) {
        await prisma.productCatalog.update({
          where: { id: sameTitle.id },
          data: {
            titulo,
            marca,
            descricao,
            arquivo_url: arquivoUrl,
            arquivo_nome: arquivoNome,
            mime_type: mime,
            capa_url: capa,
            ativo: true,
            supplier_id: supplier.id,
          },
        });
        updated++;
      } else {
        await prisma.productCatalog.create({
          data: {
            company_id: company.id,
            supplier_id: supplier.id,
            titulo,
            marca,
            descricao,
            arquivo_url: arquivoUrl,
            arquivo_nome: arquivoNome,
            mime_type: mime,
            capa_url: capa,
            ordem: 100 + created + updated,
            ativo: true,
          },
        });
        created++;
      }
    }
  }

  console.log(`Criados: ${created} | Atualizados: ${updated} | Sem arquivo: ${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
