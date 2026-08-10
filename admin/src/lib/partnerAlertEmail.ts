import { prisma } from "@/lib/prisma";
import { decryptVaultSecret } from "@/lib/accessVaultCrypto";
import { sendSmtpEmail } from "@/lib/emailSmtp";
import type { EmailMailboxArea } from "@prisma/client";
import {
  hasRealClientEmail,
  normalizeClientEmail,
} from "@/lib/clientMatch";
import { EMAIL_SIGNATURE_ASSET_BASE } from "@/lib/emailSignature";
import { labelProjectStatus } from "@/lib/navLabels";
import { getPartnerPublicBaseUrl } from "@/lib/partnerInvite";

const LOGO_SRC = `${EMAIL_SIGNATURE_ASSET_BASE}/logo.png`;

/** Etapas relevantes para o parceiro — evita spam em LEAD/ORCAMENTO. */
const PARTNER_ALERT_STATUSES = new Set([
  "APROVADO",
  "CONFERENCIA_TECNICA",
  "PRODUCAO",
  "INSTALACAO",
  "FINALIZADO",
  "PERDIDO",
]);

async function resolveOutboundMailbox(companyId: string) {
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || "olá";
}

async function sendPartnerAlertEmail(options: {
  companyId: string;
  to: string;
  partnerNome: string;
  subject: string;
  intro: string;
  detailLines: string[];
  ctaLabel: string;
  ctaHref: string;
}): Promise<{ sent: boolean; error?: string }> {
  const to = normalizeClientEmail(options.to);
  if (!hasRealClientEmail(to)) {
    return { sent: false, error: "E-mail inválido." };
  }

  try {
    const mailbox = await resolveOutboundMailbox(options.companyId);
    if (!mailbox) {
      return { sent: false, error: "Envio de e-mail indisponível." };
    }

    let password: string;
    try {
      password = decryptVaultSecret(mailbox.password_enc);
    } catch {
      return { sent: false, error: "Falha ao preparar o envio." };
    }

    const greeting = firstName(options.partnerNome);
    const text = [
      `Olá, ${greeting}.`,
      "",
      options.intro,
      "",
      ...options.detailLines,
      "",
      `${options.ctaLabel}: ${options.ctaHref}`,
      "",
      "Móveis Unghero",
    ].join("\n");

    const detailsHtml = options.detailLines
      .map(
        (line) =>
          `<p style="margin:0 0 6px;font-size:14px;color:#475569;">${escapeHtml(line)}</p>`
      )
      .join("");

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f8fafc;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;background:#f8fafc;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
        <tr>
          <td style="padding:20px 24px;background:#0f172a;">
            <img src="${LOGO_SRC}" width="168" height="35" alt="Móveis Unghero" style="display:block;border:0;height:35px;width:auto;max-width:168px;" />
          </td>
        </tr>
        <tr>
          <td style="padding:28px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
            <p style="margin:0 0 12px;font-size:15px;color:#334155;">Olá, ${escapeHtml(greeting)}.</p>
            <p style="margin:0 0 16px;font-size:15px;color:#334155;">${escapeHtml(options.intro)}</p>
            ${detailsHtml}
            <p style="margin:20px 0 0;">
              <a href="${escapeHtml(options.ctaHref)}" style="display:inline-block;padding:10px 16px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:10px;font-size:13px;font-weight:700;">
                ${escapeHtml(options.ctaLabel)}
              </a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

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
        subject: options.subject,
        text,
        html,
        replyTo: mailbox.address,
      }
    );
    return { sent: true };
  } catch (error) {
    console.error("[partnerAlertEmail]", error);
    return {
      sent: false,
      error: error instanceof Error ? error.message : "Falha no envio.",
    };
  }
}

async function resolveProjectPartner(projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId },
    select: {
      id: true,
      status_geral: true,
      partner_id: true,
      client: {
        select: {
          nome: true,
          company_id: true,
          partner_id: true,
        },
      },
    },
  });
  if (!project) return null;

  const partnerId = project.partner_id || project.client.partner_id;
  if (!partnerId) return null;

  const partner = await prisma.professionalPartner.findFirst({
    where: { id: partnerId, ativo: true },
    select: { id: true, nome: true, email: true, company_id: true },
  });
  if (!partner?.email) return null;

  return {
    companyId: partner.company_id || project.client.company_id,
    partnerNome: partner.nome,
    partnerEmail: partner.email,
    clientNome: project.client.nome,
    projectId: project.id,
  };
}

/**
 * Dispara e-mail ao parceiro quando o projeto entra em etapa relevante.
 * Fire-and-forget — não bloqueia o CRM.
 */
export function schedulePartnerProjectStatusAlert(options: {
  projectId: string;
  oldStatus: string;
  newStatus: string;
}) {
  if (options.oldStatus === options.newStatus) return;
  if (!PARTNER_ALERT_STATUSES.has(options.newStatus)) return;

  void notifyPartnerProjectStatusChange(options).catch((error) => {
    console.error("[schedulePartnerProjectStatusAlert]", error);
  });
}

export async function notifyPartnerProjectStatusChange(options: {
  projectId: string;
  oldStatus: string;
  newStatus: string;
}): Promise<{ sent: boolean; error?: string }> {
  if (options.oldStatus === options.newStatus) {
    return { sent: false, error: "Sem mudança de status." };
  }
  if (!PARTNER_ALERT_STATUSES.has(options.newStatus)) {
    return { sent: false, error: "Status fora da lista de alertas." };
  }

  const resolved = await resolveProjectPartner(options.projectId);
  if (!resolved) {
    return { sent: false, error: "Parceiro sem e-mail ou inativo." };
  }

  const statusLabel = labelProjectStatus(options.newStatus);
  const portalHref = `${getPartnerPublicBaseUrl()}/parceiro/projetos/${resolved.projectId}`;

  return sendPartnerAlertEmail({
    companyId: resolved.companyId,
    to: resolved.partnerEmail,
    partnerNome: resolved.partnerNome,
    subject: `Projeto atualizado: ${resolved.clientNome} — ${statusLabel}`,
    intro: `O projeto de ${resolved.clientNome} avançou no acompanhamento da Móveis Unghero.`,
    detailLines: [
      `Nova etapa: ${statusLabel}`,
      `Etapa anterior: ${labelProjectStatus(options.oldStatus)}`,
    ],
    ctaLabel: "Ver no portal",
    ctaHref: portalHref,
  });
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
      id: true,
      valor_comissao: true,
      partner: {
        select: { id: true, nome: true, email: true, ativo: true },
      },
      project: {
        select: { id: true, client: { select: { nome: true } } },
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

  return sendPartnerAlertEmail({
    companyId: options.companyId,
    to: commission.partner.email,
    partnerNome: commission.partner.nome,
    subject: `Comissão paga — ${commission.project.client.nome}`,
    intro: `Registramos o pagamento da sua comissão referente a ${commission.project.client.nome}.`,
    detailLines: [`Valor: ${valor}`, "Acompanhe o detalhe e o comprovante (quando emitido) no portal."],
    ctaLabel: "Ver comissões",
    ctaHref: portalHref,
  });
}
