import type { Metadata } from "next";

const BRAND = "Móveis Unghero";

/** Ícone quadrado para preview de link (WhatsApp/Telegram) — ao lado do título, não banner. */
export const PUBLIC_SHARE_ICON_PATH = "/icon-mu-192.png";
const SHARE_ICON_WIDTH = 192;
const SHARE_ICON_HEIGHT = 192;

/**
 * Origem absoluta para og:image / twitter:image.
 * Preferimos o admin (onde o PNG é servido pelo Next); crawlers aceitam URL cross-origin.
 */
export function publicAssetOrigin(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_FORMS_ADMIN_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  return "https://admin.moveisunghero.com.br";
}

export function publicShareIconUrl(origin = publicAssetOrigin()): string {
  return `${origin}${PUBLIC_SHARE_ICON_PATH}`;
}

function shareImages(origin = publicAssetOrigin()) {
  const url = publicShareIconUrl(origin);
  return [
    {
      url,
      width: SHARE_ICON_WIDTH,
      height: SHARE_ICON_HEIGHT,
      alt: BRAND,
      type: "image/png" as const,
    },
  ];
}

/** Metadata voltada ao destinatário externo (cliente / parceiro) — sem jargão de CRM/SaaS. */
export function publicPageMetadata(opts: {
  title: string;
  description: string;
  /** Se false, permite indexação (formulários públicos). Default: não indexar. */
  noIndex?: boolean;
}): Metadata {
  const noIndex = opts.noIndex !== false;
  const origin = publicAssetOrigin();
  const images = shareImages(origin);

  return {
    metadataBase: new URL(origin),
    title: opts.title,
    description: opts.description,
    applicationName: BRAND,
    openGraph: {
      title: opts.title,
      description: opts.description,
      siteName: BRAND,
      locale: "pt_BR",
      type: "website",
      // Quadrado + twitter summary → miniatura ao lado (não capa esticada no topo).
      images,
    },
    twitter: {
      card: "summary",
      title: opts.title,
      description: opts.description,
      images: images.map((img) => img.url),
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
      "Abra este link para ver sua proposta exclusiva. Projetos únicos e personalizados para o seu espaço, com a qualidade da Móveis Unghero.",
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
      "Conte um pouco sobre o seu projeto. É rápido e nos ajuda a criar um móvel sob medida, único e personalizado para o seu ambiente.",
  },
  cadastroCliente: {
    title: `Faça seu cadastro | ${BRAND}`,
    description:
      "Cadastre-se em poucos minutos para receber atendimento e orçamento de móveis sob medida, feitos especialmente para o seu ambiente.",
  },
  cadastroParceiro: {
    title: `Seja nosso parceiro | ${BRAND}`,
    description:
      "Arquitetos, designers e projetistas: cadastre-se para indicar clientes e co-projetar móveis sob medida com a Móveis Unghero.",
  },
  cadastroFornecedor: {
    title: `Seja nosso fornecedor | ${BRAND}`,
    description:
      "Distribuidores e fabricantes: faça o pré-cadastro para apresentar seu catálogo e condições comerciais.",
  },
  portalCliente: {
    title: `Portal do cliente | ${BRAND}`,
    description:
      "Acompanhe o andamento do seu projeto de móveis sob medida com a Móveis Unghero.",
  },
  portalParceiro: {
    title: `Portal do parceiro | ${BRAND}`,
    description:
      "Acompanhe as obras que você indicou ou co-projeta com a Móveis Unghero.",
  },
} as const;
