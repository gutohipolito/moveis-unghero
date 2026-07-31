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
    return `${channel}: tempo esgotado ao conectar. Tente de novo; se repetir, o HostGator pode estar lento ou bloqueando o IP da Vercel.`;
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

  // Evita banner só com "IMAP:" / "SMTP:"
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
