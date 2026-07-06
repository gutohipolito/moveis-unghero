import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COMPANY_ID = "mock-company-id";

async function main() {
  console.log("Garantindo empresa base (sem dados de demonstração)...");

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

  console.log("Empresa garantida. Use /api/create-admin-prod para o usuário admin@moveisunghero.com.br");
  console.log("O estoque importado não é alterado por este seed.");
}

main()
  .catch((e) => {
    console.error("Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
