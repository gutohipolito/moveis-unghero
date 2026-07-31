import { resolve4 } from "dns/promises";

/** Faixas públicas conhecidas da Cloudflare (aprox. — só para aviso UX). */
function isLikelyCloudflareIp(ip: string): boolean {
  return (
    ip.startsWith("104.16.") ||
    ip.startsWith("104.17.") ||
    ip.startsWith("104.18.") ||
    ip.startsWith("104.19.") ||
    ip.startsWith("104.20.") ||
    ip.startsWith("104.21.") ||
    ip.startsWith("104.22.") ||
    ip.startsWith("104.23.") ||
    ip.startsWith("104.24.") ||
    ip.startsWith("104.25.") ||
    ip.startsWith("104.26.") ||
    ip.startsWith("104.27.") ||
    ip.startsWith("172.64.") ||
    ip.startsWith("172.65.") ||
    ip.startsWith("172.66.") ||
    ip.startsWith("172.67.") ||
    ip.startsWith("172.68.") ||
    ip.startsWith("172.69.") ||
    ip.startsWith("172.70.") ||
    ip.startsWith("172.71.")
  );
}

/**
 * Se o host de e-mail resolve para IP Cloudflare (nuvem laranja), IMAP/SMTP
 * vão dar timeout — a Cloudflare não faz proxy desses protocolos.
 */
export async function assertMailHostReachable(host: string): Promise<string | null> {
  const normalized = host.trim().toLowerCase();
  if (!normalized || /^\d{1,3}(\.\d{1,3}){3}$/.test(normalized)) {
    return null;
  }

  try {
    const ips = await resolve4(normalized);
    if (!ips.length) {
      return `Host ${normalized} sem registro A no DNS.`;
    }
    if (ips.every(isLikelyCloudflareIp)) {
      return (
        `O host ${normalized} está com proxy da Cloudflare (nuvem laranja). ` +
        `IMAP/SMTP não funcionam assim e dão timeout. ` +
        `No Cloudflare DNS, deixe o registro "mail" como DNS only (nuvem cinza) ` +
        `apontando para o IP da HostGator (ex.: 162.241.62.241).`
      );
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (/ENOTFOUND|ENODATA/i.test(msg)) {
      return `Host ${normalized} não encontrado no DNS.`;
    }
  }

  return null;
}

/** Mensagens amigáveis para falhas IMAP/SMTP (HostGator / Vercel). */
export function formatMailConnectionError(error: unknown, channel: "IMAP" | "SMTP"): string {
  const raw = extractRawMailError(error);
  const text = raw.trim();

  if (!text) {
    return `${channel}: falha ao conectar (sem detalhes do servidor). Confira senha, host mail.moveisunghero.com.br e portas 993/465.`;
  }

  if (/authentication|invalid credentials|LOGIN failed|AUTH|Incorrect authentication/i.test(text)) {
    return `${channel}: falha de autenticação HostGator — confira o e-mail e a senha do webmail.`;
  }
  if (/ETIMEDOUT|ESOCKETTIMEDOUT|timeout|CONNECT_TIMEOUT|GREETING_TIMEOUT|timed out/i.test(text)) {
    return (
      `${channel}: tempo esgotado ao conectar. ` +
      `Se o host "mail" estiver com nuvem laranja na Cloudflare, mude para DNS only (cinza). ` +
      `Senão, o HostGator pode estar lento ou bloqueando o IP da Vercel.`
    );
  }
  if (/ECONNREFUSED|ECONNRESET|ENETUNREACH/i.test(text)) {
    return `${channel}: conexão recusada/resetada pelo servidor. Confira host e porta (${channel === "IMAP" ? "993" : "465"}).`;
  }
  if (/ENOTFOUND|getaddrinfo/i.test(text)) {
    return `${channel}: host não encontrado — use mail.moveisunghero.com.br.`;
  }
  if (/CERT|SSL|TLS|unable to verify|self[- ]signed|UNABLE_TO_VERIFY/i.test(text)) {
    return `${channel}: problema de certificado SSL/TLS com o servidor de e-mail.`;
  }

  if (/^(IMAP|SMTP)\s*:?\s*$/i.test(text)) {
    return `${channel}: falha ao conectar. Confira senha e configurações HostGator.`;
  }

  return text.length > 280 ? `${text.slice(0, 277)}…` : text;
}

function extractRawMailError(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;

  if (error instanceof Error) {
    const e = error as Error & {
      code?: string;
      response?: string;
      responseText?: string;
      responseStatus?: string;
      command?: string;
      errors?: unknown[];
    };

    if (Array.isArray(e.errors) && e.errors.length) {
      return e.errors.map((inner) => extractRawMailError(inner)).filter(Boolean).join(" | ");
    }

    return [e.message, e.responseText, e.response, e.responseStatus, e.code, e.command]
      .filter((p) => typeof p === "string" && p.trim())
      .join(" — ");
  }

  if (typeof error === "object") {
    try {
      return JSON.stringify(error);
    } catch {
      return "";
    }
  }

  return String(error);
}
