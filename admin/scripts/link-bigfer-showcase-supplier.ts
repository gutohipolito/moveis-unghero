/**
 * Vincula produtos Bigfer do mostruário ao fornecedor Bigfer.
 * Uso: npx tsx scripts/link-bigfer-showcase-supplier.ts
 */

import { PrismaClient } from "@prisma/client";
import { DEFAULT_COMPANY_ID } from "../src/lib/constants";

const prisma = new PrismaClient();

const BIGFER_CATEGORIES = [
  "Corrediças",
  "Dobradiças",
  "Ferragens em geral",
  "Gabaritos",
  "Peças Técnicas",
  "Ponteiras e Acabamentos",
  "Puxadores",
  "Rodízios",
  "Sapatas",
  "Sistemas de Fixação",
  "Sistemas e Articuladores",
  "Sistemas para Portas de Correr",
];

async function main() {
  const company =
    (await prisma.company.findUnique({ where: { id: DEFAULT_COMPANY_ID } })) ||
    (await prisma.company.findFirst());
  if (!company) throw new Error("Empresa não encontrada.");

  const supplier = await prisma.supplier.findFirst({
    where: {
      company_id: company.id,
      OR: [
        { nome: { contains: "Bigfer", mode: "insensitive" } },
        { nomeFantasia: { contains: "Bigfer", mode: "insensitive" } },
      ],
    },
  });
  if (!supplier) throw new Error("Fornecedor Bigfer não encontrado.");

  const result = await prisma.showcaseProduct.updateMany({
    where: {
      company_id: company.id,
      OR: [
        { descricao: { contains: "bigfer.com.br", mode: "insensitive" } },
        { categoria: { in: BIGFER_CATEGORIES } },
      ],
    },
    data: { supplier_id: supplier.id },
  });

  console.log(`Fornecedor: ${supplier.nome} (${supplier.id})`);
  console.log(`Produtos vinculados: ${result.count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
