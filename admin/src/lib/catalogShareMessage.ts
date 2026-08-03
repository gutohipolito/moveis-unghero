import { getFirstName } from "@/lib/google-review";

export function buildCatalogWhatsAppMessage(options: {
  clientName?: string;
  catalogTitle: string;
  catalogUrl: string;
}) {
  const greeting = options.clientName
    ? `Olá ${getFirstName(options.clientName)}, tudo bem?`
    : "Olá, tudo bem?";
  return `${greeting}

Segue o catálogo *${options.catalogTitle}* da Móveis Unghero:

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
}) {
  const greeting = options.clientName
    ? `Olá ${getFirstName(options.clientName)},`
    : "Olá,";
  return `${greeting}

Segue o link do catálogo "${options.catalogTitle}" para você visualizar:

${options.catalogUrl}

Qualquer dúvida, ficamos à disposição.

Atenciosamente,
Móveis Unghero`;
}
