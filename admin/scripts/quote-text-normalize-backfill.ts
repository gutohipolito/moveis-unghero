/**
 * Padroniza textos de orçamento já salvos:
 * - descrição do item (Title Case)
 * - detalhes/subitens: quebra por vírgula + capitalização + dedupe
 * - presets de descrição e detalhe
 *
 * Uso (simulação):  DRY_RUN=1 npx tsx scripts/quote-text-normalize-backfill.ts
 * Uso (aplica):     npx tsx scripts/quote-text-normalize-backfill.ts
 */

import { PrismaClient, Prisma } from "@prisma/client";
import {
  expandAndFormatQuoteDetails,
  formatQuotePhrase,
} from "../src/lib/quoteItems";

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN === "1";

function sameList(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

async function run() {
  console.log(
    `\n=== Normalização de textos de orçamento ${DRY_RUN ? "(DRY-RUN)" : "(APLICANDO)"} ===\n`
  );

  let itemsUpdated = 0;
  let itemPresetsUpdated = 0;
  let detailPresetsUpdated = 0;

  const items = await prisma.quoteItem.findMany({
    select: { id: true, descricao: true, subitens: true },
  });

  for (const item of items) {
    const descricao = formatQuotePhrase(item.descricao);
    const rawSubs = Array.isArray(item.subitens)
      ? item.subitens.filter((s): s is string => typeof s === "string")
      : [];
    const subitens = expandAndFormatQuoteDetails(rawSubs);
    const descChanged = descricao !== item.descricao;
    const subsChanged = !sameList(subitens, rawSubs.map((s) => s.trim()).filter(Boolean));

    if (!descChanged && !subsChanged) continue;
    itemsUpdated += 1;
    if (DRY_RUN) {
      if (descChanged) console.log(`  [item desc] "${item.descricao}" → "${descricao}"`);
      if (subsChanged) {
        console.log(`  [item dets] ${JSON.stringify(rawSubs)} → ${JSON.stringify(subitens)}`);
      }
      continue;
    }
    await prisma.quoteItem.update({
      where: { id: item.id },
      data: {
        ...(descChanged ? { descricao } : {}),
        ...(subsChanged
          ? { subitens: subitens.length > 0 ? (subitens as Prisma.InputJsonValue) : Prisma.JsonNull }
          : {}),
      },
    });
  }

  const itemPresets = await prisma.quoteItemPreset.findMany({
    select: { id: true, descricao: true },
  });
  for (const preset of itemPresets) {
    const descricao = formatQuotePhrase(preset.descricao);
    if (descricao === preset.descricao) continue;
    itemPresetsUpdated += 1;
    if (DRY_RUN) {
      console.log(`  [preset desc] "${preset.descricao}" → "${descricao}"`);
      continue;
    }
    await prisma.quoteItemPreset.update({
      where: { id: preset.id },
      data: { descricao },
    });
  }

  const detailPresets = await prisma.quoteDetailPreset.findMany({
    select: { id: true, texto: true },
  });
  for (const preset of detailPresets) {
    // Presets de detalhe são um texto por registro; se veio com vírgula, mantém
    // o primeiro formatado (criação em lote já separa). Aqui só capitaliza.
    const texto = formatQuotePhrase(preset.texto);
    if (texto === preset.texto) continue;
    detailPresetsUpdated += 1;
    if (DRY_RUN) {
      console.log(`  [preset det] "${preset.texto}" → "${texto}"`);
      continue;
    }
    await prisma.quoteDetailPreset.update({
      where: { id: preset.id },
      data: { texto },
    });
  }

  // Detalhe preset com vírgula no meio: expandir em vários registros seria
  // destrutivo se houver imagem vinculada. Só capitaliza o texto único acima.
  // Itens de orçamento com "A,B" em um único subitem já foram quebrados.

  console.log("\nResumo:");
  console.log(`  QuoteItem atualizados: ${itemsUpdated}`);
  console.log(`  QuoteItemPreset atualizados: ${itemPresetsUpdated}`);
  console.log(`  QuoteDetailPreset atualizados: ${detailPresetsUpdated}`);
  console.log(DRY_RUN ? "\n(Nada gravado — DRY_RUN=1)\n" : "\nConcluído.\n");
}

run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
