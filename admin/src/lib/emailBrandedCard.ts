import { EMAIL_SIGNATURE_ASSET_BASE } from "@/lib/emailSignature";

const LOGO_SRC = `${EMAIL_SIGNATURE_ASSET_BASE}/logo.png`;

export function escapeEmailHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderEmailPlaceholders(
  template: string,
  vars: Record<string, string>
): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`{{${key}}}`).join(value ?? "");
  }
  out = out.replace(/\{\{[a-z0-9_]+\}\}/gi, "");
  return out
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function linkifyEscaped(escaped: string): string {
  return escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" style="color:#0f172a;text-decoration:underline;word-break:break-all;">$1</a>'
  );
}

export function emailBodyTextToHtml(text: string): string {
  const blocks = text.split(/\n{2,}/).filter(Boolean);
  if (blocks.length === 0) return "";
  return blocks
    .map((block) => {
      const html = linkifyEscaped(escapeEmailHtml(block)).replace(/\n/g, "<br/>");
      return `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#334155;">${html}</p>`;
    })
    .join("");
}

export function buildBrandedEmailHtml(options: {
  bodyHtml: string;
  ctaLabel?: string;
  ctaHref?: string;
}): string {
  const cta =
    options.ctaLabel && options.ctaHref
      ? `<p style="margin:20px 0 0;">
              <a href="${escapeEmailHtml(options.ctaHref)}" style="display:inline-block;padding:10px 16px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:10px;font-size:13px;font-weight:700;">
                ${escapeEmailHtml(options.ctaLabel)}
              </a>
            </p>`
      : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
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
            ${options.bodyHtml}
            ${cta}
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function composeBrandedEmail(options: {
  subject: string;
  bodyText: string;
  ctaLabel?: string;
  ctaHref?: string;
}): { subject: string; text: string; html: string } {
  const textParts = [options.bodyText.trim()];
  if (options.ctaLabel && options.ctaHref) {
    textParts.push("", `${options.ctaLabel}: ${options.ctaHref}`);
  }
  textParts.push("", "Móveis Unghero");
  return {
    subject: options.subject.trim(),
    text: textParts.join("\n"),
    html: buildBrandedEmailHtml({
      bodyHtml: emailBodyTextToHtml(options.bodyText),
      ctaLabel: options.ctaLabel,
      ctaHref: options.ctaHref,
    }),
  };
}
