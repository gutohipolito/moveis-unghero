import { prisma } from "@/lib/prisma";
import { DOCUMENT_EMAIL_FOOTER_TEXT } from "@/lib/consentCopy";
import { composeBodyWithSignature } from "@/lib/emailSignature";
import { emailBodyTextToHtml, stripEmailMarkup } from "@/lib/emailBrandedCard";

export type EmailDocumentTemplateType = "QUOTE" | "RECEIPT";

export type EmailDocumentTemplateVars = {
  cliente_nome: string;
  cliente_primeiro_nome: string;
  link: string;
  validade?: string;
  valor?: string;
  numero?: string;
  pin_nota?: string;
};

export type EmailDocumentTemplateContent = {
  type: EmailDocumentTemplateType;
  subject: string;
  body: string;
};

export const EMAIL_DOCUMENT_TEMPLATE_LABELS: Record<
  EmailDocumentTemplateType,
  string
> = {
  QUOTE: "Orçamento",
  RECEIPT: "Recibo",
};

export const EMAIL_DOCUMENT_PLACEHOLDERS: {
  key: keyof EmailDocumentTemplateVars;
  label: string;
  types: EmailDocumentTemplateType[];
}[] = [
  { key: "cliente_nome", label: "Nome completo do cliente", types: ["QUOTE", "RECEIPT"] },
  {
    key: "cliente_primeiro_nome",
    label: "Primeiro nome",
    types: ["QUOTE", "RECEIPT"],
  },
  { key: "link", label: "Link do documento", types: ["QUOTE", "RECEIPT"] },
  { key: "validade", label: "Validade da proposta", types: ["QUOTE"] },
  { key: "valor", label: "Valor do recibo", types: ["RECEIPT"] },
  { key: "numero", label: "Número do recibo (ex.: nº 12)", types: ["RECEIPT"] },
  {
    key: "pin_nota",
    label: "Nota sobre senha (vazio se não houver telefone)",
    types: ["QUOTE", "RECEIPT"],
  },
];

const DEFAULT_QUOTE_SUBJECT =
  "Orçamento Móveis Unghero — {{cliente_nome}}";

const DEFAULT_QUOTE_BODY = [
  "Olá {{cliente_primeiro_nome}}, tudo bem?",
  "",
  "Segue o seu orçamento da Móveis Unghero:",
  "",
  "Validade da proposta: {{validade}}",
  "",
  "Acesse pelo link:",
  "{{link}}",
  "{{pin_nota}}",
  "",
  "Qualquer dúvida, estamos à disposição!",
  "Equipe Móveis Unghero",
].join("\n");

const DEFAULT_RECEIPT_SUBJECT =
  "Recibo Móveis Unghero{{numero}} — {{valor}}";

const DEFAULT_RECEIPT_BODY = [
  "Olá {{cliente_primeiro_nome}}! Segue o recibo de pagamento{{numero}} no valor de {{valor}} emitido pela Móveis Unghero:",
  "",
  "{{link}}",
  "{{pin_nota}}",
].join("\n");

export function getDefaultDocumentTemplate(
  type: EmailDocumentTemplateType
): EmailDocumentTemplateContent {
  if (type === "RECEIPT") {
    return {
      type,
      subject: DEFAULT_RECEIPT_SUBJECT,
      body: DEFAULT_RECEIPT_BODY,
    };
  }
  return {
    type: "QUOTE",
    subject: DEFAULT_QUOTE_SUBJECT,
    body: DEFAULT_QUOTE_BODY,
  };
}

export function getDefaultDocumentTemplates(): EmailDocumentTemplateContent[] {
  return [
    getDefaultDocumentTemplate("QUOTE"),
    getDefaultDocumentTemplate("RECEIPT"),
  ];
}

/** Remove blocos de placeholder vazios e linhas em branco extras. */
function cleanupRendered(text: string): string {
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function renderEmailTemplate(
  template: string,
  vars: Partial<EmailDocumentTemplateVars>
): string {
  let out = template;
  const keys: (keyof EmailDocumentTemplateVars)[] = [
    "cliente_nome",
    "cliente_primeiro_nome",
    "link",
    "validade",
    "valor",
    "numero",
    "pin_nota",
  ];
  for (const key of keys) {
    const value = vars[key] ?? "";
    out = out.split(`{{${key}}}`).join(value);
  }
  // Placeholders desconhecidos → vazio
  out = out.replace(/\{\{[a-z_]+\}\}/gi, "");
  return cleanupRendered(out);
}

export function withDocumentEmailFooter(text: string): string {
  if (text.includes("e-mail automático de documentos")) return text;
  return `${text.trimEnd()}\n\n${DOCUMENT_EMAIL_FOOTER_TEXT}`;
}

export function composeDocumentEmail(input: {
  subjectTemplate: string;
  bodyTemplate: string;
  vars: Partial<EmailDocumentTemplateVars>;
  signature?: string | null;
}): { subject: string; text: string; html: string } {
  const subject = renderEmailTemplate(input.subjectTemplate, input.vars);
  const bodyText = withDocumentEmailFooter(
    renderEmailTemplate(input.bodyTemplate, input.vars)
  );
  const composed = composeBodyWithSignature(
    {
      text: stripEmailMarkup(bodyText),
      html: emailBodyTextToHtml(bodyText),
    },
    input.signature
  );
  return {
    subject,
    text: composed.text,
    html: composed.html,
  };
}

export function sampleDocumentTemplateVars(
  type: EmailDocumentTemplateType
): EmailDocumentTemplateVars {
  if (type === "RECEIPT") {
    return {
      cliente_nome: "Danny Felipe Choinacki dos Santos",
      cliente_primeiro_nome: "Danny",
      link: "https://moveisunghero.com.br/r/exemplo123",
      valor: "R$ 1.250,00",
      numero: " nº 42",
      pin_nota:
        "\nA senha de acesso são os 4 últimos dígitos do teu celular cadastrado.",
    };
  }
  return {
    cliente_nome: "Danny Felipe Choinacki dos Santos",
    cliente_primeiro_nome: "Danny",
    link: "https://moveisunghero.com.br/o/exemplo123",
    validade: "15/08/2026",
    pin_nota:
      "\nSenha para abrir: os 4 últimos dígitos do seu celular cadastrado conosco.",
  };
}

export function buildQuoteEmailVars(input: {
  clientName: string;
  firstName: string;
  link: string;
  validade: string;
  hasPin: boolean;
}): EmailDocumentTemplateVars {
  return {
    cliente_nome: input.clientName,
    cliente_primeiro_nome: input.firstName,
    link: input.link,
    validade: input.validade,
    pin_nota: input.hasPin
      ? "\nSenha para abrir: os 4 últimos dígitos do seu celular cadastrado conosco."
      : "",
  };
}

export function buildReceiptEmailVars(input: {
  clientName: string;
  firstName: string;
  link: string;
  valorLabel: string;
  numeroLabel?: string | null;
  hasPin?: boolean;
}): EmailDocumentTemplateVars {
  const num = input.numeroLabel?.trim();
  return {
    cliente_nome: input.clientName,
    cliente_primeiro_nome: input.firstName,
    link: input.link,
    valor: input.valorLabel,
    numero: num ? ` ${num}` : "",
    pin_nota:
      input.hasPin === false
        ? ""
        : "\nA senha de acesso são os 4 últimos dígitos do teu celular cadastrado.",
  };
}

/** Template salvo da empresa ou padrão Móveis Unghero. */
export async function loadCompanyDocumentTemplate(
  companyId: string,
  type: EmailDocumentTemplateType
): Promise<{ subject: string; body: string }> {
  const row = await prisma.emailDocumentTemplate.findUnique({
    where: { company_id_type: { company_id: companyId, type } },
    select: { subject: true, body: true },
  });
  if (row) return row;
  const def = getDefaultDocumentTemplate(type);
  return { subject: def.subject, body: def.body };
}
