import { prisma } from "@/lib/prisma";
import { decryptVaultSecret } from "@/lib/accessVaultCrypto";
import { sendSmtpEmail } from "@/lib/emailSmtp";
import type { EmailMailboxArea } from "@prisma/client";
import {
  CLIENT_LGPD_FORM_PURPOSE,
  DOCUMENT_EMAIL_FOOTER_TEXT,
} from "@/lib/consentCopy";
import {
  hasRealClientEmail,
  normalizeClientEmail,
} from "@/lib/clientMatch";

export type SignupConfirmationKind =
  | "cliente"
  | "parceiro"
  | "fornecedor"
  | "briefing";

const PURPOSE_BY_KIND: Record<SignupConfirmationKind, string> = {
  cliente: CLIENT_LGPD_FORM_PURPOSE,
  parceiro: "avaliar a parceria profissional e manter contato comercial",
  fornecedor: "avaliar a parceria comercial e manter contato sobre fornecimento",
  briefing: CLIENT_LGPD_FORM_PURPOSE,
};

const SUBJECT_BY_KIND: Record<SignupConfirmationKind, string> = {
  cliente: "Recebemos seu cadastro — Móveis Unghero",
  parceiro: "Recebemos seu cadastro — Móveis Unghero",
  fornecedor: "Recebemos seu cadastro — Móveis Unghero",
  briefing: "Recebemos sua solicitação — Móveis Unghero",
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function firstName(fullName: string) {
  const part = fullName.trim().split(/\s+/)[0];
  return part || "olá";
}

export function buildSignupConfirmationEmail(options: {
  kind: SignupConfirmationKind;
  nome: string;
}) {
  const purpose = PURPOSE_BY_KIND[options.kind];
  const greetingName = firstName(options.nome);
  const isBriefing = options.kind === "briefing";

  const intro = isBriefing
    ? `Obrigado por nos enviar sua solicitação. Recebemos suas informações com sucesso.`
    : `Obrigado por se cadastrar conosco. Recebemos seus dados com sucesso.`;

  const followUp = isBriefing
    ? `Nossa equipe analisará o pedido e entrará em contato quando for o momento.`
    : `Nossa equipe poderá entrar em contato quando for necessário.`;

  const text = [
    `Olá, ${greetingName}.`,
    "",
    intro,
    followUp,
    "",
    "Lembrete sobre a proteção dos seus dados (LGPD):",
    `De acordo com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018), as informações enviadas serão tratadas com confidencialidade e utilizadas apenas para ${purpose}.`,
    "",
    "Se precisar falar conosco:",
    "WhatsApp (54) 9 9997-1050",
    "atendimento@moveisunghero.com.br",
    "",
    "Obrigado,",
    "Móveis Unghero",
    "",
    DOCUMENT_EMAIL_FOOTER_TEXT,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f8fafc;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;background:#f8fafc;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
        <tr>
          <td style="padding:18px 24px;background:#0f172a;">
            <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#fbbf24;font-weight:700;">Móveis Unghero</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px;">
            <p style="margin:0 0 14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:16px;line-height:1.5;color:#0f172a;">Olá, ${escapeHtml(greetingName)}.</p>
            <p style="margin:0 0 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#334155;">${escapeHtml(intro)}</p>
            <p style="margin:0 0 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#334155;">${escapeHtml(followUp)}</p>
            <p style="margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#64748b;">Proteção dos seus dados (LGPD)</p>
            <p style="margin:0 0 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.65;color:#475569;">De acordo com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018), as informações enviadas serão tratadas com confidencialidade e utilizadas apenas para ${escapeHtml(purpose)}.</p>
            <p style="margin:0 0 4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.6;color:#64748b;">Se precisar falar conosco:</p>
            <p style="margin:0 0 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.6;color:#334155;">WhatsApp (54) 9 9997-1050<br/>atendimento@moveisunghero.com.br</p>
            <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#0f172a;">Obrigado,<br/><strong>Móveis Unghero</strong></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return {
    subject: SUBJECT_BY_KIND[options.kind],
    text,
    html,
  };
}

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

/**
 * Envia confirmação de cadastro (obrigado + lembrete LGPD).
 * Não propaga erro — o cadastro já foi salvo.
 */
export async function sendSignupConfirmationEmail(options: {
  companyId: string;
  kind: SignupConfirmationKind;
  nome: string;
  email?: string | null;
}): Promise<{ sent: boolean; error?: string }> {
  const to = normalizeClientEmail(options.email);
  if (!hasRealClientEmail(to)) {
    return { sent: false, error: "E-mail inválido ou ausente." };
  }

  try {
    const mailbox = await resolveOutboundMailbox(options.companyId);
    if (!mailbox) {
      console.warn(
        "[signupConfirmationEmail] Nenhuma caixa SMTP ativa para envio de confirmação."
      );
      return { sent: false, error: "Nenhuma caixa SMTP ativa." };
    }

    let password: string;
    try {
      password = decryptVaultSecret(mailbox.password_enc);
    } catch (error) {
      console.error("[signupConfirmationEmail] Falha ao descriptografar SMTP:", error);
      return { sent: false, error: "Falha ao ler senha SMTP." };
    }

    const content = buildSignupConfirmationEmail({
      kind: options.kind,
      nome: options.nome,
    });

    const replyToBox = await prisma.emailMailbox.findFirst({
      where: { company_id: options.companyId, area: "ATENDIMENTO", ativo: true },
      orderBy: { updatedAt: "desc" },
      select: { address: true },
    });

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
        subject: content.subject,
        text: content.text,
        html: content.html,
        replyTo: replyToBox?.address || mailbox.address,
      }
    );
    return { sent: true };
  } catch (error) {
    console.error("[signupConfirmationEmail] Falha ao enviar confirmação:", error);
    return {
      sent: false,
      error: error instanceof Error ? error.message : "Falha no envio SMTP.",
    };
  }
}
