import type { EmailMailboxArea } from "@prisma/client";

/** Base pública dos assets (HTTPS absoluto — exigido pelos clientes de e-mail). */
export const EMAIL_SIGNATURE_ASSET_BASE =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  "https://admin.moveisunghero.com.br";

/**
 * Tokens espelhados do admin (globals.css / design-tokens).
 * Hex porque e-mail não resolve hsl(var(--…)).
 */
export const EMAIL_SIG_TOKENS = {
  foreground: "#29231f",
  muted: "#746963",
  /** Cinza mais claro para o aviso LGPD. */
  disclaimer: "#9A918A",
  primary: "#dc9b04",
  border: "#dcd7d0",
  background: "#f8f6f2",
  fontDisplay: "'Outfit', 'Plus Jakarta Sans', Arial, Helvetica, sans-serif",
  fontBody: "'Plus Jakarta Sans', Arial, Helvetica, sans-serif",
} as const;

export const EMAIL_SIGNATURE_BRAND = {
  company: "Móveis Unghero",
  whatsappDisplay: "(54) 9 9997-1050",
  whatsappHref: "https://wa.me/5554999971050",
  instagramHandle: "@moveisunghero",
  instagramHref: "https://www.instagram.com/moveisunghero/",
  siteDisplay: "moveisunghero.com.br",
  siteHref: "https://moveisunghero.com.br",
  addressLines: [
    "Rua Cenira Cambruzzi, 155",
    "Planalto, Farroupilha - RS",
    "CEP 95170-308",
  ],
  mapsHref:
    "https://www.google.com/maps/place/M%C3%B3veis+Unghero/@-29.2211024,-51.3423502,17z",
} as const;

/** Aviso padrão de confidencialidade + LGPD (Lei nº 13.709/2018). */
export const EMAIL_SIGNATURE_LGPD_NOTICE =
  "Este e-mail e quaisquer anexos são confidenciais e destinam-se exclusivamente ao(s) destinatário(s) indicado(s). Se você o recebeu por engano, por favor apague-o e nos informe. O tratamento de dados pessoais pela Móveis Unghero observa a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).";

export const SIGNATURE_TITLE_BY_AREA: Record<EmailMailboxArea, string> = {
  ATENDIMENTO: "Atendimento",
  COMERCIAL: "Comercial",
  FINANCEIRO: "Financeiro",
  FABRICA: "Fábrica",
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

function contactRow(
  iconSrc: string,
  iconAlt: string,
  href: string,
  labelHtml: string
) {
  const t = EMAIL_SIG_TOKENS;
  return `
<tr>
  <td style="padding:0 0 5px 0;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
      <tr>
        <td valign="top" width="20" style="padding:3px 10px 0 0;width:20px;">
          <a href="${href}" style="text-decoration:none;border:0;">
            <img src="${iconSrc}" width="14" height="14" alt="${iconAlt}" style="display:block;border:0;outline:none;width:14px;height:14px;">
          </a>
        </td>
        <td valign="top" style="font-family:${t.fontBody};font-size:12.5px;line-height:1.45;font-weight:500;color:${t.foreground};">
          <a href="${href}" style="color:${t.foreground};text-decoration:none;">${labelHtml}</a>
        </td>
      </tr>
    </table>
  </td>
</tr>`.trim();
}

/**
 * Assinatura: logo à esquerda | divisória | dados à direita,
 * com aviso LGPD em largura total no rodapé.
 */
export function buildUngheroSignatureHtml(options: BuildSignatureOptions): string {
  const title = escapeHtml((options.title || "Atendimento").trim() || "Atendimento");
  const company = escapeHtml(EMAIL_SIGNATURE_BRAND.company);
  const logoSrc = asset("logo.png");
  const b = EMAIL_SIGNATURE_BRAND;
  const t = EMAIL_SIG_TOKENS;
  const lgpd = escapeHtml(EMAIL_SIGNATURE_LGPD_NOTICE);

  const addressLabel = b.addressLines
    .map((line, i) => {
      const safe = escapeHtml(line);
      return i === 0
        ? safe
        : `<br><span style="color:${t.muted};font-weight:400;">${safe}</span>`;
    })
    .join("");

  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:0;padding:0;width:100%;max-width:640px;">
  <tr>
    <td style="padding:22px 0 0 0;border-top:1px solid ${t.border};">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%;">
        <tr>
          <td valign="middle" width="160" style="padding:0 18px 0 0;width:160px;">
            <a href="${b.siteHref}" style="text-decoration:none;border:0;">
              <img src="${logoSrc}" width="148" height="31" alt="${company}" style="display:block;border:0;outline:none;height:31px;width:auto;max-width:148px;">
            </a>
          </td>
          <td valign="top" width="1" style="width:1px;border-left:1px solid ${t.border};font-size:0;line-height:0;padding:0;">&nbsp;</td>
          <td valign="top" style="padding:0 0 0 18px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
              <tr>
                <td style="padding:0 0 2px 0;font-family:${t.fontDisplay};font-size:18px;line-height:1.2;font-weight:700;letter-spacing:-0.02em;color:${t.foreground};">
                  ${title}
                </td>
              </tr>
              <tr>
                <td style="padding:0 0 12px 0;font-family:${t.fontBody};font-size:11px;line-height:1.35;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:${t.muted};">
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
  <tr>
    <td style="padding:16px 0 0 0;width:100%;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%;">
        <tr>
          <td style="padding:12px 0 0 0;border-top:1px solid ${t.border};font-family:${t.fontBody};font-size:10px;line-height:1.5;font-weight:400;color:${t.disclaimer};width:100%;">
            ${lgpd}
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
    "",
    EMAIL_SIGNATURE_LGPD_NOTICE,
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
  const t = EMAIL_SIG_TOKENS;
  const escaped = escapeHtml(text || "").replace(/\n/g, "<br>\n");
  return `<div style="font-family:${t.fontBody};font-size:15px;line-height:1.6;color:${t.foreground};">${escaped}</div>`;
}

function wrapBodyHtml(html: string): string {
  const t = EMAIL_SIG_TOKENS;
  const inner = (html || "").trim();
  if (!inner) return plainBodyToHtml("");
  return `<div style="font-family:${t.fontBody};font-size:15px;line-height:1.6;color:${t.foreground};">${inner}</div>`;
}

function stripTagsRough(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|h\d|td|li)>/gi, "\n")
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

export type ComposeBodyInput = {
  text: string;
  /** Se informado, usado como corpo HTML (ex.: editor rich). */
  html?: string | null;
};

/** Converte corpo + assinatura em multipart para o SMTP. */
export function composeBodyWithSignature(
  bodyTextOrInput: string | ComposeBodyInput,
  signature: string | null | undefined
): { text: string; html: string } {
  const input: ComposeBodyInput =
    typeof bodyTextOrInput === "string"
      ? { text: bodyTextOrInput }
      : bodyTextOrInput;

  const textBody = (input.text || "").trimEnd();
  const htmlBody = (input.html || "").trim();
  const sig = (signature || "").trim();
  const t = EMAIL_SIG_TOKENS;

  const bodyHtml = htmlBody ? wrapBodyHtml(htmlBody) : plainBodyToHtml(textBody);

  if (!sig) {
    return {
      text: textBody || stripTagsRough(htmlBody),
      html: bodyHtml,
    };
  }

  if (isHtmlEmailSignature(sig)) {
    const textFallback = stripTagsRough(sig);
    const marker = textFallback.split("\n")[0] || "";
    const plain = textBody || stripTagsRough(htmlBody);
    const already =
      Boolean(marker) &&
      (plain.includes(marker) || plain.includes(`-- \n${marker}`));
    const text = already ? plain : `${plain}\n\n-- \n${textFallback}`;
    return { text, html: `${bodyHtml}${sig}` };
  }

  const plain = textBody || stripTagsRough(htmlBody);
  const already = plain.endsWith(sig) || plain.includes(`\n-- \n${sig}`);
  const text = already ? plain : `${plain}\n\n-- \n${sig}`;
  const html = already
    ? bodyHtml
    : `${bodyHtml}<div style="margin-top:18px;font-family:${t.fontBody};font-size:13px;line-height:1.45;color:${t.muted};white-space:pre-wrap;">${escapeHtml(`-- \n${sig}`)}</div>`;
  return { text, html };
}
