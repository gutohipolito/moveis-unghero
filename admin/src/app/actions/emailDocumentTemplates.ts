"use server";

import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-guard";
import { ensureActorUserId } from "@/lib/currentUser";
import { decryptVaultSecret } from "@/lib/accessVaultCrypto";
import { sendSmtpEmail } from "@/lib/emailSmtp";
import {
  composeDocumentEmail,
  getDefaultDocumentTemplate,
  getDefaultDocumentTemplates,
  sampleDocumentTemplateVars,
  type EmailDocumentTemplateType,
} from "@/lib/emailDocumentTemplates";
import { revalidatePath } from "next/cache";
import type { EmailMailboxArea } from "@prisma/client";

export type EmailDocumentTemplateDTO = {
  type: EmailDocumentTemplateType;
  subject: string;
  body: string;
  persisted: boolean;
};

async function requireAdminCompany() {
  const auth = await getAuthContext();
  if (!auth || auth.cargo !== "ADMIN") return null;
  return auth;
}

export async function listEmailDocumentTemplates(): Promise<{
  success: boolean;
  data: EmailDocumentTemplateDTO[];
  error?: string;
}> {
  const auth = await requireAdminCompany();
  if (!auth) {
    return { success: false, data: [], error: "Sem permissão." };
  }

  const rows = await prisma.emailDocumentTemplate.findMany({
    where: { company_id: auth.companyId },
  });
  const byType = new Map(rows.map((r) => [r.type, r]));

  const data: EmailDocumentTemplateDTO[] = getDefaultDocumentTemplates().map(
    (def) => {
      const row = byType.get(def.type);
      return {
        type: def.type,
        subject: row?.subject ?? def.subject,
        body: row?.body ?? def.body,
        persisted: Boolean(row),
      };
    }
  );

  return { success: true, data };
}

export async function upsertEmailDocumentTemplate(input: {
  type: EmailDocumentTemplateType;
  subject: string;
  body: string;
}) {
  const auth = await requireAdminCompany();
  if (!auth) {
    return { success: false as const, error: "Sem permissão." };
  }

  const type = input.type;
  if (type !== "QUOTE" && type !== "RECEIPT") {
    return { success: false as const, error: "Tipo inválido." };
  }

  const subject = (input.subject || "").trim();
  const body = (input.body || "").trim();
  if (!subject) {
    return { success: false as const, error: "Informe o assunto." };
  }
  if (!body) {
    return { success: false as const, error: "Informe o corpo do e-mail." };
  }

  await prisma.emailDocumentTemplate.upsert({
    where: {
      company_id_type: { company_id: auth.companyId, type },
    },
    create: {
      company_id: auth.companyId,
      type,
      subject,
      body,
    },
    update: { subject, body },
  });

  revalidatePath("/emails/config");
  return { success: true as const };
}

export async function resetEmailDocumentTemplate(
  type: EmailDocumentTemplateType
) {
  const auth = await requireAdminCompany();
  if (!auth) {
    return { success: false as const, error: "Sem permissão." };
  }

  const def = getDefaultDocumentTemplate(type);
  await prisma.emailDocumentTemplate.upsert({
    where: {
      company_id_type: { company_id: auth.companyId, type },
    },
    create: {
      company_id: auth.companyId,
      type,
      subject: def.subject,
      body: def.body,
    },
    update: { subject: def.subject, body: def.body },
  });

  revalidatePath("/emails/config");
  return {
    success: true as const,
    subject: def.subject,
    body: def.body,
  };
}

export async function previewEmailDocumentTemplate(input: {
  type: EmailDocumentTemplateType;
  subject?: string;
  body?: string;
}) {
  const auth = await requireAdminCompany();
  if (!auth) {
    return { success: false as const, error: "Sem permissão." };
  }

  const def = getDefaultDocumentTemplate(input.type);
  const subjectTemplate = (input.subject ?? def.subject).trim() || def.subject;
  const bodyTemplate = (input.body ?? def.body).trim() || def.body;
  const vars = sampleDocumentTemplateVars(input.type);

  const signature = await loadDocumentSignature(auth.companyId, input.type);
  const composed = composeDocumentEmail({
    subjectTemplate,
    bodyTemplate,
    vars,
    signature,
  });

  return {
    success: true as const,
    subject: composed.subject,
    html: composed.html,
    text: composed.text,
  };
}

export async function sendTestDocumentEmail(input: {
  type: EmailDocumentTemplateType;
  to: string;
  subject?: string;
  body?: string;
}) {
  const auth = await requireAdminCompany();
  if (!auth) {
    return { success: false as const, error: "Sem permissão." };
  }

  const to = (input.to || "").trim().toLowerCase();
  if (!to.includes("@")) {
    return { success: false as const, error: "Informe um e-mail de destino válido." };
  }

  const def = getDefaultDocumentTemplate(input.type);
  const subjectTemplate = (input.subject ?? def.subject).trim() || def.subject;
  const bodyTemplate = (input.body ?? def.body).trim() || def.body;

  const mailbox = await resolveTestOutboundMailbox(
    auth.companyId,
    input.type === "QUOTE" ? "COMERCIAL" : "FINANCEIRO"
  );
  if (!mailbox) {
    return {
      success: false as const,
      error:
        "Configure uma caixa Documentos (noreply) ou da área operacional ativa.",
    };
  }

  let password: string;
  try {
    password = decryptVaultSecret(mailbox.password_enc);
  } catch {
    return {
      success: false as const,
      error: "Não foi possível ler a senha da caixa.",
    };
  }

  const replyTo = await resolveAtendimentoReplyTo(auth.companyId);
  const composed = composeDocumentEmail({
    subjectTemplate,
    bodyTemplate,
    vars: sampleDocumentTemplateVars(input.type),
    signature: mailbox.signature_text,
  });

  const subject = `[TESTE] ${composed.subject}`;

  try {
    await sendSmtpEmail(
      {
        host: mailbox.smtp_host,
        port: mailbox.smtp_port,
        user: mailbox.address,
        pass: password,
      },
      {
        fromAddress: mailbox.address,
        fromName: mailbox.display_name,
        to,
        subject,
        text: composed.text,
        html: composed.html,
        replyTo,
      }
    );

    await prisma.emailOutboundLog.create({
      data: {
        company_id: auth.companyId,
        mailbox_id: mailbox.id,
        to_address: to,
        subject,
        status: "SENT",
        sent_by_id: await ensureActorUserId(),
      },
    });

    return { success: true as const, to, from: mailbox.address };
  } catch (error) {
    console.error("sendTestDocumentEmail:", error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Falha ao enviar teste.",
    };
  }
}

async function loadDocumentSignature(
  companyId: string,
  type: EmailDocumentTemplateType
) {
  const preferred: EmailMailboxArea[] =
    type === "QUOTE"
      ? ["DOCUMENTOS", "COMERCIAL"]
      : ["DOCUMENTOS", "FINANCEIRO"];

  for (const area of preferred) {
    const box = await prisma.emailMailbox.findFirst({
      where: { company_id: companyId, area, ativo: true },
      orderBy: { updatedAt: "desc" },
      select: { signature_text: true },
    });
    if (box?.signature_text) return box.signature_text;
  }
  return null;
}

async function resolveTestOutboundMailbox(
  companyId: string,
  fallback: EmailMailboxArea
) {
  for (const area of ["DOCUMENTOS", fallback] as EmailMailboxArea[]) {
    const box = await prisma.emailMailbox.findFirst({
      where: { company_id: companyId, area, ativo: true },
      orderBy: { updatedAt: "desc" },
    });
    if (box) return box;
  }
  return null;
}

async function resolveAtendimentoReplyTo(companyId: string) {
  const box = await prisma.emailMailbox.findFirst({
    where: { company_id: companyId, area: "ATENDIMENTO", ativo: true },
    orderBy: { updatedAt: "desc" },
    select: { address: true },
  });
  return box?.address || undefined;
}
