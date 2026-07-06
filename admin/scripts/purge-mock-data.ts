/**
 * Remove dados de demonstração do banco, preservando estoque e o admin principal.
 * Uso: npx tsx scripts/purge-mock-data.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "admin@moveisunghero.com.br";
const COMPANY_ID = "mock-company-id";

async function main() {
  console.log("Iniciando limpeza de dados mock...");

  await prisma.timeline.deleteMany();
  await prisma.quoteItem.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.installment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.file.deleteMany();
  await prisma.projectSlaState.deleteMany();
  await prisma.environment.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.operatorNote.deleteMany();
  await prisma.operatorReminder.deleteMany();
  await prisma.timeCard.deleteMany();
  await prisma.professionalPartner.deleteMany();
  await prisma.supplier.deleteMany();

  const usersToRemove = await prisma.user.findMany({
    where: { email: { not: ADMIN_EMAIL } },
    select: { id: true, email: true },
  });

  for (const user of usersToRemove) {
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await prisma.account.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    console.log(`  Usuário removido: ${user.email}`);
  }

  await prisma.company.upsert({
    where: { id: COMPANY_ID },
    update: {
      nome: "Móveis Unghero",
      cnpj: "13.415.510/0001-71",
      telefone: "(54) 9 9997-1050",
      email: "moveisunghero@gmail.com",
    },
    create: {
      id: COMPANY_ID,
      nome: "Móveis Unghero",
      cnpj: "13.415.510/0001-71",
      telefone: "(54) 9 9997-1050",
      email: "moveisunghero@gmail.com",
    },
  });

  const inventoryCount = await prisma.inventoryItem.count({
    where: { company_id: COMPANY_ID, ativo: true },
  });

  const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

  console.log("\nLimpeza concluída.");
  console.log(`  Estoque preservado: ${inventoryCount} itens`);
  console.log(
    admin
      ? `  Admin ativo: ${admin.email} (${admin.id})`
      : `  Admin "${ADMIN_EMAIL}" não encontrado — crie via /api/create-admin-prod`
  );
}

main()
  .catch((error) => {
    console.error("Falha na limpeza:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
