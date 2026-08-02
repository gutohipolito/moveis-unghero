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
import { composeBodyWithSignature } from "@/lib/emailSignature";
import {
  buildQuoteEmailVars,
  buildReceiptEmailVars,
  composeDocumentEmail,
  loadCompanyDocumentTemplate,
} from "@/lib/emailDocumentTemplates";
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
  /** Corpo HTML do editor (opcional). */
  html?: string;
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
  const text = (input.text || "").trim();
  const html = (input.html || "").trim();
  if (!to || !to.includes("@")) {
    return { success: false as const, error: "Informe o destinatário." };
  }
  if (!subject) {
    return { success: false as const, error: "Informe o assunto." };
  }
  if (!text && !html) {
    return { success: false as const, error: "Informe a mensagem." };
  }

  const body = composeBodyWithSignature(
    { text: text || html.replace(/<[^>]+>/g, " "), html: html || null },
    loaded.mailbox.signature_text
  );

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
        text: body.text,
        html: body.html,
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

/** Preferência: caixa Documentos (noreply); senão fallback da área operacional. */
async function resolveDocumentOutboundMailbox(
  fallbackArea: EmailMailboxArea,
  moduleKey: "quotes" | "financeiro"
) {
  const docs = await resolveOutboundMailbox("DOCUMENTOS", moduleKey);
  if (docs) return docs;
  return resolveOutboundMailbox(fallbackArea, moduleKey);
}

async function resolveAtendimentoReplyTo(companyId: string): Promise<string | undefined> {
  const box = await prisma.emailMailbox.findFirst({
    where: { company_id: companyId, area: "ATENDIMENTO", ativo: true },
    orderBy: { updatedAt: "desc" },
    select: { address: true },
  });
  return box?.address || undefined;
}

async function prepareQuoteEmailContent(quoteId: string, companyId: string) {
  const quote = await prisma.quote.findFirst({
    where: {
      id: quoteId,
      project: { client: { company_id: companyId } },
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
  if (!quote) return null;

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
  const clientName = quote.project.client.nome;
  const firstName = getFirstName(clientName);
  const validade = formatDateBR(quote.validade);
  const hasPin = Boolean(getPhoneLastFourDigits(quote.project.client.telefone || ""));
  const template = await loadCompanyDocumentTemplate(companyId, "QUOTE");
  const vars = buildQuoteEmailVars({
    clientName,
    firstName,
    link: url,
    validade,
    hasPin,
  });

  return { quote, template, vars, defaultTo: quote.project.client.email };
}

export async function previewQuoteByEmail(quoteId: string) {
  const authQuotes = await getWriteAccess("quotes");
  if (!authQuotes || isReadOnlyRole(authQuotes.cargo)) {
    return { success: false as const, error: "Sem permissão para enviar orçamento." };
  }

  const prepared = await prepareQuoteEmailContent(quoteId, authQuotes.companyId);
  if (!prepared) {
    return { success: false as const, error: "Orçamento não encontrado." };
  }

  const loaded = await resolveDocumentOutboundMailbox("COMERCIAL", "quotes");
  const composed = composeDocumentEmail({
    subjectTemplate: prepared.template.subject,
    bodyTemplate: prepared.template.body,
    vars: prepared.vars,
    signature: loaded?.mailbox.signature_text,
  });

  return {
    success: true as const,
    to: (prepared.defaultTo || "").trim().toLowerCase(),
    subject: composed.subject,
    html: composed.html,
    text: composed.text,
    from: loaded?.mailbox.address || null,
  };
}

export async function sendQuoteByEmail(input: {
  quoteId: string;
  to?: string;
}) {
  const authQuotes = await getWriteAccess("quotes");
  if (!authQuotes || isReadOnlyRole(authQuotes.cargo)) {
    return { success: false as const, error: "Sem permissão para enviar orçamento." };
  }

  const prepared = await prepareQuoteEmailContent(
    input.quoteId,
    authQuotes.companyId
  );
  if (!prepared) {
    return { success: false as const, error: "Orçamento não encontrado." };
  }

  const to = (input.to || prepared.defaultTo || "").trim().toLowerCase();
  if (!to || !to.includes("@")) {
    return {
      success: false as const,
      error: "Cliente sem e-mail cadastrado. Informe o destinatário.",
    };
  }

  const loaded = await resolveDocumentOutboundMailbox("COMERCIAL", "quotes");
  if (!loaded) {
    return {
      success: false as const,
      error:
        "Configure uma caixa Documentos (noreply) ou Comercial ativa em E-mails → Configurar caixas.",
    };
  }

  const replyTo = await resolveAtendimentoReplyTo(loaded.auth.companyId);
  const composed = composeDocumentEmail({
    subjectTemplate: prepared.template.subject,
    bodyTemplate: prepared.template.body,
    vars: prepared.vars,
    signature: loaded.mailbox.signature_text,
  });
  const { subject } = composed;

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
        text: composed.text,
        html: composed.html,
        replyTo,
      }
    );

    const actorId = await ensureActorUserId();
    await prisma.emailOutboundLog.create({
      data: {
        company_id: loaded.auth.companyId,
        mailbox_id: loaded.mailbox.id,
        project_id: prepared.quote.project_id,
        quote_id: prepared.quote.id,
        to_address: to,
        subject,
        status: "SENT",
        sent_by_id: actorId,
      },
    });

    await prisma.timeline.create({
      data: {
        project_id: prepared.quote.project_id,
        acao: `Orçamento v${prepared.quote.versao} enviado por e-mail para ${to}.`,
        interno_sotamente: false,
        user_id: actorId,
      },
    });

    revalidatePath(`/projects/${prepared.quote.project_id}`);
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
          project_id: prepared.quote.project_id,
          quote_id: prepared.quote.id,
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

async function resolveReceiptOutboundMailbox(companyId: string) {
  const loaded =
    (await resolveDocumentOutboundMailbox("FINANCEIRO", "financeiro")) ||
    (await resolveOutboundMailbox("DOCUMENTOS", "emails")) ||
    (await resolveOutboundMailbox("FINANCEIRO", "emails"));
  if (loaded) return loaded;

  const mailbox =
    (await prisma.emailMailbox.findFirst({
      where: { company_id: companyId, area: "DOCUMENTOS", ativo: true },
      orderBy: { updatedAt: "desc" },
    })) ||
    (await prisma.emailMailbox.findFirst({
      where: { company_id: companyId, area: "FINANCEIRO", ativo: true },
      orderBy: { updatedAt: "desc" },
    }));
  if (!mailbox) return null;

  let password: string;
  try {
    password = decryptVaultSecret(mailbox.password_enc);
  } catch {
    return null;
  }
  return { auth: { companyId }, mailbox, password };
}

async function prepareReceiptEmailContent(
  receiptId: string,
  companyId: string
) {
  const receipt = await prisma.paymentReceipt.findFirst({
    where: { id: receiptId, company_id: companyId },
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
  if (!receipt) return null;

  const {
    ensureReceiptShareCode,
    buildReceiptShortUrl,
  } = await import("@/lib/receiptShare");
  const { formatCurrencyBRL } = await import("@/lib/currencyExtenso");
  const { getFirstName } = await import("@/lib/google-review");
  const { getPhoneLastFourDigits } = await import("@/lib/phone");

  let shareCode = receipt.share_code;
  if (!shareCode) {
    shareCode = await ensureReceiptShareCode(receipt.id);
  }

  const url = buildReceiptShortUrl(shareCode!);
  const clientName =
    receipt.cliente_nome || receipt.client?.nome || "cliente";
  const firstName = getFirstName(clientName);
  const valorLabel = formatCurrencyBRL(Number(receipt.valor));
  const numeroLabel = receipt.numero ? `nº ${receipt.numero}` : null;
  const hasPin = Boolean(
    getPhoneLastFourDigits(receipt.client?.telefone || "")
  );
  const template = await loadCompanyDocumentTemplate(companyId, "RECEIPT");
  const vars = buildReceiptEmailVars({
    clientName,
    firstName,
    link: url,
    valorLabel,
    numeroLabel,
    hasPin,
  });

  return {
    receipt,
    template,
    vars,
    numeroLabel,
    defaultTo: receipt.client?.email || null,
  };
}

export async function previewReceiptByEmail(receiptId: string) {
  const authFin =
    (await getWriteAccess("financeiro")) || (await getWriteAccess("crm"));
  if (!authFin || isReadOnlyRole(authFin.cargo)) {
    return { success: false as const, error: "Sem permissão para enviar recibo." };
  }

  const prepared = await prepareReceiptEmailContent(
    receiptId,
    authFin.companyId
  );
  if (!prepared) {
    return { success: false as const, error: "Recibo não encontrado." };
  }

  const loaded = await resolveReceiptOutboundMailbox(authFin.companyId);
  const composed = composeDocumentEmail({
    subjectTemplate: prepared.template.subject,
    bodyTemplate: prepared.template.body,
    vars: prepared.vars,
    signature: loaded?.mailbox.signature_text,
  });

  return {
    success: true as const,
    to: (prepared.defaultTo || "").trim().toLowerCase(),
    subject: composed.subject,
    html: composed.html,
    text: composed.text,
    from: loaded?.mailbox.address || null,
  };
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

  const prepared = await prepareReceiptEmailContent(
    input.receiptId,
    authFin.companyId
  );
  if (!prepared) {
    return { success: false as const, error: "Recibo não encontrado." };
  }

  const to = (input.to || prepared.defaultTo || "").trim().toLowerCase();
  if (!to || !to.includes("@")) {
    return {
      success: false as const,
      error: "Cliente sem e-mail cadastrado. Informe o destinatário.",
    };
  }

  const loaded = await resolveReceiptOutboundMailbox(authFin.companyId);
  if (!loaded) {
    return {
      success: false as const,
      error:
        "Configure uma caixa Documentos (noreply) ou Financeiro ativa em E-mails → Configurar caixas.",
    };
  }

  const replyTo = await resolveAtendimentoReplyTo(loaded.auth.companyId);
  const composed = composeDocumentEmail({
    subjectTemplate: prepared.template.subject,
    bodyTemplate: prepared.template.body,
    vars: prepared.vars,
    signature: loaded.mailbox.signature_text,
  });
  const { subject } = composed;
  const { receipt, numeroLabel } = prepared;

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
        text: composed.text,
        html: composed.html,
        replyTo,
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