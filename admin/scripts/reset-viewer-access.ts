/**
 * Redefine a senha de todos os usuários VIEWER e encerra sessões/push.
 * Uso: npx tsx scripts/reset-viewer-access.ts
 *
 * Senha via env VIEWER_NEW_PASSWORD ou gerada automaticamente.
 */
import { randomBytes } from "crypto";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "../src/lib/prisma";

function generatePassword() {
  // Legível o bastante para passar ao usuário, sem caracteres ambíguos.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
  const bytes = randomBytes(16);
  let out = "MuV!";
  for (let i = 0; i < 12; i += 1) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return out;
}

async function main() {
  const newPassword = process.env.VIEWER_NEW_PASSWORD?.trim() || generatePassword();
  const viewers = await prisma.user.findMany({
    where: { cargo: "VIEWER" },
    select: { id: true, email: true, name: true },
  });

  if (viewers.length === 0) {
    console.log("Nenhum usuário VIEWER encontrado.");
    return;
  }

  const hashed = await hashPassword(newPassword);

  for (const viewer of viewers) {
    const accounts = await prisma.account.findMany({
      where: { userId: viewer.id },
      select: { id: true, providerId: true },
    });

    const credentialAccount = accounts.find(
      (a) => a.providerId === "credential" || a.providerId === "email"
    );

    if (credentialAccount) {
      await prisma.account.update({
        where: { id: credentialAccount.id },
        data: { password: hashed, updatedAt: new Date() },
      });
    } else {
      await prisma.account.create({
        data: {
          id: randomBytes(16).toString("hex"),
          accountId: viewer.id,
          providerId: "credential",
          userId: viewer.id,
          password: hashed,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    const sessions = await prisma.session.deleteMany({ where: { userId: viewer.id } });
    const push = await prisma.pushSubscription.deleteMany({ where: { user_id: viewer.id } });

    console.log(`VIEWER atualizado: ${viewer.email} (${viewer.name})`);
    console.log(`  sessões encerradas: ${sessions.count}`);
    console.log(`  push removidos: ${push.count}`);
  }

  console.log("\nNova senha (todos os VIEWER):");
  console.log(newPassword);
  console.log("\nGuarde esta senha — ela não será exibida novamente.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
