import { buildWhatsAppUrl, getFirstName } from "@/lib/google-review";

export interface QuoteWhatsAppMessageOptions {
  clientName: string;
  valorFinal: string;
  validade: string;
  pdfUrl?: string;
}

export function buildQuoteWhatsAppMessage(options: QuoteWhatsAppMessageOptions) {
  const firstName = getFirstName(options.clientName);

  const lines = [
    `Olá ${firstName}, tudo bem?`,
    "",
    "Segue o *orçamento comercial detalhado* da Móveis Unghero:",
    "",
    `💰 Investimento total: ${options.valorFinal}`,
    `📅 Validade da proposta: ${options.validade}`,
  ];

  if (options.pdfUrl) {
    lines.push("", "📄 Acesse o PDF do orçamento:", options.pdfUrl);
  } else {
    lines.push("", "📄 O PDF do orçamento segue em anexo nesta conversa.");
  }

  lines.push("", "Qualquer dúvida, estamos à disposição!", "Equipe Móveis Unghero");

  return lines.join("\n");
}

export function openQuoteWhatsApp(phone: string, message: string) {
  const url = buildWhatsAppUrl(phone, message);
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

export function slugifyFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 40) || "cliente";
}
