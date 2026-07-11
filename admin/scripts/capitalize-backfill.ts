/**
 * Backfill único: padroniza a capitalização (Title Case) dos dados já existentes
 * no banco e corrige nomes de clientes PJ que começam com o CNPJ.
 *
 * Uso (simulação, não grava):   DRY_RUN=1 npx tsx scripts/capitalize-backfill.ts
 * Uso (aplica de verdade):      npx tsx scripts/capitalize-backfill.ts
 */

import { PrismaClient } from "@prisma/client";
import { capitalizeText } from "../src/lib/utils";

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN === "1";

/**
 * Remove um CPF/CNPJ (com ou sem rótulo/formatação) do início de um nome.
 * Ex.: "12.345.678/0001-90 - Móveis X" -> "Móveis X"
 *      "CNPJ: 12345678000190 Empresa Y" -> "Empresa Y"
 */
function stripLeadingDocument(nome: string): string {
  let n = (nome || "").trim();
  // Rótulo opcional (CNPJ/CPF) no início
  n = n.replace(/^\s*(cnpj|cpf)\s*[:\-–—]?\s*/i, "");
  // Documento formatado no início: grupos de dígitos separados por . / -
  // Cobre CNPJ completo (12.345.678/0001-90), a raiz do CNPJ (12.345.678) e CPF.
  n = n.replace(/^\s*\d{2,3}(?:[.\/-]\s?\d{2,4}){1,4}\s*[-–—:.]?\s*/, "");
  // Sequência longa de dígitos sem formatação (11 a 14 = CPF/CNPJ)
  n = n.replace(/^\s*\d{11,14}\s*[-–—:.]?\s*/, "");
  const cleaned = n.trim();
  // Se sobrou vazio (o nome era só o documento), preserva o original
  return cleaned.length > 0 ? cleaned : nome.trim();
}

const stats: Record<string, number> = {};
function bump(key: string) {
  stats[key] = (stats[key] ?? 0) + 1;
}

async function run() {
  console.log(`\n=== Backfill de capitalização ${DRY_RUN ? "(DRY-RUN)" : "(APLICANDO)"} ===\n`);

  // 1. Clientes (nome, cidade, bairro, endereço) + correção de nome PJ com CNPJ
  const clients = await prisma.client.findMany({
    select: {
      id: true,
      nome: true,
      cidade: true,
      bairro: true,
      endereco: true,
      tipo_pessoa: true,
    },
  });
  for (const c of clients) {
    let baseNome = c.nome;
    if (c.tipo_pessoa === "PJ") {
      baseNome = stripLeadingDocument(baseNome);
    }
    const data: Record<string, string> = {};
    const nome = capitalizeText(baseNome);
    if (nome && nome !== c.nome) data.nome = nome;
    const cidade = capitalizeText(c.cidade);
    if (cidade && cidade !== c.cidade) data.cidade = cidade;
    if (c.bairro) {
      const bairro = capitalizeText(c.bairro);
      if (bairro !== c.bairro) data.bairro = bairro;
    }
    if (c.endereco) {
      const endereco = capitalizeText(c.endereco);
      if (endereco !== c.endereco) data.endereco = endereco;
    }
    if (Object.keys(data).length > 0) {
      bump("clients");
      if (data.nome && c.tipo_pessoa === "PJ" && c.nome !== data.nome) bump("clientsPJ");
      if (DRY_RUN) {
        console.log(`  [cliente] "${c.nome}" -> "${data.nome ?? c.nome}"`);
      } else {
        await prisma.client.update({ where: { id: c.id }, data });
      }
    }
  }

  // 2. Fornecedores (nome, principal_material)
  const suppliers = await prisma.supplier.findMany({
    select: { id: true, nome: true, principal_material: true },
  });
  for (const s of suppliers) {
    const data: Record<string, string> = {};
    const nome = capitalizeText(s.nome);
    if (nome && nome !== s.nome) data.nome = nome;
    if (s.principal_material) {
      const pm = capitalizeText(s.principal_material);
      if (pm !== s.principal_material) data.principal_material = pm;
    }
    if (Object.keys(data).length > 0) {
      bump("suppliers");
      if (DRY_RUN) console.log(`  [fornecedor] "${s.nome}" -> "${data.nome ?? s.nome}"`);
      else await prisma.supplier.update({ where: { id: s.id }, data });
    }
  }

  // 3. Itens de estoque (nome)
  const items = await prisma.inventoryItem.findMany({ select: { id: true, nome: true } });
  for (const it of items) {
    const nome = capitalizeText(it.nome);
    if (nome && nome !== it.nome) {
      bump("inventory");
      if (DRY_RUN) console.log(`  [insumo] "${it.nome}" -> "${nome}"`);
      else await prisma.inventoryItem.update({ where: { id: it.id }, data: { nome } });
    }
  }

  // 4. Parceiros (nome, cidade, escritório)
  const partners = await prisma.professionalPartner.findMany({
    select: { id: true, nome: true, cidade: true, escritorio: true },
  });
  for (const p of partners) {
    const data: Record<string, string> = {};
    const nome = capitalizeText(p.nome);
    if (nome && nome !== p.nome) data.nome = nome;
    if (p.cidade) {
      const cidade = capitalizeText(p.cidade);
      if (cidade !== p.cidade) data.cidade = cidade;
    }
    if (p.escritorio) {
      const escritorio = capitalizeText(p.escritorio);
      if (escritorio !== p.escritorio) data.escritorio = escritorio;
    }
    if (Object.keys(data).length > 0) {
      bump("partners");
      if (DRY_RUN) console.log(`  [parceiro] "${p.nome}" -> "${data.nome ?? p.nome}"`);
      else await prisma.professionalPartner.update({ where: { id: p.id }, data });
    }
  }

  // 5. Colaboradores (name, areaAtuacao)
  const users = await prisma.user.findMany({
    select: { id: true, name: true, areaAtuacao: true },
  });
  for (const u of users) {
    const data: Record<string, string> = {};
    const name = capitalizeText(u.name);
    if (name && name !== u.name) data.name = name;
    if (u.areaAtuacao) {
      const area = capitalizeText(u.areaAtuacao);
      if (area !== u.areaAtuacao) data.areaAtuacao = area;
    }
    if (Object.keys(data).length > 0) {
      bump("users");
      if (DRY_RUN) console.log(`  [colaborador] "${u.name}" -> "${data.name ?? u.name}"`);
      else await prisma.user.update({ where: { id: u.id }, data });
    }
  }

  // 6. Ambientes (nome)
  const envs = await prisma.environment.findMany({ select: { id: true, nome: true } });
  for (const e of envs) {
    const nome = capitalizeText(e.nome);
    if (nome && nome !== e.nome) {
      bump("environments");
      if (DRY_RUN) console.log(`  [ambiente] "${e.nome}" -> "${nome}"`);
      else await prisma.environment.update({ where: { id: e.id }, data: { nome } });
    }
  }

  // 7. Itens de cadastro / catálogo (label)
  const catalog = await prisma.catalogItem.findMany({ select: { id: true, label: true } });
  for (const ci of catalog) {
    const label = capitalizeText(ci.label);
    if (label && label !== ci.label) {
      bump("catalog");
      if (DRY_RUN) console.log(`  [cadastro] "${ci.label}" -> "${label}"`);
      else await prisma.catalogItem.update({ where: { id: ci.id }, data: { label } });
    }
  }

  console.log("\n--- Resumo ---");
  console.log(`Clientes atualizados:     ${stats.clients ?? 0} (PJ c/ CNPJ corrigido: ${stats.clientsPJ ?? 0})`);
  console.log(`Fornecedores:             ${stats.suppliers ?? 0}`);
  console.log(`Itens de estoque:         ${stats.inventory ?? 0}`);
  console.log(`Parceiros:                ${stats.partners ?? 0}`);
  console.log(`Colaboradores:            ${stats.users ?? 0}`);
  console.log(`Ambientes:                ${stats.environments ?? 0}`);
  console.log(`Itens de cadastro:        ${stats.catalog ?? 0}`);
  console.log(DRY_RUN ? "\n(DRY-RUN: nada foi gravado)\n" : "\nBackfill concluído.\n");
}

run()
  .catch((error) => {
    console.error("Falha no backfill:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
