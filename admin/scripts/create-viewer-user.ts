/**
 * Cria (ou atualiza o cargo de) o usuário somente leitura de teste.
 * Uso: VIEWER_TEST_PASSWORD='...' npx tsx scripts/create-viewer-user.ts
 *
 * A senha NÃO fica no código — só via variável de ambiente.
 * No banco, o Better Auth grava hash (não a senha em texto puro).
 */
import { auth } from "../src/lib/auth";
import { prisma } from "../src/lib/prisma";
import { DEFAULT_COMPANY_ID } from "../src/lib/constants";

const EMAIL = "teste@moveisunghero.com.br";
const NAME = "Usuário Teste (Leitura)";
const PASSWORD = process.env.VIEWER_TEST_PASSWORD?.trim() || "";

async function main() {
  if (!PASSWORD || PASSWORD.length < 8) {
    console.error(
      "Defina VIEWER_TEST_PASSWORD (mín. 8 caracteres). Ex.:\n" +
        "  VIEWER_TEST_PASSWORD='sua-senha' npx tsx scripts/create-viewer-user.ts"
    );
    process.exit(1);
  }

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
    console.log(
      `Para redefinir: VIEWER_NEW_PASSWORD='...' npx tsx scripts/reset-viewer-access.ts`
    );
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
  console.log(`  id: ${result.user.id}`);
  console.log(`  cargo: VIEWER`);
  console.log("  senha: (a que você passou em VIEWER_TEST_PASSWORD — não é logada)");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
