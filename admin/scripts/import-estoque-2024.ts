/**
 * Importação única do estoque a partir do PDF "Controle de Estoques 2024".
 * Uso: npx tsx scripts/import-estoque-2024.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COMPANY_ID = process.env.INVENTORY_COMPANY_ID ?? "mock-company-id";

const RAW_PRODUCT_LINES = `
CHAPA BRANCA TX 18mm 1 und 33 215,00 7.095,00
CHAPA BRANCA LISA 18mm 2 und 23 215,00 4.945,00
CHAPA MADEIRADO 18mm CORES 3 und 95 350,00 33.250,00
CHAPA MADEIRADO 6mm cores 4 und 2 200,00 400,00
BRANCO TX 6MM 5 UND 15 120,00 1.800,00
BRANCO LISO 6mm 6 und 16 120,00 1.920,00
PARAFUSO 3,5X16mm 7 und 9000 0,02 192,60
PARAFUSO 3,5X20mm 8 und 1500 0,03 45,00
PARAFUSO 3,5X25mm 9 und 7000 0,04 280,00
PARAFUSO 3,5X30mm 10 und 11500 0,04 414,00
PARAFUSO 3,5X35mm 11 UND 12500 0,06 750,00
PARAFUSO 3,5X40mm 12 und 6500 0,06 390,00
PARAFUSO 4X45mm 13 UND 3500 0,08 280,00
PARAFUSO 4,5X60mm 14 und 600 0,09 54,00
PARAFUSO 5,0X50mm 15 und 800 0,08 64,00
PARAFUSO 5X60mm 16 und 900 0,09 81,00
PARAFUSO 5X80mm 17 und 300 0,23 69,00
PARAFUSO 6,0X80mm 18 und 580 0,33 191,40
PARAFUSO 6,0X60mm 19 und 50 0,39 19,50
PARAFUSO 3,5x13mm 20 und 500 0,11 55,00
TRILHO/NORMAL 300mm 21 AO PAR 40 21,17 846,80
TRILHO/NORMAL 350mm 22 ao par 41 22,87 937,67
TRILHO/NORMAL 400mm 23 ao par 30 24,57 737,10
TRILHO/NORMAL 450mm 24 ao par 25 25,42 635,50
TRILHO/NORMAL 500mm 25 AO PAR 30 27,97 839,10
TRILHO/LIGTH 300mm 26 ao par 20 13,52 270,40
TRILHO/LIGHT 350mm 27 ao par 30 15,22 456,60
TRILHO/LIGHT 400mm 28 ao par 40 16,07 642,80
TRILHO/LIGHT 450mm 29 ao par 30 16,92 507,60
TRILHO/LIGHT 500mm 30 ao par 50 19,47 973,50
TRILHO ESCONDIDO SOFT 300mm 39 ao par 4 54,61 218,44
TRILHO ESCONDIDO SOFT 350mm 40 ao par 5 56,96 284,80
TRILHO ESCONDIDO SOFT 400mm 41 AO PAR 1 58,91 58,91
TRILHO ESCONDIDO SOFT 450mm 42 ao par 6 60,92 365,52
TRILHO ESCONDIDO SOFT 500mm 43 ao par 10 63,83 638,30
PUXADOR 197 44 BARRA 3 135,00 405,00
TUBO DE CABIDEIRO 45 BARRA 2 65,00 130,00
SISTEMA DE CORRER RO47 G INT 46 UND 12 32,00 384,00
SISTEMA DE CORRER CD50 DUCASE 47 UND 0 45,00 0,00
AMORTECEDOR DUCASE P/ PORTA 48 UND 0 70,95 0,00
SISTEMA DE CORRER RO21 49 UND 0 21,51 0,00
FITA DE BORDA BRANCA 45mm tx 50 metro 750 0,90 675,00
FITA DE BORDA BRANCA 45mm liso 51 metro 800 0,90 720,00
FITA DE BORDA BRANCA 22mm tx 52 metro 2400 0,40 960,00
FITA DE BORDA BRANCA 22mm liso 53 metro 700 0,40 280,00
THINNER DR 4403 18L 54 LATA 1 290,00 290,00
COLA DE CONTATO 55 LATA 1 350,00 350,00
COLA DE CONTATO 2,8 KG 56 LATINHA 0 58,90 0,00
COLA HOT BRANCA 57 KG 10 25,76 257,60
RODÍZIO 50mm com trava 58 und 9 9,50 85,50
RODIZIO 50mm sem trava 59 und 7 8,65 60,55
RODIZIO 35mm sem trava 60 und 39 6,68 260,52
RODIZIO 35mm com trava 61 und 0 0,00 0,00
PÉ DE METAL 62 UND 8 8,42 67,36
LIXA K121 610X100mm gr.80 63 und 1 8,20 8,20
DUPLA FACE 9mm 64 rolo 0 35,00 0,00
CANTONEIRAS 13X13 65 UND 3000 0,15 450,00
ACABAMENTO PERFIL 66 AO PAR 400 1,90 760,00
LUMINÁRIAS 67 UND 71 13,00 923,00
JOGO DE PONTEIRAS 68 UND 0 10,00 0,00
FITA ISOLANTE 69 ROLO 5 15,00 75,00
FITA CREPE 70 ROLO 3 12,17 36,51
TAPA FURO BRANCO TX 71 UND 300 0,03 9,00
ADESIVO ESPELHO (SILICONE) 72 UND 11 29,90 328,90
VEDANTE ESQUADRIAS BRANCO 73 UND 3 14,70 44,10
KIT COLA/SECANTE 74 KIT 22 28,00 616,00
ROST OFF 600ML 75 UND 1 23,99 23,99
SILICONE SPRAY WURT 300ML 76 UND 0 19,84 0,00
BROCA 2,5 77 UND 5 5,31 26,55
BROCA 3 78 UND 5 5,00 25,00
PISTÃO 80N 79 UND 30 10,00 300,00
PISTÃO 80N INVERSO 80 UND 0 14,82 0,00
DOBRADIÇA CLIC ALTO 81 UND 300 4,50 1.350,00
DOBRADIÇA CLIC RETA 82 UND 200 4,50 900,00
SISTEMA FECHO MAGNETO 83 UND 0 8,00 0,00
BUCHA NYLON 8mm 84 UND 15 0,15 2,25
BUCHA NYLON 6mm 85 UND 800 0,10 80,00
BUCHA TIJOLO FURADO 86 UND 250 0,20 50,00
CABO FLEXÍVEL 2,5mm vermelho 87 METRO 100 1,70 170,00
CABO FLEXÍVEL 2,5mm azul 88 metro 100 1,70 170,00
CABO FLEXÍVEL 2,5mm verde 89 metro 55 1,70 93,50
CABO FLEXÍVEL 1,5mm vermelho 90 metro 70 1,10 77,00
CABO FLEXÍVEL 1,5mm azul 91 metro 63 1,10 69,30
PÉ DE PLÁSTICO Meta 92 und 100 3,48 348,00
SUPORTE AÉREO COM CAPA 93 und 0 0,90 0,00
COLA SEM ATIVADOR 94 UND 12 9,90 118,80
ATIVADOR SEM COLA 95 UND 24 20,00 480,00
PERFIL SUPERIOR 96 BARRA 4 164,33 657,32
PERFIL INFERIOR 97 BARRA 6 100,46 602,76
TRILHO DE INOX 350mm 98 PAR 7 65,00 455,00
TRILHO DE INOX 400mm 99 PAR 8 60,27 482,16
TRILHO DE INOX 450mm 100 ´PAR 14 64,00 896,00
TRILHO DE INOX 500mm 101 PAR 6 72,17 433,02
DOBRADIÇAS DE INOX SOPARANO RETA 102 UND 70 7,50 525,00
DOBRADIÇAS DE INOX SOPRANO CURVA 103 UND 30 7,50 225,00
TRILHO/LIFE 250mm 104 ao par 15 9,16 137,40
DOBRADIÇAS HAFELE RETA com calço 105 UND 120 13,00 1.560,00
DOBRADIÇAS HAFELE CURVA com calço 106 UND 36 13,00 468,00
TRILHO OCULTO 300MM INVISA HAFELE 107 AO PAR 8 124,00 992,00
TRILHO OCULTO 350MM INVISA HAFELE 108 AO PAR 11 128,00 1.408,00
TRILHO OCULTO 400MM INVISA HAFELE 109 AO PAR 9 132,00 1.188,00
TRILHO OCULTO 450MM INVISA HAFELE 110 AO PAR 6 139,00 834,00
TRILHO OCULTO 500MM INVISA HAFELE 111 AO PAR 25 140,00 3.500,00
DIFUSOR FLEXÍVEL 112 AO METRO 50 25,00 1.250,00
`.trim();

interface ParsedItem {
  codigo: number;
  nome: string;
  quantidade: number;
  precoCusto: number;
  categoria: string;
  minima: number;
}

function parseBrazilianNumber(value: string): number {
  return Number(value.replace(/\./g, "").replace(",", "."));
}

function categorize(nome: string): string {
  const n = nome.toUpperCase();
  if (/CHAPA|BRANCO TX|BRANCO LISO|MADEIRADO/.test(n)) return "CHAPAS_MDF";
  if (/LUMINÁRIA|DIFUSOR|CABO FLEX/.test(n)) return "ILUMINACAO";
  if (
    /THINNER|COLA|ROST OFF|SILICONE|ATIVADOR|VEDANTE|ADESIVO|LIXA|FITA CREPE|FITA ISOLANTE|DUPLA FACE/.test(
      n
    )
  ) {
    return "TINTAS_QUIMICOS";
  }
  if (/FITA DE BORDA|TAPA FURO/.test(n)) return "OUTROS";
  return "FERRAGENS";
}

function suggestMinima(quantidade: number, categoria: string): number {
  if (quantidade <= 0) return 0;
  if (categoria === "CHAPAS_MDF") return Math.max(5, Math.ceil(quantidade * 0.2));
  if (quantidade >= 500) return Math.max(100, Math.ceil(quantidade * 0.15));
  if (quantidade >= 50) return Math.max(10, Math.ceil(quantidade * 0.2));
  return Math.max(1, Math.ceil(quantidade * 0.25));
}

function parseProductLine(line: string): ParsedItem | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed === "0,00") return null;

  const match = trimmed.match(
    /^(.+?)\s+(\d+)\s+(AO\s+PAR|ao\s+par|AO\s+METRO|ao\s+metro|und|UND|BARRA|metro|METRO|KG|LATA|LATINHA|ROLO|KIT|PAR|´PAR)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)$/i
  );

  if (!match) return null;

  const nome = match[1].trim();
  const codigo = Number(match[2]);
  const quantidade = Math.max(0, Math.round(parseBrazilianNumber(match[4])));
  const precoCusto = parseBrazilianNumber(match[5]);
  const categoria = categorize(nome);

  return {
    codigo,
    nome,
    quantidade,
    precoCusto,
    categoria,
    minima: suggestMinima(quantidade, categoria),
  };
}

async function main() {
  const lines = RAW_PRODUCT_LINES.split("\n").map((l) => l.trim()).filter(Boolean);
  const items = lines.map(parseProductLine).filter((item): item is ParsedItem => item !== null);

  console.log(`Itens parseados: ${items.length}`);

  const company = await prisma.company.findUnique({ where: { id: COMPANY_ID } });
  if (!company) {
    const first = await prisma.company.findFirst();
    if (!first) {
      throw new Error("Nenhuma empresa encontrada no banco. Rode o seed ou crie a empresa.");
    }
    console.warn(`Empresa ${COMPANY_ID} não encontrada. Usando: ${first.id} (${first.nome})`);
    await importForCompany(first.id, items);
  } else {
    await importForCompany(company.id, items);
  }
}

async function importForCompany(companyId: string, items: ParsedItem[]) {
  let created = 0;
  let updated = 0;

  for (const item of items) {
    const existing = await prisma.inventoryItem.findFirst({
      where: {
        company_id: companyId,
        nome: { equals: item.nome, mode: "insensitive" },
      },
    });

    if (existing) {
      await prisma.inventoryItem.update({
        where: { id: existing.id },
        data: {
          categoria: item.categoria,
          quantidade: item.quantidade,
          minima: item.minima,
          preco_custo: item.precoCusto,
          ativo: true,
        },
      });
      updated++;
    } else {
      await prisma.inventoryItem.create({
        data: {
          company_id: companyId,
          nome: item.nome,
          categoria: item.categoria,
          quantidade: item.quantidade,
          minima: item.minima,
          preco_custo: item.precoCusto,
        },
      });
      created++;
    }
  }

  const total = await prisma.inventoryItem.count({ where: { company_id: companyId, ativo: true } });
  console.log(`Importação concluída para empresa ${companyId}.`);
  console.log(`  Criados: ${created}`);
  console.log(`  Atualizados: ${updated}`);
  console.log(`  Total ativo no estoque: ${total}`);
}

main()
  .catch((error) => {
    console.error("Falha na importação:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
