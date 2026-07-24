import type { Metadata } from "next";

const BRAND = "Móveis Unghero";

/** Metadata voltada ao destinatário externo (cliente / parceiro) — sem jargão de CRM/SaaS. */
export function publicPageMetadata(opts: {
  title: string;
  description: string;
  /** Se false, permite indexação (formulários públicos). Default: não indexar. */
  noIndex?: boolean;
}): Metadata {
  const noIndex = opts.noIndex !== false;

  return {
    title: opts.title,
    description: opts.description,
    applicationName: BRAND,
    openGraph: {
      title: opts.title,
      description: opts.description,
      siteName: BRAND,
      locale: "pt_BR",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: opts.title,
      description: opts.description,
    },
    robots: noIndex
      ? { index: false, follow: false, nocache: true }
      : { index: true, follow: true },
  };
}

export const PUBLIC_PAGE_COPY = {
  quote: {
    title: (clientName: string) =>
      `Seu orçamento | ${clientName || "Cliente"} | ${BRAND}`,
    description:
      "Abra este link para ver sua proposta de móveis planejados de forma simples e rápida. Qualquer dúvida, nossa equipe está à disposição.",
  },
  contract: {
    title: (clientName: string) =>
      `Seu contrato | ${clientName || "Cliente"} | ${BRAND}`,
    description:
      "Confira o contrato de prestação de serviços da Móveis Unghero. Leitura prática pelo celular, quando e onde preferir.",
  },
  receipt: {
    title: `Seu recibo | ${BRAND}`,
    description:
      "Acesse seu recibo de pagamento da Móveis Unghero de forma rápida e segura.",
  },
  briefing: {
    title: `Solicite seu orçamento | ${BRAND}`,
    description:
      "Conte um pouco sobre o seu projeto de móveis planejados. É rápido e nos ajuda a preparar uma proposta sob medida para você.",
  },
  cadastroCliente: {
    title: `Faça seu cadastro | ${BRAND}`,
    description:
      "Cadastre-se em poucos minutos para receber atendimento e orçamento de móveis planejados sob medida.",
  },
  cadastroParceiro: {
    title: `Seja nosso parceiro | ${BRAND}`,
    description:
      "Arquitetos, designers e projetistas: cadastre-se para indicar clientes e co-projetar com a Móveis Unghero.",
  },
  cadastroFornecedor: {
    title: `Seja nosso fornecedor | ${BRAND}`,
    description:
      "Distribuidores e fabricantes: faça o pré-cadastro para apresentar seu catálogo e condições comerciais.",
  },
  portalCliente: {
    title: `Portal do cliente | ${BRAND}`,
    description:
      "Acompanhe o andamento do seu projeto de móveis planejados com a Móveis Unghero.",
  },
} as const;
