import { getFirstName, getGoogleReviewShortUrl } from "@/lib/google-review";

/** Assunto chamativo para pedido de avaliação no Google. */
export function buildGoogleReviewEmailSubject(clientName?: string) {
  const first = clientName ? getFirstName(clientName) : "";
  if (first) {
    return `${first}, sua opinião vale ouro para a Móveis Unghero ✨`;
  }
  return "Sua opinião vale ouro — avalie a Móveis Unghero no Google ✨";
}

export function buildGoogleReviewEmailText(options?: {
  clientName?: string;
  reviewUrl?: string;
}) {
  const url = options?.reviewUrl ?? getGoogleReviewShortUrl();
  const greeting = options?.clientName
    ? `Olá ${getFirstName(options.clientName)},`
    : "Olá,";

  return `${greeting}

Que alegria ter você como cliente da Móveis Unghero!

Se o projeto de móveis sob medida ficou do jeito que imaginou, sua avaliação no Google nos ajuda (e muito) a continuar entregando esse padrão.

Leva menos de 1 minuto:
${url}

Obrigado pela confiança.
Equipe Móveis Unghero
Farroupilha/RS`;
}

/**
 * HTML editorial — CTA claro, tom de marca (madeira/dourado), sem parecer spam.
 */
export function buildGoogleReviewEmailHtml(options?: {
  clientName?: string;
  reviewUrl?: string;
}) {
  const url = options?.reviewUrl ?? getGoogleReviewShortUrl();
  const first = options?.clientName ? getFirstName(options.clientName) : "";
  const greeting = first ? `Olá ${first},` : "Olá,";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Avaliação Google — Móveis Unghero</title>
</head>
<body style="margin:0;padding:0;background:#f4efe6;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4efe6;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fffdf8;border:1px solid #e6dcc8;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(145deg,#d4a017 0%,#b8860b 55%,#8b6914 100%);padding:22px 28px;">
              <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.88);font-weight:700;">
                Móveis Unghero
              </p>
              <h1 style="margin:8px 0 0;font-size:26px;line-height:1.25;color:#1a1408;font-weight:700;">
                Sua opinião vale ouro
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px;color:#2c2416;font-size:16px;line-height:1.65;">
              <p style="margin:0 0 14px;">${greeting}</p>
              <p style="margin:0 0 14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;color:#4a4033;">
                Que alegria ter você como cliente. Se o projeto de <strong style="color:#2c2416;">móveis sob medida</strong> ficou do jeito que imaginou, uma avaliação no Google nos ajuda a continuar entregando esse cuidado — e inspira quem ainda está escolhendo a marcenaria certa.
              </p>
              <p style="margin:0 0 22px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;color:#4a4033;">
                Leva menos de 1 minuto. São só algumas estrelas e, se quiser, um comentário curto.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 8px;">
                <tr>
                  <td align="center" style="border-radius:10px;background:#c4960f;">
                    <a href="${url}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;font-weight:700;color:#1a1408;text-decoration:none;">
                      Avaliar no Google ★★★★★
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:18px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;color:#8a7d68;text-align:center;word-break:break-all;">
                Ou abra: <a href="${url}" style="color:#8b6914;">${url}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 28px;border-top:1px solid #efe6d6;">
              <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#5c5346;line-height:1.5;">
                Obrigado pela confiança.<br />
                <strong style="color:#2c2416;">Equipe Móveis Unghero</strong><br />
                Farroupilha / RS
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildMarketingFormEmailSubject(formTitle: string) {
  return `${formTitle} — Móveis Unghero`;
}

export function buildMarketingFormEmailHtml(options: {
  bodyText: string;
  ctaUrl: string;
  ctaLabel?: string;
}) {
  const lines = options.bodyText
    .split(/\n/)
    .map((line) => line.trimEnd())
    .map((line) =>
      line
        ? `<p style="margin:0 0 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#334155;">${escapeHtml(line)}</p>`
        : `<p style="margin:0 0 8px;">&nbsp;</p>`
    )
    .join("");

  const cta = options.ctaLabel || "Abrir formulário";

  return `<!DOCTYPE html>
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
            ${lines}
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0 8px;">
              <tr>
                <td style="border-radius:10px;background:#c4960f;">
                  <a href="${escapeHtml(options.ctaUrl)}" style="display:inline-block;padding:12px 22px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;font-weight:700;color:#1a1408;text-decoration:none;">${escapeHtml(cta)}</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
