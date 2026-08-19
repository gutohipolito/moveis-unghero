import { PROJECT_STATUS_LABELS } from "@/lib/navLabels";

export const TRANSITION_STATUSES = [
  "APROVADO",
  "CONFERENCIA_TECNICA",
  "PRODUCAO",
  "INSTALACAO",
  "FINALIZADO",
  "PERDIDO",
] as const;

export type TransitionStatus = (typeof TRANSITION_STATUSES)[number];

export type TransitionAudience = "CLIENT" | "PARTNER";

export type TransitionTemplateKey =
  | `${TransitionAudience}:${TransitionStatus}`
  | "PARTNER:COMMISSION";

export type TransitionPlaceholder = {
  key: string;
  label: string;
};

export type TransitionTemplateDef = {
  key: TransitionTemplateKey;
  group: "cliente" | "arquiteto";
  title: string;
  description: string;
  when: string;
  ctaLabel: string;
  defaultEnabled: boolean;
  subject: string;
  body: string;
  placeholders: TransitionPlaceholder[];
};

const STATUS_PLACEHOLDERS: TransitionPlaceholder[] = [
  { key: "destinatario_primeiro_nome", label: "Primeiro nome de quem recebe" },
  { key: "destinatario_nome", label: "Nome completo de quem recebe" },
  { key: "cliente_nome", label: "Nome do cliente do projeto" },
  { key: "etapa_nova", label: "Etapa atual" },
  { key: "etapa_anterior", label: "Etapa anterior" },
  { key: "link", label: "Link do portal" },
];

const COMMISSION_PLACEHOLDERS: TransitionPlaceholder[] = [
  { key: "destinatario_primeiro_nome", label: "Primeiro nome do arquiteto" },
  { key: "destinatario_nome", label: "Nome do arquiteto" },
  { key: "cliente_nome", label: "Nome do cliente" },
  { key: "valor", label: "Valor da comissão" },
  { key: "link", label: "Link das comissões no portal" },
];

function statusLabel(status: TransitionStatus) {
  return PROJECT_STATUS_LABELS[status] ?? status;
}

function clientDefaults(status: TransitionStatus): Pick<
  TransitionTemplateDef,
  "subject" | "body" | "defaultEnabled"
> {
  const etapa = statusLabel(status);
  if (status === "PERDIDO") {
    return {
      defaultEnabled: false,
      subject: "Atualização do seu projeto — Móveis Unghero",
      body: [
        "Olá, {{destinatario_primeiro_nome}}.",
        "",
        "Passando para atualizar o andamento do projeto {{cliente_nome}} na Móveis Unghero.",
        "",
        "Nova etapa: {{etapa_nova}}",
        "Etapa anterior: {{etapa_anterior}}",
        "",
        "Se quiser retomar a conversa, é só responder ou falar conosco pelo WhatsApp.",
        "",
        "{{link}}",
      ].join("\n"),
    };
  }

  const intro: Record<Exclude<TransitionStatus, "PERDIDO">, string> = {
    APROVADO:
      "Boa notícia: o projeto {{cliente_nome}} foi aprovado. A equipe da Móveis Unghero já segue com os próximos passos.",
    CONFERENCIA_TECNICA:
      "O projeto {{cliente_nome}} entrou na conferência técnica. Vamos conferir medidas e detalhes antes da produção.",
    PRODUCAO:
      "O projeto {{cliente_nome}} entrou em produção na Móveis Unghero.",
    INSTALACAO:
      "Chegou a etapa de instalação do projeto {{cliente_nome}}.",
    FINALIZADO:
      "O projeto {{cliente_nome}} foi concluído. Obrigado por escolher a Móveis Unghero.",
  };

  return {
    defaultEnabled: true,
    subject: `Seu projeto: ${etapa} — Móveis Unghero`,
    body: [
      "Olá, {{destinatario_primeiro_nome}}.",
      "",
      intro[status],
      "",
      "Nova etapa: {{etapa_nova}}",
      "Etapa anterior: {{etapa_anterior}}",
      "",
      "Acompanhe pelo portal:",
      "{{link}}",
    ].join("\n"),
  };
}

function partnerDefaults(status: TransitionStatus): Pick<
  TransitionTemplateDef,
  "subject" | "body" | "defaultEnabled"
> {
  const etapa = statusLabel(status);
  return {
    defaultEnabled: true,
    subject: `Projeto atualizado: {{cliente_nome}} — ${etapa}`,
    body: [
      "Olá, {{destinatario_primeiro_nome}}.",
      "",
      "O projeto de {{cliente_nome}} avançou no acompanhamento da Móveis Unghero.",
      "",
      "Nova etapa: {{etapa_nova}}",
      "Etapa anterior: {{etapa_anterior}}",
    ].join("\n"),
  };
}

function buildStatusTemplates(): TransitionTemplateDef[] {
  const out: TransitionTemplateDef[] = [];
  for (const status of TRANSITION_STATUSES) {
    const etapa = statusLabel(status);
    const client = clientDefaults(status);
    out.push({
      key: `CLIENT:${status}`,
      group: "cliente",
      title: `Cliente · ${etapa}`,
      description: `E-mail para o cliente quando o projeto entra em ${etapa.toLowerCase()}.`,
      when: `Dispara ao mudar a etapa do funil para ${etapa}. Só envia se o cliente tiver e-mail real.`,
      ctaLabel: "Acompanhar projeto",
      placeholders: STATUS_PLACEHOLDERS,
      ...client,
    });
    const partner = partnerDefaults(status);
    out.push({
      key: `PARTNER:${status}`,
      group: "arquiteto",
      title: `Arquiteto · ${etapa}`,
      description: `E-mail para o projetista/arquiteto vinculado quando o projeto entra em ${etapa.toLowerCase()}.`,
      when: `Dispara ao mudar a etapa do funil para ${etapa}. Só envia se o parceiro tiver e-mail e estiver ativo.`,
      ctaLabel: "Ver no portal",
      placeholders: STATUS_PLACEHOLDERS,
      ...partner,
    });
  }
  return out;
}

const COMMISSION_TEMPLATE: TransitionTemplateDef = {
  key: "PARTNER:COMMISSION",
  group: "arquiteto",
  title: "Arquiteto · Comissão paga",
  description: "Aviso ao projetista/arquiteto quando a comissão é marcada como paga.",
  when: "Dispara ao registrar o pagamento da comissão no financeiro do parceiro.",
  ctaLabel: "Ver comissões",
  defaultEnabled: true,
  placeholders: COMMISSION_PLACEHOLDERS,
  subject: "Comissão paga — {{cliente_nome}}",
  body: [
    "Olá, {{destinatario_primeiro_nome}}.",
    "",
    "Registramos o pagamento da sua comissão referente a {{cliente_nome}}.",
    "",
    "Valor: {{valor}}",
    "",
    "Acompanhe o detalhe e o comprovante (quando emitido) no portal.",
  ].join("\n"),
};

export const TRANSITION_TEMPLATE_DEFS: TransitionTemplateDef[] = [
  ...buildStatusTemplates(),
  COMMISSION_TEMPLATE,
];

export const TRANSITION_TEMPLATE_KEYS = TRANSITION_TEMPLATE_DEFS.map(
  (d) => d.key
);

export function isTransitionTemplateKey(
  value: string
): value is TransitionTemplateKey {
  return TRANSITION_TEMPLATE_KEYS.includes(value as TransitionTemplateKey);
}

export function getTransitionTemplateDef(key: TransitionTemplateKey) {
  return TRANSITION_TEMPLATE_DEFS.find((d) => d.key === key)!;
}

export function sampleTransitionVars(
  key: TransitionTemplateKey
): Record<string, string> {
  const def = getTransitionTemplateDef(key);
  const status = key.includes(":")
    ? (key.split(":")[1] as TransitionStatus | "COMMISSION")
    : "APROVADO";
  const etapaNova =
    status === "COMMISSION" ? "—" : statusLabel(status as TransitionStatus);
  const etapaAnterior =
    status === "PERDIDO" ? "Negociação" : status === "APROVADO" ? "Orçamento" : "Aprovado";

  const base = {
    destinatario_nome: "Ana Paula Ferreira",
    destinatario_primeiro_nome: "Ana",
    cliente_nome: "Danny Felipe Choinacki dos Santos",
    etapa_nova: etapaNova,
    etapa_anterior: etapaAnterior,
    link: "https://moveisunghero.com.br/cliente/login",
    valor: "R$ 1.250,00",
  };
  if (def.group === "arquiteto") {
    base.link =
      key === "PARTNER:COMMISSION"
        ? "https://moveisunghero.com.br/parceiro/comissoes"
        : "https://moveisunghero.com.br/parceiro/projetos/exemplo";
  }
  return base;
}

export const OTHER_AUTOMATED_EMAILS = [
  {
    title: "Orçamento (PDF)",
    audience: "Cliente",
    note: "Editável em Configurar caixas → Templates.",
  },
  {
    title: "Recibo de pagamento",
    audience: "Cliente",
    note: "Editável em Configurar caixas → Templates.",
  },
  {
    title: "Confirmação de cadastro / briefing",
    audience: "Cliente ou arquiteto",
    note: "Texto fixo (LGPD). Não entra nesta lista.",
  },
  {
    title: "Código de acesso ao portal do parceiro",
    audience: "Arquiteto",
    note: "Código de login. Não é editável.",
  },
] as const;
