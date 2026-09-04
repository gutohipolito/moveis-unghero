"use server";

import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureActorUserId } from "@/lib/currentUser";
import { getWriteAccess } from "@/lib/moduleAccess";
import { isReadOnlyRole } from "@/lib/permissions";
import { decryptVaultSecret } from "@/lib/accessVaultCrypto";
import { EMAIL_INBOX_PAGE_SIZE, EMAIL_MAX_ATTACHMENT_BYTES, isMailFolderKey, type MailFolderKey, type EmailListItem } from "@/lib/emailAreas";
import {
  fetchFolderMessage,
  getInboxUnreadCount,
  listFolderMessages,
  moveFolderMessage,
  moveFolderMessages,
  resolveMailFolderPath,
  setFolderMessageSeen,
  type MoveDestination,
} from "@/lib/emailImap";
import { sendSmtpEmail } from "@/lib/emailSmtp";
import { composeBodyWithSignature } from "@/lib/emailSignature";
import {
  buildQuoteEmailVars,
  buildReceiptEmailVars,
  composeDocumentEmail,
  loadCompanyDocumentTemplate,
} from "@/lib/emailDocumentTemplates";
import { listEmailMailboxesForUser, loadAccessibleMailboxSecrets } from "@/app/actions/emailMailboxes";
import type { EmailMailboxArea } from "@prisma/client";
import { revalidatePath } from "next/cache";

function imapConfigFromLoaded(loaded: NonNullable<Awaited<ReturnType<typeof loadAccessibleMailboxSecrets>>>) {
  return {
    host: loaded.mailbox.imap_host,
    port: loaded.mailbox.imap_port,
    user: loaded.mailbox.address,
    pass: loaded.password,
  };
}

export async function listMailboxFolder(mailboxId: string, folder: MailFolderKey) {
  await connection();
  const loaded = await loadAccessibleMailboxSecrets(mailboxId);
  if (!loaded) {
    return {
      success: false as const,
      error: "Caixa indisponível.",
      data: [] as EmailListItem[],
      folderPath: null as string | null,
      inboxUnseen: 0,
    };
  }

  try {
    const result = await listFolderMessages(imapConfigFromLoaded(loaded), folder, {
      limit: EMAIL_INBOX_PAGE_SIZE,
    });
    return {
      success: true as const,
      data: result.items,
      folderPath: result.folderPath,
      inboxUnseen: result.inboxUnseen,
    };
  } catch (error) {
    console.error("listMailboxFolder:", error);
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível listar a pasta.",
      data: [] as EmailListItem[],
      folderPath: null as string | null,
      inboxUnseen: 0,
    };
  }
}

export async function listMailboxUnreadCounts() {
  await connection();
  const listed = await listEmailMailboxesForUser();
  if (!listed.success) {
    return { success: false as const, counts: {} as Record<string, number> };
  }

  const counts: Record<string, number> = {};
  await Promise.all(
    listed.data.map(async (box) => {
      const loaded = await loadAccessibleMailboxSecrets(box.id);
      if (!loaded) {
        counts[box.id] = 0;
        return;
      }
      try {
        counts[box.id] = await getInboxUnreadCount(imapConfigFromLoaded(loaded));
      } catch (error) {
        console.error("listMailboxUnreadCounts:", box.address, error);
        counts[box.id] = 0;
      }
    })
  );

  return { success: true as const, counts };
}

export async function getMailboxMessage(
  mailboxId: string,
  uid: number,
  folder: MailFolderKey = "inbox"
) {
  const loaded = await loadAccessibleMailboxSecrets(mailboxId);
  if (!loaded) {
    return { success: false as const, error: "Caixa indisponível." };
  }
  if (!isMailFolderKey(folder)) {
    return { success: false as const, error: "Pasta inválida." };
  }

  try {
    const config = imapConfigFromLoaded(loaded);
    const folderPath = await resolveMailFolderPath(config, folder);
    const data = await fetchFolderMessage(config, folderPath, uid);
    if (!data) {
      return { success: false as const, error: "Mensagem não encontrada." };
    }
    return { success: true as const, data, folderPath };
  } catch (error) {
    console.error("getMailboxMessage:", error);
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Não foi possível abrir a mensagem.",
    };
  }
}

export async function markMailboxMessageSeen(
  mailboxId: string,
  uid: number,
  seen: boolean,
  folder: MailFolderKey = "inbox"
) {
  const loaded = await loadAccessibleMailboxSecrets(mailboxId);
  if (!loaded || isReadOnlyRole(loaded.auth.cargo)) {
    return { success: false as const, error: "Sem permissão para alterar a mensagem." };
  }
  try {
    const config = imapConfigFromLoaded(loaded);
    const folderPath = await resolveMailFolderPath(config, folder);
    await setFolderMessageSeen(config, folderPath, uid, seen);
    return { success: true as const };
  } catch (error) {
    console.error("markMailboxMessageSeen:", error);
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o status da mensagem.",
    };
  }
}

async function moveFromFolder(
  mailboxId: string,
  uid: number,
  fromFolder: MailFolderKey,
  destination: MoveDestination,
  deniedMessage: string
) {
  const loaded = await loadAccessibleMailboxSecrets(mailboxId);
  if (!loaded || isReadOnlyRole(loaded.auth.cargo)) {
    return { success: false as const, error: deniedMessage };
  }
  try {
    const config = imapConfigFromLoaded(loaded);
    const fromPath = await resolveMailFolderPath(config, fromFolder);
    const result = await moveFolderMessage(config, fromPath, uid, destination);
    return { success: true as const, ...result };
  } catch (error) {
    console.error("moveFromFolder:", error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Não foi possível mover a mensagem.",
    };
  }
}

export async function moveMailboxMessageToTrash(
  mailboxId: string,
  uid: number,
  fromFolder: MailFolderKey = "inbox"
) {
  return moveFromFolder(mailboxId, uid, fromFolder, "trash", "Sem permissão para excluir.");
}

const BULK_DELETE_MAX = 40;

export async function moveMailboxMessagesToTrash(
  mailboxId: string,
  uids: number[],
  fromFolder: MailFolderKey = "inbox"
) {
  const loaded = await loadAccessibleMailboxSecrets(mailboxId);
  if (!loaded || isReadOnlyRole(loaded.auth.cargo)) {
    return { success: false as const, error: "Sem permissão para excluir." };
  }
  if (!isMailFolderKey(fromFolder)) {
    return { success: false as const, error: "Pasta inválida." };
  }

  const unique = [...new Set(uids.filter((uid) => Number.isInteger(uid) && uid > 0))].slice(
    0,
    BULK_DELETE_MAX
  );
  if (unique.length === 0) {
    return { success: false as const, error: "Nenhuma mensagem selecionada." };
  }

  try {
    const config = imapConfigFromLoaded(loaded);
    const fromPath = await resolveMailFolderPath(config, fromFolder);
    const result = await moveFolderMessages(config, fromPath, unique, "trash");
    return { success: true as const, ...result };
  } catch (error) {
    console.error("moveMailboxMessagesToTrash:", error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Não foi possível excluir as mensagens.",
    };
  }
}

export async function moveMailboxMessageToSpam(
  mailboxId: string,
  uid: number,
  fromFolder: MailFolderKey = "inbox"
) {
  return moveFromFolder(
    mailboxId,
    uid,
    fromFolder,
    "junk",
    "Sem permissão para marcar como spam."
  );
}

export async function moveMailboxMessageToInbox(
  mailboxId: string,
  uid: number,
  fromFolder: MailFolderKey
) {
  return moveFromFolder(
    mailboxId,
    uid,
    fromFolder,
    "inbox",
    "Sem permissão para mover a mensagem."
  );
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

async function preparePartnerCommissionEmailContent(
  receiptId: string,
  companyId: string
) {
  const receipt = await prisma.partnerCommissionReceipt.findFirst({
    where: { id: receiptId, company_id: companyId },
    include: {
      commission: { select: { project_id: true, partner_id: true } },
    },
  });
  if (!receipt) return null;

  const { formatCurrencyBRL } = await import("@/lib/currencyExtenso");
  const { getFirstName } = await import("@/lib/google-review");
  const { formatContractDateLong } = await import("@/lib/contractTemplates");

  const firstName = getFirstName(receipt.parceiro_nome);
  const valorLabel = formatCurrencyBRL(Number(receipt.valor_comissao));
  const numeroLabel = String(receipt.numero).padStart(4, "0");
  const nfNumero = receipt.nota_fiscal_numero || "—";
  const nfData = receipt.nota_fiscal_emitida_em
    ? formatContractDateLong(receipt.nota_fiscal_emitida_em)
    : "—";
  const orcamento =
    receipt.orcamento_codigo ||
    (receipt.orcamento_versao != null ? `v${receipt.orcamento_versao}` : "—");

  const subject = `Comprovante de comissão Nº ${numeroLabel} — ${valorLabel}`;
  const body = [
    `Olá ${firstName}, tudo bem?`,
    "",
    `Segue o comprovante de pagamento da sua comissão Nº ${numeroLabel} emitido pela Móveis Unghero.`,
    "",
    `Valor: ${valorLabel}`,
    `Percentual: ${Number(receipt.percentual)}% sobre a base aprovada do projeto.`,
    `Projeto / cliente de referência: ${receipt.cliente_nome}`,
    `Orçamento: ${orcamento}`,
    `Nota fiscal: ${nfNumero} (emitida em ${nfData})`,
    "",
    "Este e-mail confirma o pagamento da comissão conforme a nota fiscal referida.",
    "Guarde este comprovante para seus registros.",
    "",
    "Qualquer dúvida, estamos à disposição.",
    "Financeiro — Móveis Unghero",
  ].join("\n");

  return {
    receipt,
    subject,
    body,
    defaultTo: receipt.parceiro_email || null,
    partnerId: receipt.commission.partner_id,
    projectId: receipt.commission.project_id,
  };
}

export async function previewPartnerCommissionReceiptByEmail(receiptId: string) {
  const auth =
    (await getWriteAccess("parceiros")) || (await getWriteAccess("financeiro"));
  if (!auth || isReadOnlyRole(auth.cargo)) {
    return { success: false as const, error: "Sem permissão para enviar comprovante." };
  }

  const prepared = await preparePartnerCommissionEmailContent(
    receiptId,
    auth.companyId
  );
  if (!prepared) {
    return { success: false as const, error: "Comprovante não encontrado." };
  }

  const loaded = await resolveReceiptOutboundMailbox(auth.companyId);
  const composed = composeDocumentEmail({
    subjectTemplate: prepared.subject,
    bodyTemplate: prepared.body,
    vars: {
      cliente_nome: prepared.receipt.parceiro_nome,
      cliente_primeiro_nome: "",
      link: "",
    },
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

export async function sendPartnerCommissionReceiptByEmail(input: {
  receiptId: string;
  to?: string;
}) {
  const auth =
    (await getWriteAccess("parceiros")) || (await getWriteAccess("financeiro"));
  if (!auth || isReadOnlyRole(auth.cargo)) {
    return { success: false as const, error: "Sem permissão para enviar comprovante." };
  }

  const prepared = await preparePartnerCommissionEmailContent(
    input.receiptId,
    auth.companyId
  );
  if (!prepared) {
    return { success: false as const, error: "Comprovante não encontrado." };
  }

  const to = (input.to || prepared.defaultTo || "").trim().toLowerCase();
  if (!to || !to.includes("@")) {
    return {
      success: false as const,
      error: "Parceiro sem e-mail cadastrado. Informe o destinatário.",
    };
  }

  const loaded = await resolveReceiptOutboundMailbox(auth.companyId);
  if (!loaded) {
    return {
      success: false as const,
      error:
        "Configure uma caixa Documentos (noreply) ou Financeiro ativa em E-mails → Configurar caixas.",
    };
  }

  const replyTo = await resolveAtendimentoReplyTo(loaded.auth.companyId);
  const composed = composeDocumentEmail({
    subjectTemplate: prepared.subject,
    bodyTemplate: prepared.body,
    vars: {
      cliente_nome: prepared.receipt.parceiro_nome,
      cliente_primeiro_nome: "",
      link: "",
    },
    signature: loaded.mailbox.signature_text,
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
        subject: composed.subject,
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
        project_id: prepared.projectId,
        to_address: to,
        subject: composed.subject,
        status: "SENT",
        sent_by_id: actorId,
      },
    });

    revalidatePath("/parceiros");
    revalidatePath(`/parceiros/${prepared.partnerId}`);
    return { success: true as const, to };
  } catch (error) {
    console.error("sendPartnerCommissionReceiptByEmail:", error);
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Falha ao enviar comprovante.",
    };
  }
}