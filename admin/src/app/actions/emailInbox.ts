"use server";

import { prisma } from "@/lib/prisma";
import { ensureActorUserId } from "@/lib/currentUser";
import { getWriteAccess } from "@/lib/moduleAccess";
import { isReadOnlyRole } from "@/lib/permissions";
import { decryptVaultSecret } from "@/lib/accessVaultCrypto";
import { EMAIL_INBOX_PAGE_SIZE, EMAIL_MAX_ATTACHMENT_BYTES } from "@/lib/emailAreas";
import {
  fetchInboxMessage,
  listInboxMessages,
  type EmailListItem,
} from "@/lib/emailImap";
import { sendSmtpEmail } from "@/lib/emailSmtp";
import {
  loadAccessibleMailboxSecrets,
} from "@/app/actions/emailMailboxes";
import type { EmailMailboxArea } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function listMailboxInbox(mailboxId: string) {
  const loaded = await loadAccessibleMailboxSecrets(mailboxId);
  if (!loaded) {
    return { success: false as const, error: "Caixa indisponível.", data: [] as EmailListItem[] };
  }

  try {
    const data = await listInboxMessages(
      {
        host: loaded.mailbox.imap_host,
        port: loaded.mailbox.imap_port,
        user: loaded.mailbox.address,
        pass: loaded.password,
      },
      { limit: EMAIL_INBOX_PAGE_SIZE }
    );
    return { success: true as const, data };
  } catch (error) {
    console.error("listMailboxInbox:", error);
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível listar a caixa de entrada.",
      data: [] as EmailListItem[],
    };
  }
}

export async function getMailboxMessage(mailboxId: string, uid: number) {
  const loaded = await loadAccessibleMailboxSecrets(mailboxId);
  if (!loaded) {
    return { success: false as const, error: "Caixa indisponível." };
  }

  try {
    const data = await fetchInboxMessage(
      {
        host: loaded.mailbox.imap_host,
        port: loaded.mailbox.imap_port,
        user: loaded.mailbox.address,
        pass: loaded.password,
      },
      uid
    );
    if (!data) {
      return { success: false as const, error: "Mensagem não encontrada." };
    }
    return { success: true as const, data };
  } catch (error) {
    console.error("getMailboxMessage:", error);
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Não foi possível abrir a mensagem.",
    };
  }
}

export type ComposeEmailInput = {
  mailboxId: string;
  to: string;
  subject: string;
  text: string;
  inReplyTo?: string;
  references?: string[];
  attachments?: Array<{
    filename: string;
    contentBase64: string;
    contentType?: string;
  }>;
};

export async function sendMailboxEmail(input: ComposeEmailInput) {
  const loaded = await loadAccessibleMailboxSecrets(input.mailboxId);
  if (!loaded || isReadOnlyRole(loaded.auth.cargo)) {
    return { success: false as const, error: "Sem permissão para enviar." };
  }

  const to = input.to.trim();
  const subject = input.subject.trim();
  const text = input.text.trim();
  if (!to || !to.includes("@")) {
    return { success: false as const, error: "Informe o destinatário." };
  }
  if (!subject) {
    return { success: false as const, error: "Informe o assunto." };
  }
  if (!text) {
    return { success: false as const, error: "Informe a mensagem." };
  }

  const attachments = (input.attachments || []).map((a) => {
    const content = Buffer.from(a.contentBase64, "base64");
    if (content.length > EMAIL_MAX_ATTACHMENT_BYTES) {
      throw new Error(`Anexo ${a.filename} muito grande.`);
    }
    return {
      filename: a.filename,
      content,
      contentType: a.contentType,
    };
  });

  try {
    await sendSmtpEmail(
      {
        host: loaded.mailbox.smtp_host,
        port: loaded.mailbox.smtp_port,
        user: loaded.mailbox.address,
        pass: loaded.password,
      },
      {
        fromAddress: loaded.mailbox.address,
        fromName: loaded.mailbox.display_name,
        to,
        subject,
        text,
        inReplyTo: input.inReplyTo,
        references: input.references,
        attachments,
      }
    );

    const actorId = await ensureActorUserId();
    await prisma.emailOutboundLog.create({
      data: {
        company_id: loaded.auth.companyId,
        mailbox_id: loaded.mailbox.id,
        to_address: to,
        subject,
        status: "SENT",
        sent_by_id: actorId,
      },
    });

    return { success: true as const };
  } catch (error) {
    console.error("sendMailboxEmail:", error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Falha ao enviar e-mail.",
    };
  }
}

async function resolveOutboundMailbox(
  area: EmailMailboxArea,
  moduleKey: "quotes" | "financeiro" | "emails"
) {
  const auth = await getWriteAccess(moduleKey);
  if (!auth || isReadOnlyRole(auth.cargo)) return null;

  // Prefer mailbox accessible by role; ADMIN sees all.
  const mailbox = await prisma.emailMailbox.findFirst({
    where:
      auth.cargo === "ADMIN"
        ? { company_id: auth.companyId, area, ativo: true }
        : {
            company_id: auth.companyId,
            area,
            ativo: true,
            OR: [
              { roleAccess: { some: { role: auth.cargo } } },
              // fallback if ACL empty but user has module write
              { roleAccess: { none: {} } },
            ],
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

export async function sendQuoteByEmail(input: {
  quoteId: string;
  to?: string;
}) {
  const authQuotes = await getWriteAccess("quotes");
  if (!authQuotes || isReadOnlyRole(authQuotes.cargo)) {
    return { success: false as const, error: "Sem permissão para enviar orçamento." };
  }

  const quote = await prisma.quote.findFirst({
    where: {
      id: input.quoteId,
      project: { client: { company_id: authQuotes.companyId } },
    },
    select: {
      id: true,
      project_id: true,
      versao: true,
      validade: true,
      pdf_share_code: true,
      project: {
        select: {
          client: { select: { nome: true, email: true, telefone: true } },
        },
      },
    },
  });
  if (!quote) {
    return { success: false as const, error: "Orçamento não encontrado." };
  }

  const to = (input.to || quote.project.client.email || "").trim().toLowerCase();
  if (!to || !to.includes("@")) {
    return {
      success: false as const,
      error: "Cliente sem e-mail cadastrado. Informe o destinatário.",
    };
  }

  const loaded = await resolveOutboundMailbox("COMERCIAL", "quotes");
  if (!loaded) {
    return {
      success: false as const,
      error: "Configure uma caixa Comercial ativa em E-mails → Configurar caixas.",
    };
  }

  // Garante link público
  let shareCode = quote.pdf_share_code;
  if (!shareCode) {
    const { generateUniqueQuotePdfShareCode } = await import("@/lib/quotePdfShare");
    shareCode = await generateUniqueQuotePdfShareCode();
    await prisma.quote.update({
      where: { id: quote.id },
      data: { pdf_share_code: shareCode, pdf_shared_at: new Date() },
    });
  } else {
    await prisma.quote.update({
      where: { id: quote.id },
      data: { pdf_shared_at: new Date() },
    });
  }

  const { buildQuotePdfShortUrl } = await import("@/lib/quotePdfShare");
  const { formatDateBR } = await import("@/lib/brazilDate");
  const { getFirstName } = await import("@/lib/google-review");
  const { getPhoneLastFourDigits } = await import("@/lib/phone");

  const url = buildQuotePdfShortUrl(shareCode);
  const firstName = getFirstName(quote.project.client.nome);
  const validade = formatDateBR(quote.validade);
  const hasPin = Boolean(getPhoneLastFourDigits(quote.project.client.telefone || ""));

  const lines = [
    `Olá ${firstName}, tudo bem?`,
    "",
    "Segue o seu orçamento da Móveis Unghero:",
    "",
    `Validade da proposta: ${validade}`,
    "",
    "Acesse pelo link:",
    url,
  ];
  if (hasPin) {
    lines.push(
      "",
      "Senha para abrir: os 4 últimos dígitos do seu celular cadastrado conosco."
    );
  }
  lines.push("", "Qualquer dúvida, estamos à disposição!", "Equipe Móveis Unghero");

  const subject = `Orçamento Móveis Unghero — ${quote.project.client.nome}`;
  const text = lines.join("\n");

  try {
    await sendSmtpEmail(
      {
        host: loaded.mailbox.smtp_host,
        port: loaded.mailbox.smtp_port,
        user: loaded.mailbox.address,
        pass: loaded.password,
      },
      {
        fromAddress: loaded.mailbox.address,
        fromName: loaded.mailbox.display_name,
        to,
        subject,
        text,
      }
    );

    const actorId = await ensureActorUserId();
    await prisma.emailOutboundLog.create({
      data: {
        company_id: loaded.auth.companyId,
        mailbox_id: loaded.mailbox.id,
        project_id: quote.project_id,
        quote_id: quote.id,
        to_address: to,
        subject,
        status: "SENT",
        sent_by_id: actorId,
      },
    });

    await prisma.timeline.create({
      data: {
        project_id: quote.project_id,
        acao: `Orçamento v${quote.versao} enviado por e-mail para ${to}.`,
        interno_sotamente: false,
        user_id: actorId,
      },
    });

    revalidatePath(`/projects/${quote.project_id}`);
    revalidatePath("/quotes");
    return { success: true as const, to };
  } catch (error) {
    console.error("sendQuoteByEmail:", error);
    const msg = error instanceof Error ? error.message : "Falha ao enviar.";
    try {
      await prisma.emailOutboundLog.create({
        data: {
          company_id: loaded.auth.companyId,
          mailbox_id: loaded.mailbox.id,
          project_id: quote.project_id,
          quote_id: quote.id,
          to_address: to,
          subject,
          status: "FAILED",
          error: msg,
          sent_by_id: await ensureActorUserId(),
        },
      });
    } catch {
      /* ignore */
    }
    return { success: false as const, error: msg };
  }
}

export async function sendReceiptByEmail(input: {
  receiptId: string;
  to?: string;
}) {
  const authFin =
    (await getWriteAccess("financeiro")) || (await getWriteAccess("crm"));
  if (!authFin || isReadOnlyRole(authFin.cargo)) {
    return { success: false as const, error: "Sem permissão para enviar recibo." };
  }

  const receipt = await prisma.paymentReceipt.findFirst({
    where: { id: input.receiptId, company_id: authFin.companyId },
    select: {
      id: true,
      project_id: true,
      client_id: true,
      numero: true,
      valor: true,
      share_code: true,
      cliente_nome: true,
      client: { select: { email: true, telefone: true, nome: true } },
    },
  });
  if (!receipt) {
    return { success: false as const, error: "Recibo não encontrado." };
  }

  const to = (input.to || receipt.client?.email || "").trim().toLowerCase();
  if (!to || !to.includes("@")) {
    return {
      success: false as const,
      error: "Cliente sem e-mail cadastrado. Informe o destinatário.",
    };
  }

  const loaded =
    (await resolveOutboundMailbox("FINANCEIRO", "financeiro")) ||
    (await resolveOutboundMailbox("FINANCEIRO", "emails"));
  if (!loaded) {
    // Fallback: any FINANCEIRO mailbox in company for ADMIN/crm writers
    const mailbox = await prisma.emailMailbox.findFirst({
      where: {
        company_id: authFin.companyId,
        area: "FINANCEIRO",
        ativo: true,
      },
      orderBy: { updatedAt: "desc" },
    });
    if (!mailbox) {
      return {
        success: false as const,
        error: "Configure uma caixa Financeiro ativa em E-mails → Configurar caixas.",
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
    return sendReceiptWithMailbox(
      { auth: authFin, mailbox, password },
      receipt,
      to
    );
  }

  return sendReceiptWithMailbox(loaded, receipt, to);
}

async function sendReceiptWithMailbox(
  loaded: {
    auth: { companyId: string };
    mailbox: {
      id: string;
      address: string;
      display_name: string;
      smtp_host: string;
      smtp_port: number;
    };
    password: string;
  },
  receipt: {
    id: string;
    project_id: string | null;
    numero: number | null;
    valor: { toString(): string } | number;
    share_code: string | null;
    cliente_nome: string;
    client: { email: string | null; telefone: string | null; nome: string } | null;
  },
  to: string
) {
  const {
    ensureReceiptShareCode,
    buildReceiptShortUrl,
    buildReceiptWhatsAppMessage,
  } = await import("@/lib/receiptShare");
  const { formatCurrencyBRL } = await import("@/lib/currencyExtenso");

  let shareCode = receipt.share_code;
  if (!shareCode) {
    shareCode = await ensureReceiptShareCode(receipt.id);
  }

  const url = buildReceiptShortUrl(shareCode!);
  const valorLabel = formatCurrencyBRL(Number(receipt.valor));
  const numeroLabel = receipt.numero ? `nº ${receipt.numero}` : null;
  const text = buildReceiptWhatsAppMessage({
    clientName: receipt.cliente_nome || receipt.client?.nome || "cliente",
    valorLabel,
    receiptUrl: url,
    numeroLabel,
  });
  const subject = `Recibo Móveis Unghero${numeroLabel ? ` ${numeroLabel}` : ""} — ${valorLabel}`;

  try {
    await sendSmtpEmail(
      {
        host: loaded.mailbox.smtp_host,
        port: loaded.mailbox.smtp_port,
        user: loaded.mailbox.address,
        pass: loaded.password,
      },
      {
        fromAddress: loaded.mailbox.address,
        fromName: loaded.mailbox.display_name,
        to,
        subject,
        text,
      }
    );

    const actorId = await ensureActorUserId();
    await prisma.emailOutboundLog.create({
      data: {
        company_id: loaded.auth.companyId,
        mailbox_id: loaded.mailbox.id,
        project_id: receipt.project_id,
        receipt_id: receipt.id,
        to_address: to,
        subject,
        status: "SENT",
        sent_by_id: actorId,
      },
    });

    if (receipt.project_id) {
      await prisma.timeline.create({
        data: {
          project_id: receipt.project_id,
          acao: `Recibo${numeroLabel ? ` ${numeroLabel}` : ""} enviado por e-mail para ${to}.`,
          interno_sotamente: false,
          user_id: actorId,
        },
      });
    }

    revalidatePath("/financeiro");
    if (receipt.project_id) revalidatePath(`/projects/${receipt.project_id}`);
    return { success: true as const, to };
  } catch (error) {
    console.error("sendReceiptByEmail:", error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Falha ao enviar recibo.",
    };
  }
}