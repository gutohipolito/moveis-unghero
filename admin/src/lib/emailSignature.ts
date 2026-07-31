import type { EmailMailboxArea } from "@prisma/client";

/** Base pública dos assets da assinatura (precisa ser HTTPS absoluto nos clientes de e-mail). */
export const EMAIL_SIGNATURE_ASSET_BASE =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  "https://admin.moveisunghero.com.br";

export const EMAIL_SIGNATURE_BRAND = {
  company: "Móveis Unghero",
  whatsappDisplay: "(54) 9 9997-1050",
  whatsappHref: "https://wa.me/5554999971050",
  instagramHandle: "@moveisunghero",
  instagramHref: "https://www.instagram.com/moveisunghero/",
  siteDisplay: "moveisunghero.com.br",
  siteHref: "https://moveisunghero.com.br",
  /** Formato alinhado ao Google / schema do site. */
  addressLines: [
    "Rua Cenira Cambruzzi, 155",
    "Planalto, Farroupilha - RS",
    "CEP 95170-308",
  ],
  mapsHref:
    "https://www.google.com/maps/place/M%C3%B3veis+Unghero/@-29.2211024,-51.3423502,17z",
} as const;

export const SIGNATURE_TITLE_BY_AREA: Record<EmailMailboxArea, string> = {
  ATENDIMENTO: "Atendimento",
  COMERCIAL: "Comercial",
  FINANCEIRO: "Financeiro",
};

function asset(file: string) {
  return `${EMAIL_SIGNATURE_ASSET_BASE}/email-sig/${file}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function isHtmlEmailSignature(value: string | null | undefined): boolean {
  const v = (value || "").trim();
  return /<\s*(table|div|img|a)\b/i.test(v);
}

export type BuildSignatureOptions = {
  title: string;
};

function contactRow(iconSrc: string, iconAlt: string, href: string, labelHtml: string) {
  return `
<tr>
  <td style="padding:0 0 8px 0;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
      <tr>
        <td valign="top" style="padding:1px 8px 0 0;width:16px;">
          <a href="${href}" style="text-decoration:none;border:0;">
            <img src="${iconSrc}" width="16" height="16" alt="${iconAlt}" style="display:block;border:0;outline:none;">
          </a>
        </td>
        <td valign="top" style="font-family:Georgia,'Times New Roman',serif;font-size:13px;line-height:1.45;color:#44403C;">
          <a href="${href}" style="color:#44403C;text-decoration:none;">${labelHtml}</a>
        </td>
      </tr>
    </table>
  </td>
</tr>`.trim();
}

/** Assinatura HTML table-based (Outlook-safe) com logo e ícones oficiais. */
export function buildUngheroSignatureHtml(options: BuildSignatureOptions): string {
  const title = escapeHtml((options.title || "Atendimento").trim() || "Atendimento");
  const company = escapeHtml(EMAIL_SIGNATURE_BRAND.company);
  /** Símbolo do dashboard (icon-mu) — deixa o nome/subtítulo como hierarquia tipográfica. */
  const logoSrc = asset("mark.png");
  const b = EMAIL_SIGNATURE_BRAND;

  const addressLabel = b.addressLines
    .map((line, i) => {
      const safe = escapeHtml(line);
      return i === 0 ? safe : `<br>${safe}`;
    })
    .join("");

  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:0;padding:0;">
  <tr>
    <td style="padding:20px 0 0 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        <tr>
          <td valign="top" style="padding:2px 18px 0 0;border-right:1px solid #E7E5E4;">
            <a href="${b.siteHref}" style="text-decoration:none;border:0;">
              <img src="${logoSrc}" width="52" height="52" alt="${company}" style="display:block;border:0;outline:none;border-radius:10px;width:52px;height:52px;">
            </a>
          </td>
          <td valign="top" style="padding:0 0 0 18px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
              <tr>
                <td style="padding:0 0 2px 0;font-family:Georgia,'Times New Roman',serif;font-size:19px;line-height:1.15;font-weight:700;color:#1C1917;">
                  ${title}
                </td>
              </tr>
              <tr>
                <td style="padding:0 0 14px 0;font-family:Georgia,'Times New Roman',serif;font-size:12px;line-height:1.3;color:#A8A29E;letter-spacing:0.06em;text-transform:uppercase;">
                  ${company}
                </td>
              </tr>
              ${contactRow(asset("whatsapp.png"), "WhatsApp", b.whatsappHref, escapeHtml(b.whatsappDisplay))}
              ${contactRow(asset("instagram.png"), "Instagram", b.instagramHref, escapeHtml(b.instagramHandle))}
              ${contactRow(asset("website.png"), "Site", b.siteHref, escapeHtml(b.siteDisplay))}
              ${contactRow(asset("map.png"), "Endereço", b.mapsHref, addressLabel)}
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`.trim();
}

export function buildUngheroSignatureText(options: BuildSignatureOptions): string {
  const title = (options.title || "Atendimento").trim() || "Atendimento";
  const b = EMAIL_SIGNATURE_BRAND;
  return [
    title,
    b.company,
    "",
    `WhatsApp: ${b.whatsappDisplay}`,
    `Instagram: ${b.instagramHandle}`,
    b.siteDisplay,
    "",
    ...b.addressLines,
  ].join("\n");
}

export function getSuggestedSignatureHtml(area: EmailMailboxArea): string {
  return buildUngheroSignatureHtml({
    title: SIGNATURE_TITLE_BY_AREA[area],
  });
}

export function getSuggestedSignatureText(area: EmailMailboxArea): string {
  return buildUngheroSignatureText({
    title: SIGNATURE_TITLE_BY_AREA[area],
  });
}

function plainBodyToHtml(text: string): string {
  const escaped = escapeHtml(text || "").replace(/\n/g, "<br>\n");
  return `<div style="font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.55;color:#1C1917;">${escaped}</div>`;
}

function stripTagsRough(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|h\d|td)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Converte corpo texto + assinatura (HTML ou texto) em multipart para o SMTP. */
export function composeBodyWithSignature(
  bodyText: string,
  signature: string | null | undefined
): { text: string; html: string } {
  const body = (bodyText || "").trimEnd();
  const sig = (signature || "").trim();

  if (!sig) {
    return { text: body, html: plainBodyToHtml(body) };
  }

  if (isHtmlEmailSignature(sig)) {
    const textFallback = stripTagsRough(sig);
    const marker = textFallback.split("\n")[0] || "";
    const already =
      Boolean(marker) &&
      (body.includes(marker) || body.includes(`-- \n${marker}`));
    const text = already ? body : `${body}\n\n-- \n${textFallback}`;
    const html = `${plainBodyToHtml(body)}${sig}`;
    return { text, html };
  }

  const already = body.endsWith(sig) || body.includes(`\n-- \n${sig}`);
  const text = already ? body : `${body}\n\n-- \n${sig}`;
  const html = already
    ? plainBodyToHtml(body)
    : `${plainBodyToHtml(body)}<div style="margin-top:18px;font-family:Georgia,'Times New Roman',serif;font-size:13px;line-height:1.45;color:#44403C;white-space:pre-wrap;">${escapeHtml(`-- \n${sig}`)}</div>`;
  return { text, html };
}
