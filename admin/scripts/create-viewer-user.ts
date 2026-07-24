/**
 * Cria (ou atualiza o cargo de) o usuário somente leitura de teste.
 * Uso: npx tsx scripts/create-viewer-user.ts
 */
import { auth } from "../src/lib/auth";
import { prisma } from "../src/lib/prisma";
import { DEFAULT_COMPANY_ID } from "../src/lib/constants";

const EMAIL = "teste@moveisunghero.com.br";
const NAME = "Usuário Teste (Leitura)";
const PASSWORD = process.env.VIEWER_TEST_PASSWORD || "UngheroLeitura!2026";

async function main() {
  const company = await prisma.company.upsert({
    where: { id: DEFAULT_COMPANY_ID },
    update: {},
    create: {
      id: DEFAULT_COMPANY_ID,
      nome: "Móveis Unghero",
      cnpj: "13.415.510/0001-71",
      telefone: "(54) 9 9997-1050",
      email: "moveisunghero@gmail.com",
    },
  });

  const existing = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        cargo: "VIEWER",
        company_id: company.id,
        name: NAME,
      },
    });
    console.log(`Usuário já existia — cargo atualizado para VIEWER: ${EMAIL}`);
    console.log(`Senha atual permanece a mesma (não foi redefinida).`);
    return;
  }

  const result = await auth.api.signUpEmail({
    body: {
      email: EMAIL,
      password: PASSWORD,
      name: NAME,
      company_id: company.id,
      cargo: "VIEWER",
    },
  });

  console.log("Usuário VIEWER criado:");
  console.log(`  email: ${EMAIL}`);
  console.log(`  senha: ${PASSWORD}`);
  console.log(`  id: ${result.user.id}`);
  console.log(`  cargo: VIEWER`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
