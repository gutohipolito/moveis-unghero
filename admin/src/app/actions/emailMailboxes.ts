"use server";

import { revalidatePath } from "next/cache";
import type { EmailMailboxArea, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getModuleAccess, getWriteAccess } from "@/lib/moduleAccess";
import { encryptVaultSecret, decryptVaultSecret } from "@/lib/accessVaultCrypto";
import {
  DEFAULT_IMAP_HOST,
  DEFAULT_IMAP_PORT,
  DEFAULT_ROLES_BY_AREA,
  DEFAULT_SMTP_HOST,
  DEFAULT_SMTP_PORT,
  EMAIL_AREA_LABELS,
  EMAIL_MAILBOX_AREAS,
} from "@/lib/emailAreas";
import { testImapConnection } from "@/lib/emailImap";
import { testSmtpConnection } from "@/lib/emailSmtp";
import { isReadOnlyRole } from "@/lib/permissions";

export type EmailMailboxDTO = {
  id: string;
  area: EmailMailboxArea;
  areaLabel: string;
  address: string;
  displayName: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  ativo: boolean;
  roles: Role[];
  hasPassword: boolean;
  createdAt: string;
  updatedAt: string;
};

export type EmailMailboxInput = {
  area: EmailMailboxArea;
  address: string;
  displayName: string;
  imapHost?: string;
  imapPort?: number;
  smtpHost?: string;
  smtpPort?: number;
  password?: string;
  ativo?: boolean;
  roles?: Role[];
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isMailboxArea(value: string): value is EmailMailboxArea {
  return EMAIL_MAILBOX_AREAS.includes(value as EmailMailboxArea);
}

async function assertCanManageMailboxes() {
  const auth = await getWriteAccess("emails");
  if (!auth) return null;
  if (auth.cargo !== "ADMIN") return null;
  return auth;
}

export async function listEmailMailboxesForUser() {
  const auth = await getModuleAccess("emails");
  if (!auth) {
    return { success: false as const, error: "Sem acesso ao módulo de e-mails", data: [] as EmailMailboxDTO[] };
  }

  try {
    const where =
      auth.cargo === "ADMIN"
        ? { company_id: auth.companyId, ativo: true }
        : {
            company_id: auth.companyId,
            ativo: true,
            roleAccess: { some: { role: auth.cargo } },
          };

    const rows = await prisma.emailMailbox.findMany({
      where,
      include: { roleAccess: { select: { role: true } } },
      orderBy: [{ area: "asc" }, { address: "asc" }],
    });

    return {
      success: true as const,
      data: rows.map((row) => ({
        id: row.id,
        area: row.area,
        areaLabel: EMAIL_AREA_LABELS[row.area],
        address: row.address,
        displayName: row.display_name,
        imapHost: row.imap_host,
        imapPort: row.imap_port,
        smtpHost: row.smtp_host,
        smtpPort: row.smtp_port,
        ativo: row.ativo,
        roles: row.roleAccess.map((r) => r.role),
        hasPassword: Boolean(row.password_enc),
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error("listEmailMailboxesForUser:", error);
    return { success: false as const, error: "Erro ao listar caixas", data: [] as EmailMailboxDTO[] };
  }
}

/** Lista todas as caixas (ativas e inativas) — só Diretoria. */
export async function listAllEmailMailboxesAdmin() {
  const auth = await assertCanManageMailboxes();
  if (!auth) {
    return { success: false as const, error: "Apenas a Diretoria configura caixas.", data: [] as EmailMailboxDTO[] };
  }

  const rows = await prisma.emailMailbox.findMany({
    where: { company_id: auth.companyId },
    include: { roleAccess: { select: { role: true } } },
    orderBy: [{ area: "asc" }, { address: "asc" }],
  });

  return {
    success: true as const,
    data: rows.map((row) => ({
      id: row.id,
      area: row.area,
      areaLabel: EMAIL_AREA_LABELS[row.area],
      address: row.address,
      displayName: row.display_name,
      imapHost: row.imap_host,
      imapPort: row.imap_port,
      smtpHost: row.smtp_host,
      smtpPort: row.smtp_port,
      ativo: row.ativo,
      roles: row.roleAccess.map((r) => r.role),
      hasPassword: Boolean(row.password_enc),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
  };
}

export async function upsertEmailMailbox(input: EmailMailboxInput, mailboxId?: string) {
  const auth = await assertCanManageMailboxes();
  if (!auth) {
    return { success: false as const, error: "Apenas a Diretoria configura caixas." };
  }

  if (!isMailboxArea(input.area)) {
    return { success: false as const, error: "Área inválida." };
  }

  const address = normalizeEmail(input.address || "");
  const displayName = (input.displayName || "").trim();
  if (!address || !address.includes("@")) {
    return { success: false as const, error: "Informe um e-mail válido." };
  }
  if (!displayName) {
    return { success: false as const, error: "Informe o nome de exibição." };
  }

  const roles = (input.roles?.length ? input.roles : DEFAULT_ROLES_BY_AREA[input.area]).filter(
    (r) => r !== "ADMIN"
  ) as Role[];

  try {
    if (mailboxId) {
      const existing = await prisma.emailMailbox.findFirst({
        where: { id: mailboxId, company_id: auth.companyId },
      });
      if (!existing) {
        return { success: false as const, error: "Caixa não encontrada." };
      }

      const passwordEnc =
        input.password && input.password.trim()
          ? encryptVaultSecret(input.password.trim())
          : existing.password_enc;

      await prisma.$transaction(async (tx) => {
        await tx.emailMailbox.update({
          where: { id: mailboxId },
          data: {
            area: input.area,
            address,
            display_name: displayName,
            imap_host: (input.imapHost || DEFAULT_IMAP_HOST).trim(),
            imap_port: Number(input.imapPort) || DEFAULT_IMAP_PORT,
            smtp_host: (input.smtpHost || DEFAULT_SMTP_HOST).trim(),
            smtp_port: Number(input.smtpPort) || DEFAULT_SMTP_PORT,
            password_enc: passwordEnc,
            ativo: input.ativo !== false,
          },
        });
        await tx.emailMailboxAccess.deleteMany({ where: { mailbox_id: mailboxId } });
        if (roles.length) {
          await tx.emailMailboxAccess.createMany({
            data: roles.map((role) => ({ mailbox_id: mailboxId, role })),
          });
        }
      });
    } else {
      if (!input.password?.trim()) {
        return { success: false as const, error: "Informe a senha do webmail/IMAP." };
      }
      const created = await prisma.emailMailbox.create({
        data: {
          company_id: auth.companyId,
          area: input.area,
          address,
          display_name: displayName,
          imap_host: (input.imapHost || DEFAULT_IMAP_HOST).trim(),
          imap_port: Number(input.imapPort) || DEFAULT_IMAP_PORT,
          smtp_host: (input.smtpHost || DEFAULT_SMTP_HOST).trim(),
          smtp_port: Number(input.smtpPort) || DEFAULT_SMTP_PORT,
          password_enc: encryptVaultSecret(input.password.trim()),
          ativo: input.ativo !== false,
          roleAccess: {
            create: roles.map((role) => ({ role })),
          },
        },
      });
      void created;
    }

    revalidatePath("/emails");
    revalidatePath("/emails/config");
    return { success: true as const };
  } catch (error) {
    console.error("upsertEmailMailbox:", error);
    const msg = error instanceof Error ? error.message : "Erro ao salvar caixa";
    if (/Unique constraint/i.test(msg)) {
      return { success: false as const, error: "Já existe uma caixa com este endereço." };
    }
    return { success: false as const, error: "Erro ao salvar caixa." };
  }
}

export async function deleteEmailMailbox(mailboxId: string) {
  const auth = await assertCanManageMailboxes();
  if (!auth) {
    return { success: false as const, error: "Apenas a Diretoria configura caixas." };
  }

  const existing = await prisma.emailMailbox.findFirst({
    where: { id: mailboxId, company_id: auth.companyId },
    select: { id: true },
  });
  if (!existing) {
    return { success: false as const, error: "Caixa não encontrada." };
  }

  await prisma.emailMailbox.delete({ where: { id: mailboxId } });
  revalidatePath("/emails");
  revalidatePath("/emails/config");
  return { success: true as const };
}

export async function testEmailMailboxConnection(mailboxId: string) {
  const auth = await getModuleAccess("emails");
  if (!auth || isReadOnlyRole(auth.cargo)) {
    return { success: false as const, error: "Sem permissão." };
  }

  const mailbox = await prisma.emailMailbox.findFirst({
    where:
      auth.cargo === "ADMIN"
        ? { id: mailboxId, company_id: auth.companyId }
        : {
            id: mailboxId,
            company_id: auth.companyId,
            roleAccess: { some: { role: auth.cargo } },
          },
  });
  if (!mailbox) {
    return { success: false as const, error: "Caixa não encontrada." };
  }

  let password: string;
  try {
    password = decryptVaultSecret(mailbox.password_enc);
  } catch {
    return { success: false as const, error: "Não foi possível ler a senha da caixa." };
  }

  const imap = await testImapConnection({
    host: mailbox.imap_host,
    port: mailbox.imap_port,
    user: mailbox.address,
    pass: password,
  });
  if (!imap.success) {
    return {
      success: false as const,
      error: imap.error || "IMAP: falha ao conectar. Confira senha e HostGator.",
    };
  }

  const smtp = await testSmtpConnection({
    host: mailbox.smtp_host,
    port: mailbox.smtp_port,
    user: mailbox.address,
    pass: password,
  });
  if (!smtp.success) {
    return {
      success: false as const,
      error: smtp.error || "SMTP: falha ao conectar. Confira senha e HostGator.",
    };
  }

  return { success: true as const };
}

/** Uso interno: carrega caixa + senha se o usuário puder acessá-la. */
export async function loadAccessibleMailboxSecrets(mailboxId: string) {
  const auth = await getModuleAccess("emails");
  if (!auth) return null;

  const mailbox = await prisma.emailMailbox.findFirst({
    where:
      auth.cargo === "ADMIN"
        ? { id: mailboxId, company_id: auth.companyId, ativo: true }
        : {
            id: mailboxId,
            company_id: auth.companyId,
            ativo: true,
            roleAccess: { some: { role: auth.cargo } },
          },
  });
  if (!mailbox) return null;

  let password: string;
  try {
    password = decryptVaultSecret(mailbox.password_enc);
  } catch {
    return null;
  }

  return { auth, mailbox, password };
}

export async function loadMailboxByAreaForSend(area: EmailMailboxArea) {
  const auth = await getWriteAccess("emails");
  if (!auth || isReadOnlyRole(auth.cargo)) return null;

  const mailbox = await prisma.emailMailbox.findFirst({
    where:
      auth.cargo === "ADMIN"
        ? { company_id: auth.companyId, area, ativo: true }
        : {
            company_id: auth.companyId,
            area,
            ativo: true,
            roleAccess: { some: { role: auth.cargo } },
          },
    orderBy: { updatedAt: "desc" },
  });
  if (!mailbox) return null;

  let password: string;
  try {
    password = decryptVaultSecret(mailbox.password_enc);
  } catch {
    return null;
  }

  return { auth, mailbox, password };
}
