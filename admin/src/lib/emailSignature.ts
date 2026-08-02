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
  disclaimer: "#A39B94",
  primary: "#dc9b04",
  border: "#e5e0d8",
  background: "#ffffff",
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

/** Aviso curto de confidencialidade + LGPD (assinatura — evita bloco “jurídico” pesado). */
export const EMAIL_SIGNATURE_LGPD_NOTICE =
  "Tratamos dados pessoais conforme a LGPD (Lei nº 13.709/2018). Este e-mail é confidencial. Se o recebeu por engano, apague-o e nos avise.";

export const SIGNATURE_TITLE_BY_AREA: Record<EmailMailboxArea, string> = {
  ATENDIMENTO: "Atendimento",
  COMERCIAL: "Comercial",
  FINANCEIRO: "Financeiro",
  FABRICA: "Fábrica",
  DOCUMENTOS: "Documentos",
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

function link(href: string, label: string, color: string) {
  return `<a href="${href}" style="color:${color};text-decoration:none;">${label}</a>`;
}

function sep(color: string) {
  return `<span style="color:${color};padding:0 7px;">·</span>`;
}

/**
 * Assinatura moderna: wordmark + área discreta + contatos em uma linha,
 * hairline dourada e LGPD curto — sem cartão nem lista de ícones.
 */
export function buildUngheroSignatureHtml(options: BuildSignatureOptions): string {
  const title = escapeHtml((options.title || "Atendimento").trim() || "Atendimento");
  const company = escapeHtml(EMAIL_SIGNATURE_BRAND.company);
  const logoSrc = asset("logo.png");
  const b = EMAIL_SIGNATURE_BRAND;
  const t = EMAIL_SIG_TOKENS;
  const lgpd = escapeHtml(EMAIL_SIGNATURE_LGPD_NOTICE);
  const addressOneLine = escapeHtml(b.addressLines.join(" · "));

  const contacts = [
    link(b.whatsappHref, escapeHtml(b.whatsappDisplay), t.foreground),
    link(b.instagramHref, escapeHtml(b.instagramHandle), t.foreground),
    link(b.siteHref, escapeHtml(b.siteDisplay), t.foreground),
  ].join(sep(t.border));

  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:20px 0 0 0;padding:0;width:100%;max-width:560px;background-color:${t.background};">
  <tr>
    <td style="padding:0 0 0 0;background-color:${t.background};border-top:2px solid ${t.primary};">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%;background-color:${t.background};">
        <tr>
          <td style="padding:18px 0 0 0;background-color:${t.background};">
            <a href="${b.siteHref}" style="text-decoration:none;border:0;">
              <img src="${logoSrc}" width="168" height="35" alt="${company}" style="display:block;border:0;outline:none;height:35px;width:auto;max-width:168px;">
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 0 0 0;font-family:${t.fontBody};font-size:12px;line-height:1.3;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${t.muted};background-color:${t.background};">
            ${title}
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0 0 0;font-family:${t.fontBody};font-size:13px;line-height:1.55;font-weight:500;color:${t.foreground};background-color:${t.background};">
            ${contacts}
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0 0 0;font-family:${t.fontBody};font-size:12px;line-height:1.45;font-weight:400;color:${t.muted};background-color:${t.background};">
            ${link(b.mapsHref, addressOneLine, t.muted)}
          </td>
        </tr>
        <tr>
          <td style="padding:14px 0 0 0;font-family:${t.fontBody};font-size:10px;line-height:1.45;font-weight:400;color:${t.disclaimer};background-color:${t.background};">
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
    b.company,
    title,
    "",
    `WhatsApp: ${b.whatsappDisplay}`,
    `Instagram: ${b.instagramHandle}`,
    b.siteDisplay,
    b.addressLines.join(" · "),
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
