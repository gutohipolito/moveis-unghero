-- Email mailboxes by area (IMAP/SMTP)
CREATE TYPE "EmailMailboxArea" AS ENUM ('COMERCIAL', 'FINANCEIRO', 'ATENDIMENTO');
CREATE TYPE "EmailOutboundStatus" AS ENUM ('SENT', 'FAILED');

CREATE TABLE IF NOT EXISTS "EmailMailbox" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "area" "EmailMailboxArea" NOT NULL,
  "address" TEXT NOT NULL,
  "display_name" TEXT NOT NULL,
  "imap_host" TEXT NOT NULL DEFAULT 'mail.moveisunghero.com.br',
  "imap_port" INTEGER NOT NULL DEFAULT 993,
  "smtp_host" TEXT NOT NULL DEFAULT 'mail.moveisunghero.com.br',
  "smtp_port" INTEGER NOT NULL DEFAULT 465,
  "password_enc" TEXT NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailMailbox_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EmailMailboxAccess" (
  "id" TEXT NOT NULL,
  "mailbox_id" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  CONSTRAINT "EmailMailboxAccess_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EmailOutboundLog" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "mailbox_id" TEXT NOT NULL,
  "project_id" TEXT,
  "quote_id" TEXT,
  "receipt_id" TEXT,
  "to_address" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "status" "EmailOutboundStatus" NOT NULL DEFAULT 'SENT',
  "error" TEXT,
  "sent_by_id" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailOutboundLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmailMailbox_company_id_address_key" ON "EmailMailbox"("company_id", "address");
CREATE INDEX IF NOT EXISTS "EmailMailbox_company_id_area_idx" ON "EmailMailbox"("company_id", "area");
CREATE INDEX IF NOT EXISTS "EmailMailbox_company_id_ativo_idx" ON "EmailMailbox"("company_id", "ativo");

CREATE UNIQUE INDEX IF NOT EXISTS "EmailMailboxAccess_mailbox_id_role_key" ON "EmailMailboxAccess"("mailbox_id", "role");
CREATE INDEX IF NOT EXISTS "EmailMailboxAccess_mailbox_id_idx" ON "EmailMailboxAccess"("mailbox_id");

CREATE INDEX IF NOT EXISTS "EmailOutboundLog_company_id_idx" ON "EmailOutboundLog"("company_id");
CREATE INDEX IF NOT EXISTS "EmailOutboundLog_mailbox_id_idx" ON "EmailOutboundLog"("mailbox_id");
CREATE INDEX IF NOT EXISTS "EmailOutboundLog_project_id_idx" ON "EmailOutboundLog"("project_id");
CREATE INDEX IF NOT EXISTS "EmailOutboundLog_quote_id_idx" ON "EmailOutboundLog"("quote_id");
CREATE INDEX IF NOT EXISTS "EmailOutboundLog_receipt_id_idx" ON "EmailOutboundLog"("receipt_id");
CREATE INDEX IF NOT EXISTS "EmailOutboundLog_createdAt_idx" ON "EmailOutboundLog"("createdAt");

DO $$ BEGIN
  ALTER TABLE "EmailMailbox" ADD CONSTRAINT "EmailMailbox_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "EmailMailboxAccess" ADD CONSTRAINT "EmailMailboxAccess_mailbox_id_fkey"
    FOREIGN KEY ("mailbox_id") REFERENCES "EmailMailbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "EmailOutboundLog" ADD CONSTRAINT "EmailOutboundLog_mailbox_id_fkey"
    FOREIGN KEY ("mailbox_id") REFERENCES "EmailMailbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "EmailOutboundLog" ADD CONSTRAINT "EmailOutboundLog_sent_by_id_fkey"
    FOREIGN KEY ("sent_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
