import type { EmailMailboxArea, Role } from "@prisma/client";

export const EMAIL_MAILBOX_AREAS: EmailMailboxArea[] = [
  "COMERCIAL",
  "FINANCEIRO",
  "ATENDIMENTO",
];

export const EMAIL_AREA_LABELS: Record<EmailMailboxArea, string> = {
  COMERCIAL: "Comercial",
  FINANCEIRO: "Financeiro",
  ATENDIMENTO: "Atendimento",
};

/** Cargos padrão liberados ao criar uma caixa da área (ADMIN sempre acessa). */
export const DEFAULT_ROLES_BY_AREA: Record<EmailMailboxArea, Role[]> = {
  COMERCIAL: ["COMERCIAL", "PROJETISTA"],
  FINANCEIRO: ["FINANCEIRO"],
  ATENDIMENTO: ["COMERCIAL", "PROJETISTA", "FINANCEIRO"],
};

export const DEFAULT_IMAP_HOST = "mail.moveisunghero.com.br";
export const DEFAULT_IMAP_PORT = 993;
export const DEFAULT_SMTP_HOST = "mail.moveisunghero.com.br";
export const DEFAULT_SMTP_PORT = 465;

export const EMAIL_MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
export const EMAIL_INBOX_PAGE_SIZE = 40;

/** Modelos de assinatura em texto puro por área (editáveis na config da caixa). */
export const SUGGESTED_SIGNATURE_BY_AREA: Record<EmailMailboxArea, string> = {
  ATENDIMENTO: `Atendimento — Móveis Unghero

WhatsApp: (54) 9 9997-1050
www.moveisunghero.com.br
Instagram: @moveisunghero

Rua Cenira Cambruzzi, 155 — Planalto
Farroupilha — RS

Móveis planejados sob medida, feitos na nossa fábrica.`,
  COMERCIAL: `Comercial — Móveis Unghero

WhatsApp: (54) 9 9997-1050
www.moveisunghero.com.br
Instagram: @moveisunghero

Rua Cenira Cambruzzi, 155 — Planalto
Farroupilha — RS

Projetos sob medida, do briefing à montagem.`,
  FINANCEIRO: `Financeiro — Móveis Unghero

WhatsApp: (54) 9 9997-1050
www.moveisunghero.com.br

Rua Cenira Cambruzzi, 155 — Planalto
Farroupilha — RS

CNPJ 13.415.510/0001-71`,
};
