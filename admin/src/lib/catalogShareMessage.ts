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

/**
 * Mensagem do portal do arquiteto → cliente (tom pessoal, não corporativo).
 * `brandName` = fornecedor/marca do catálogo; `catalogTitle` = título do PDF.
 */
export function buildPartnerPortalCatalogWhatsAppMessage(options: {
  catalogTitle: string;
  catalogUrl: string;
  brandName?: string | null;
}) {
  const title = options.catalogTitle.trim();
  const brand = options.brandName?.trim();
  const catalogLabel = brand
    ? `*${brand}* — *${title}*`
    : `*${title}*`;

  return (
    `Olá! Tudo bem?\n\n` +
    `Esse aqui é o catálogo ${catalogLabel} pra você olhar com calma e ver algumas referências e acessórios.\n\n` +
    `${options.catalogUrl}\n\n` +
    `Qualquer dúvida, me chama.`
  );
}
