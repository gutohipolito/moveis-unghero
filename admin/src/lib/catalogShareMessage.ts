import { getFirstName } from "@/lib/google-review";

function partnerLabel(partnerName?: string | null) {
  const name = partnerName?.trim();
  return name ? `do nosso parceiro *${name}*` : "de um de nossos parceiros";
}

function partnerLabelPlain(partnerName?: string | null) {
  const name = partnerName?.trim();
  return name ? `do nosso parceiro ${name}` : "de um de nossos parceiros";
}

export function buildCatalogWhatsAppMessage(options: {
  clientName?: string;
  catalogTitle: string;
  catalogUrl: string;
  partnerName?: string | null;
}) {
  const greeting = options.clientName
    ? `Olá ${getFirstName(options.clientName)}, tudo bem?`
    : "Olá, tudo bem?";
  return `${greeting}

Segue o catálogo *${options.catalogTitle}* ${partnerLabel(options.partnerName)}:

${options.catalogUrl}

Qualquer dúvida, é só chamar.`;
}

export function buildCatalogEmailSubject(catalogTitle: string) {
  return `Catálogo: ${catalogTitle} — Móveis Unghero`;
}

export function buildCatalogEmailBody(options: {
  clientName?: string;
  catalogTitle: string;
  catalogUrl: string;
  partnerName?: string | null;
}) {
  const greeting = options.clientName
    ? `Olá ${getFirstName(options.clientName)},`
    : "Olá,";
  return `${greeting}

Segue o link do catálogo "${options.catalogTitle}" ${partnerLabelPlain(options.partnerName)} para você visualizar:

${options.catalogUrl}

Qualquer dúvida, ficamos à disposição.

Atenciosamente,
Móveis Unghero`;
}
