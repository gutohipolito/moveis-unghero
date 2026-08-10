import { prisma } from "@/lib/prisma";
import { decryptVaultSecret } from "@/lib/accessVaultCrypto";
import { sendSmtpEmail } from "@/lib/emailSmtp";
import type { EmailMailboxArea } from "@prisma/client";
import {
  hasRealClientEmail,
  normalizeClientEmail,
} from "@/lib/clientMatch";
import { EMAIL_SIGNATURE_ASSET_BASE } from "@/lib/emailSignature";
import { PARTNER_LOGIN_OTP_TTL_MINUTES } from "@/lib/partnerLoginOtp";

const LOGO_SRC = `${EMAIL_SIGNATURE_ASSET_BASE}/logo.png`;

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

export async function sendPartnerLoginOtpEmail(options: {
  companyId: string;
  nome: string;
  email: string;
  code: string;
}): Promise<{ sent: boolean; error?: string }> {
  const to = normalizeClientEmail(options.email);
  if (!hasRealClientEmail(to)) {
    return { sent: false, error: "E-mail inválido." };
  }

  try {
    const mailbox = await resolveOutboundMailbox(options.companyId);
    if (!mailbox) {
      return { sent: false, error: "Envio de e-mail indisponível no momento." };
    }

    let password: string;
    try {
      password = decryptVaultSecret(mailbox.password_enc);
    } catch {
      return { sent: false, error: "Falha ao preparar o envio do código." };
    }

    const first = options.nome.trim().split(/\s+/)[0] || "olá";
    const subject = "Código de acesso ao portal — Móveis Unghero";
    const text = [
      `Olá, ${first}.`,
      "",
      `Seu código de acesso ao portal do parceiro é: ${options.code}`,
      `Ele vale por ${PARTNER_LOGIN_OTP_TTL_MINUTES} minutos.`,
      "",
      "Se você não solicitou este acesso, ignore este e-mail.",
      "",
      "Móveis Unghero",
    ].join("\n");

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f8fafc;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;background:#f8fafc;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
        <tr>
          <td style="padding:20px 24px;background:#0f172a;">
            <img src="${LOGO_SRC}" width="168" height="35" alt="Móveis Unghero" style="display:block;border:0;height:35px;width:auto;max-width:168px;" />
          </td>
        </tr>
        <tr>
          <td style="padding:28px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
            <p style="margin:0 0 12px;font-size:15px;color:#334155;">Olá, ${escapeHtml(first)}.</p>
            <p style="margin:0 0 20px;font-size:15px;color:#334155;">Use o código abaixo para entrar no portal do parceiro:</p>
            <p style="margin:0 0 8px;font-size:32px;letter-spacing:0.2em;font-weight:800;color:#0f172a;text-align:center;">${escapeHtml(options.code)}</p>
            <p style="margin:0 0 20px;font-size:12px;color:#64748b;text-align:center;">Válido por ${PARTNER_LOGIN_OTP_TTL_MINUTES} minutos</p>
            <p style="margin:0;font-size:12px;color:#94a3b8;">Se você não pediu este acesso, ignore este e-mail.</p>
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
        subject,
        text,
        html,
        replyTo: mailbox.address,
      }
    );
    return { sent: true };
  } catch (error) {
    console.error("[sendPartnerLoginOtpEmail]", error);
    return {
      sent: false,
      error: error instanceof Error ? error.message : "Falha ao enviar o código.",
    };
  }
}
