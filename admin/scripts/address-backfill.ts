/**
 * Backfill: normaliza cidade/bairro/UF de clientes e parceiros.
 * - "Farroupilha Rs" → cidade Farroupilha + uf RS
 * - "Sao Francisco" → "São Francisco" (quando Farroupilha)
 * - Title Case + canônicos da Serra
 *
 * Uso (simulação):  DRY_RUN=1 npx tsx scripts/address-backfill.ts
 * Uso (aplica):     npx tsx scripts/address-backfill.ts
 */

import { PrismaClient } from "@prisma/client";
import { normalizeAddressFields, normalizeCidade } from "../src/lib/address";

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN === "1";

let clientsUpdated = 0;
let partnersUpdated = 0;

async function run() {
  console.log(`\n=== Backfill de endereço ${DRY_RUN ? "(DRY-RUN)" : "(APLICANDO)"} ===\n`);

  const clients = await prisma.client.findMany({
    select: {
      id: true,
      nome: true,
      cidade: true,
      bairro: true,
      uf: true,
      endereco: true,
    },
  });

  for (const c of clients) {
    const next = normalizeAddressFields({
      cidade: c.cidade,
      bairro: c.bairro,
      uf: c.uf,
      endereco: c.endereco,
    });

    const data: Record<string, string | null> = {};
    if (next.cidade && next.cidade !== c.cidade) data.cidade = next.cidade;
    if ((next.bairro || null) !== (c.bairro || null)) data.bairro = next.bairro || null;
    if ((next.uf || null) !== (c.uf || null)) data.uf = next.uf;
    if (c.endereco && next.endereco && next.endereco !== c.endereco) {
      data.endereco = next.endereco;
    }

    if (Object.keys(data).length === 0) continue;
    clientsUpdated += 1;
    console.log(
      `  [cliente] ${c.nome}: cidade "${c.cidade}"→"${data.cidade ?? c.cidade}" | bairro "${c.bairro}"→"${data.bairro ?? c.bairro}" | uf "${c.uf}"→"${data.uf ?? c.uf}"`
    );
    if (!DRY_RUN) {
      await prisma.client.update({ where: { id: c.id }, data });
    }
  }

  const partners = await prisma.professionalPartner.findMany({
    select: { id: true, nome: true, cidade: true },
  });

  for (const p of partners) {
    if (!p.cidade) continue;
    const { cidade } = normalizeCidade(p.cidade);
    if (!cidade || cidade === p.cidade) continue;
    partnersUpdated += 1;
    console.log(`  [parceiro] ${p.nome}: "${p.cidade}" → "${cidade}"`);
    if (!DRY_RUN) {
      await prisma.professionalPartner.update({ where: { id: p.id }, data: { cidade } });
    }
  }

  console.log(`\nClientes alterados: ${clientsUpdated}`);
  console.log(`Parceiros alterados: ${partnersUpdated}`);
  console.log(DRY_RUN ? "\nNada gravado (DRY_RUN=1).\n" : "\nBackfill aplicado.\n");
}

run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
