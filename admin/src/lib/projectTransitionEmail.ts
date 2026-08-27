import { prisma } from "@/lib/prisma";
import { decryptVaultSecret } from "@/lib/accessVaultCrypto";
import { sendSmtpEmail } from "@/lib/emailSmtp";
import type { EmailMailboxArea } from "@prisma/client";
import {
  hasRealClientEmail,
  normalizeClientEmail,
} from "@/lib/clientMatch";
import { composeBrandedEmail, renderEmailPlaceholders } from "@/lib/emailBrandedCard";
import {
  TRANSITION_STATUSES,
  getTransitionTemplateDef,
  isTransitionEmailCurrentlyAllowed,
  isTransitionTemplateKey,
  type TransitionStatus,
  type TransitionTemplateKey,
} from "@/lib/emailTransitionTemplates";
import { labelProjectStatus } from "@/lib/navLabels";
import { getPartnerPublicBaseUrl } from "@/lib/partnerInvite";

const STATUS_SET = new Set<string>(TRANSITION_STATUSES);

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || "olá";
}

export async function resolveTransactionalMailbox(companyId: string) {
  const areas: EmailMailboxArea[] = ["DOCUMENTOS", "ATENDIMENTO", "COMERCIAL"];
  for (const area of areas) {
    const box = await prisma.emailMailbox.findFirst({
      where: { company_id: companyId, area, ativo: true },
      orderBy: { updatedAt: "desc" },
    });
    if (box?.smtp_host && box.address && box.password_enc) {
      return box;
    }
  }
  return null;
}

export async function loadTransitionTemplate(
  companyId: string,
  key: TransitionTemplateKey
): Promise<{ subject: string; body: string; enabled: boolean; ctaLabel: string }> {
  const def = getTransitionTemplateDef(key);
  const row = await prisma.emailTransitionTemplate.findUnique({
    where: { company_id_key: { company_id: companyId, key } },
    select: { subject: true, body: true, enabled: true },
  });
  return {
    subject: row?.subject || def.subject,
    body: row?.body || def.body,
    // Kill-switch temporário: ignora enabled do banco se o template não estiver na allowlist.
    enabled: isTransitionEmailCurrentlyAllowed(key)
      ? (row?.enabled ?? def.defaultEnabled)
      : false,
    ctaLabel: def.ctaLabel,
  };
}

async function sendRenderedTransitionEmail(options: {
  companyId: string;
  to: string;
  key: TransitionTemplateKey;
  vars: Record<string, string>;
  ctaHref: string;
}): Promise<{ sent: boolean; error?: string }> {
  const to = normalizeClientEmail(options.to);
  if (!hasRealClientEmail(to)) {
    return { sent: false, error: "E-mail inválido." };
  }

  const template = await loadTransitionTemplate(options.companyId, options.key);
  if (!template.enabled) {
    return { sent: false, error: "Template desativado." };
  }

  const mailbox = await resolveTransactionalMailbox(options.companyId);
  if (!mailbox) {
    return { sent: false, error: "Envio de e-mail indisponível." };
  }

  let password: string;
  try {
    password = decryptVaultSecret(mailbox.password_enc);
  } catch {
    return { sent: false, error: "Falha ao preparar o envio." };
  }

  const subject = renderEmailPlaceholders(template.subject, options.vars);
  const bodyText = renderEmailPlaceholders(template.body, options.vars);
  const composed = composeBrandedEmail({
    subject,
    bodyText,
    ctaLabel: template.ctaLabel,
    ctaHref: options.ctaHref,
  });

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
        fromName: mailbox.display_name || "Móveis Unghero",
        to,
        subject: composed.subject,
        text: composed.text,
        html: composed.html,
        replyTo: mailbox.address,
      }
    );
    return { sent: true };
  } catch (error) {
    console.error("[projectTransitionEmail]", error);
    return {
      sent: false,
      error: error instanceof Error ? error.message : "Falha no envio.",
    };
  }
}

export function isTransitionAlertStatus(status: string): status is TransitionStatus {
  return STATUS_SET.has(status);
}

/**
 * Dispara e-mails de transição (cliente e arquiteto) na mudança de etapa.
 * Fire-and-forget — não bloqueia o CRM.
 */
export function scheduleProjectTransitionEmails(options: {
  projectId: string;
  oldStatus: string;
  newStatus: string;
}) {
  if (options.oldStatus === options.newStatus) return;
  if (!isTransitionAlertStatus(options.newStatus)) return;

  void notifyProjectTransitionEmails(options).catch((error) => {
    console.error("[scheduleProjectTransitionEmails]", error);
  });
}

/** Alias usado pelos fluxos existentes do CRM. */
export function schedulePartnerProjectStatusAlert(options: {
  projectId: string;
  oldStatus: string;
  newStatus: string;
}) {
  scheduleProjectTransitionEmails(options);
}

export async function notifyProjectTransitionEmails(options: {
  projectId: string;
  oldStatus: string;
  newStatus: string;
}): Promise<{ client: boolean; partner: boolean }> {
  const result = { client: false, partner: false };
  if (options.oldStatus === options.newStatus) return result;
  if (!isTransitionAlertStatus(options.newStatus)) return result;

  const project = await prisma.project.findFirst({
    where: { id: options.projectId },
    select: {
      id: true,
      partner_id: true,
      client: {
        select: {
          nome: true,
          email: true,
          company_id: true,
          partner_id: true,
        },
      },
    },
  });
  if (!project) return result;

  const companyId = project.client.company_id;
  const etapaNova = labelProjectStatus(options.newStatus);
  const etapaAnterior = labelProjectStatus(options.oldStatus);
  const baseUrl = getPartnerPublicBaseUrl();

  const clientKey: TransitionTemplateKey = `CLIENT:${options.newStatus}`;
  if (isTransitionTemplateKey(clientKey) && hasRealClientEmail(project.client.email)) {
    const sent = await sendRenderedTransitionEmail({
      companyId,
      to: project.client.email || "",
      key: clientKey,
      ctaHref: `${baseUrl}/cliente/login`,
      vars: {
        destinatario_nome: project.client.nome,
        destinatario_primeiro_nome: firstName(project.client.nome),
        cliente_nome: project.client.nome,
        etapa_nova: etapaNova,
        etapa_anterior: etapaAnterior,
        link: `${baseUrl}/cliente/login`,
      },
    });
    result.client = sent.sent;
  }

  const partnerId = project.partner_id || project.client.partner_id;
  if (partnerId) {
    const partner = await prisma.professionalPartner.findFirst({
      where: { id: partnerId, ativo: true },
      select: { nome: true, email: true, company_id: true },
    });
    const partnerKey: TransitionTemplateKey = `PARTNER:${options.newStatus}`;
    if (partner?.email && isTransitionTemplateKey(partnerKey)) {
      const portalHref = `${baseUrl}/parceiro/projetos/${project.id}`;
      const sent = await sendRenderedTransitionEmail({
        companyId: partner.company_id || companyId,
        to: partner.email,
        key: partnerKey,
        ctaHref: portalHref,
        vars: {
          destinatario_nome: partner.nome,
          destinatario_primeiro_nome: firstName(partner.nome),
          cliente_nome: project.client.nome,
          etapa_nova: etapaNova,
          etapa_anterior: etapaAnterior,
          link: portalHref,
        },
      });
      result.partner = sent.sent;
    }
  }

  return result;
}

export function schedulePartnerCommissionPaidAlert(options: {
  companyId: string;
  commissionId: string;
}) {
  void notifyPartnerCommissionPaid(options).catch((error) => {
    console.error("[schedulePartnerCommissionPaidAlert]", error);
  });
}

export async function notifyPartnerCommissionPaid(options: {
  companyId: string;
  commissionId: string;
}): Promise<{ sent: boolean; error?: string }> {
  const commission = await prisma.partnerCommission.findFirst({
    where: {
      id: options.commissionId,
      company_id: options.companyId,
      status: "PAGA",
    },
    select: {
      valor_comissao: true,
      partner: {
        select: { nome: true, email: true, ativo: true, company_id: true },
      },
      project: {
        select: { client: { select: { nome: true } } },
      },
    },
  });

  if (!commission?.partner.ativo || !commission.partner.email) {
    return { sent: false, error: "Parceiro sem e-mail ou inativo." };
  }

  const valor = Number(commission.valor_comissao).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  const portalHref = `${getPartnerPublicBaseUrl()}/parceiro/comissoes`;

  return sendRenderedTransitionEmail({
    companyId: commission.partner.company_id || options.companyId,
    to: commission.partner.email,
    key: "PARTNER:COMMISSION",
    ctaHref: portalHref,
    vars: {
      destinatario_nome: commission.partner.nome,
      destinatario_primeiro_nome: firstName(commission.partner.nome),
      cliente_nome: commission.project.client.nome,
      valor,
      link: portalHref,
    },
  });
}
