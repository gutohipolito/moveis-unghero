/** Base do link curto — site institucional (redirects na HostGator). */
export const FORMS_SHORT_BASE_URL =
  process.env.NEXT_PUBLIC_FORMS_SHORT_URL?.replace(/\/$/, "") ??
  "https://moveisunghero.com.br";

export const FORMS_ADMIN_BASE_URL =
  process.env.NEXT_PUBLIC_FORMS_ADMIN_URL?.replace(/\/$/, "") ??
  "https://admin.moveisunghero.com.br";

export type MarketingFormMessage = {
  id: string;
  label: string;
  /** Use `{link}` para inserir o link do formulário. */
  template: string;
};

export type MarketingForm = {
  id: string;
  title: string;
  description: string;
  audience: string;
  /** Caminho curto no domínio principal (ex.: /orcamento). */
  shortPath: string;
  /** Rota pública no admin (ex.: /briefing). */
  adminPath: string;
  messages: MarketingFormMessage[];
};

export const MARKETING_FORMS: MarketingForm[] = [
  {
    id: "cliente-frio",
    title: "Orçamento — Cliente Frio",
    description:
      "Formulário de qualificação para leads que ainda não conhecem a marcenaria. Gera projeto no funil com briefing completo.",
    audience: "Cliente final",
    shortPath: "/orcamento",
    adminPath: "/briefing",
    messages: [
      {
        id: "whatsapp-primeiro",
        label: "WhatsApp — Primeiro contato",
        template: `Olá, tudo bem?

Somos a Móveis Unghero, marcenaria de alto padrão em Farroupilha/RS.

Para entendermos melhor seu projeto e preparar um orçamento personalizado, preencha este formulário rápido (leva cerca de 3 minutos):

{link}

Assim que recebermos, nossa equipe entra em contato com você!

Equipe Móveis Unghero`,
      },
      {
        id: "whatsapp-retorno",
        label: "WhatsApp — Retomar contato",
        template: `Olá! Passando para retomar nossa conversa sobre móveis planejados.

Se preferir, pode preencher nosso formulário de qualificação por aqui — é rápido e nos ajuda a montar uma proposta mais assertiva:

{link}

Fico no aguardo!
Equipe Móveis Unghero`,
      },
      {
        id: "instagram-direct",
        label: "Instagram / Direct",
        template: `Oi! Que bom falar com você 😊

Para agilizar seu orçamento de móveis planejados, preencha nosso formulário de qualificação:

{link}

Leva poucos minutos e nossa equipe retorna em seguida!`,
      },
      {
        id: "email-formal",
        label: "E-mail — Tom formal",
        template: `Prezado(a),

Agradecemos seu interesse na Móveis Unghero.

Para darmos sequência ao seu orçamento de móveis planejados, solicitamos o preenchimento do formulário de qualificação no link abaixo:

{link}

Após o envio, nossa equipe comercial entrará em contato para alinhar os próximos passos.

Atenciosamente,
Equipe Móveis Unghero`,
      },
    ],
  },
  {
    id: "cadastro-cliente",
    title: "Cadastro — Cliente",
    description:
      "Formulário para o próprio cliente se cadastrar na base (dados pessoais, endereço e imóvel). O cadastro entra direto na lista de clientes.",
    audience: "Cliente final",
    shortPath: "/cadastro",
    adminPath: "/cadastro",
    messages: [
      {
        id: "whatsapp-cadastro",
        label: "WhatsApp — Enviar cadastro",
        template: `Olá, tudo bem?

Somos a Móveis Unghero, marcenaria de alto padrão em Farroupilha/RS.

Para agilizar seu atendimento, faça seu cadastro rápido neste link (leva menos de 2 minutos):

{link}

Assim que recebermos, nossa equipe entra em contato com você!

Equipe Móveis Unghero`,
      },
      {
        id: "whatsapp-cadastro-pos",
        label: "WhatsApp — Após primeiro contato",
        template: `Que bom falar com você! 😊

Para deixarmos seu cadastro completo em nossa base, preencha rapidamente este formulário:

{link}

Qualquer dúvida, estamos à disposição!
Equipe Móveis Unghero`,
      },
      {
        id: "email-cadastro",
        label: "E-mail — Solicitar cadastro",
        template: `Prezado(a),

Agradecemos seu interesse na Móveis Unghero.

Para darmos sequência ao seu atendimento, pedimos o preenchimento do cadastro no link abaixo:

{link}

Após o envio, nossa equipe entrará em contato para alinhar os próximos passos.

Atenciosamente,
Equipe Móveis Unghero`,
      },
    ],
  },
  {
    id: "projetistas-arquitetos",
    title: "Cadastro — Projetistas e Arquitetos",
    description:
      "Formulário para profissionais parceiros se cadastrarem na base da marcenaria para indicações e co-projetos.",
    audience: "Projetista / Arquiteto",
    shortPath: "/cadastro-parceiro",
    adminPath: "/cadastro-parceiro",
    messages: [
      {
        id: "whatsapp-convite",
        label: "WhatsApp — Convite parceria",
        template: `Olá! Tudo bem?

Somos a Móveis Unghero, marcenaria de alto padrão em Farroupilha/RS, e estamos ampliando nossa rede de parceiros profissionais.

Se você é projetista ou arquiteto(a) e tem interesse em indicar clientes ou co-projetar conosco, faça seu cadastro rápido aqui:

{link}

Será um prazer trabalharmos juntos!
Equipe Móveis Unghero`,
      },
      {
        id: "whatsapp-evento",
        label: "WhatsApp — Após evento / networking",
        template: `Olá! Foi um prazer conversar com você.

Conforme combinamos, segue o link para cadastro na nossa base de parceiros (projetistas e arquitetos):

{link}

Assim que recebermos, nossa equipe entra em contato para alinhar as condições de parceria.

Abraço,
Equipe Móveis Unghero`,
      },
      {
        id: "email-parceiro",
        label: "E-mail — Proposta de parceria",
        template: `Prezado(a) profissional,

A Móveis Unghero busca parceiros projetistas e arquitetos para indicações e co-projetos em móveis planejados de alto padrão.

Para fazer parte da nossa rede, preencha o cadastro no link abaixo:

{link}

Retornaremos em breve para apresentar as condições de parceria.

Atenciosamente,
Equipe Móveis Unghero`,
      },
    ],
  },
  {
    id: "cadastro-fornecedor",
    title: "Cadastro — Fornecedores",
    description:
      "Ficha cadastral completa para distribuidores e fabricantes apresentarem catálogo, condições comerciais e logística.",
    audience: "Fornecedor",
    shortPath: "/cadastro-fornecedor",
    adminPath: "/cadastro-fornecedor",
    messages: [
      {
        id: "whatsapp-convite",
        label: "WhatsApp — Convite comercial",
        template: `Olá! Tudo bem?

Somos a Móveis Unghero, marcenaria de alto padrão em Farroupilha/RS, e estamos ampliando nossa rede de fornecedores.

Se você trabalha com materiais, ferragens ou acabamentos para móveis planejados e tem interesse em apresentar seu catálogo, faça o pré-cadastro neste link:

{link}

Nossa equipe comercial analisa o material e retorna em breve.

Equipe Móveis Unghero`,
      },
      {
        id: "whatsapp-feira",
        label: "WhatsApp — Após feira / visita",
        template: `Olá! Foi um prazer conversar com você.

Conforme combinamos, segue o link da ficha cadastral de fornecedores da Móveis Unghero:

{link}

Assim que recebermos, nossa equipe comercial entra em contato para alinhar as próximas etapas.

Abraço,
Equipe Móveis Unghero`,
      },
      {
        id: "email-fornecedor",
        label: "E-mail — Solicitação de cadastro",
        template: `Prezado(a),

A Móveis Unghero busca fornecedores e representantes para materiais e componentes de móveis planejados de alto padrão.

Para apresentar seu catálogo e condições comerciais, preencha a ficha cadastral no link abaixo:

{link}

Retornaremos após a análise do material enviado.

Atenciosamente,
Equipe Móveis Unghero`,
      },
    ],
  },
];

export function getMarketingFormShortUrl(form: MarketingForm) {
  return `${FORMS_SHORT_BASE_URL}${form.shortPath}`;
}

export function getMarketingFormAdminUrl(form: MarketingForm) {
  return `${FORMS_ADMIN_BASE_URL}${form.adminPath}`;
}

export function buildMarketingFormMessage(form: MarketingForm, messageId: string) {
  const message = form.messages.find((item) => item.id === messageId);
  if (!message) return "";
  const link = getMarketingFormShortUrl(form);
  return message.template.replaceAll("{link}", link);
}

export function getMarketingFormById(id: string) {
  return MARKETING_FORMS.find((form) => form.id === id) ?? null;
}
