import type { EmailMailboxArea, Role } from "@prisma/client";

export const EMAIL_MAILBOX_AREAS: EmailMailboxArea[] = [
  "COMERCIAL",
  "FINANCEIRO",
  "ATENDIMENTO",
  "FABRICA",
  "DOCUMENTOS",
];

export const EMAIL_AREA_LABELS: Record<EmailMailboxArea, string> = {
  COMERCIAL: "Comercial",
  FINANCEIRO: "Financeiro",
  ATENDIMENTO: "Atendimento",
  FABRICA: "Fábrica",
  DOCUMENTOS: "Documentos",
};

/** Cargos padrão liberados ao criar uma caixa da área (ADMIN sempre acessa). */
export const DEFAULT_ROLES_BY_AREA: Record<EmailMailboxArea, Role[]> = {
  COMERCIAL: ["COMERCIAL", "PROJETISTA"],
  FINANCEIRO: ["FINANCEIRO"],
  ATENDIMENTO: ["COMERCIAL", "PROJETISTA", "FINANCEIRO"],
  FABRICA: ["PRODUCAO"],
  /** Caixa de envio automático — Comercial/Financeiro disparam orçamento/recibo. */
  DOCUMENTOS: ["COMERCIAL", "FINANCEIRO"],
};

export const DEFAULT_IMAP_HOST = "mail.moveisunghero.com.br";
export const DEFAULT_IMAP_PORT = 993;
export const DEFAULT_SMTP_HOST = "mail.moveisunghero.com.br";
export const DEFAULT_SMTP_PORT = 465;

export const EMAIL_MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
export const EMAIL_INBOX_PAGE_SIZE = 40;

/** Pastas lógicas do painel de e-mails (mapeiam para pastas IMAP). */
export type MailFolderKey = "inbox" | "unread" | "spam" | "trash";

export function isMailFolderKey(value: string): value is MailFolderKey {
  return value === "inbox" || value === "unread" || value === "spam" || value === "trash";
}

/** Item da lista de mensagens (compartilhado client/server). */
export type EmailListItem = {
  uid: number;
  seq: number;
  subject: string;
  from: string;
  fromAddress: string;
  date: string | null;
  seen: boolean;
  hasAttachments: boolean;
};
