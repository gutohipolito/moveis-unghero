-- CreateTable
CREATE TABLE IF NOT EXISTS "ClientContact" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "area" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientContact_pkey" PRIMARY KEY ("id")
);

-- AlterTable Quote
ALTER TABLE "Quote"
  ADD COLUMN IF NOT EXISTS "solicitante_id" TEXT,
  ADD COLUMN IF NOT EXISTS "solicitante_nome" TEXT,
  ADD COLUMN IF NOT EXISTS "solicitante_area" TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS "ClientContact_client_id_idx" ON "ClientContact"("client_id");
CREATE INDEX IF NOT EXISTS "ClientContact_client_id_principal_idx" ON "ClientContact"("client_id", "principal");
CREATE INDEX IF NOT EXISTS "Quote_solicitante_id_idx" ON "Quote"("solicitante_id");

-- ForeignKeys
DO $$ BEGIN
  ALTER TABLE "ClientContact"
    ADD CONSTRAINT "ClientContact_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Quote"
    ADD CONSTRAINT "Quote_solicitante_id_fkey"
    FOREIGN KEY ("solicitante_id") REFERENCES "ClientContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
