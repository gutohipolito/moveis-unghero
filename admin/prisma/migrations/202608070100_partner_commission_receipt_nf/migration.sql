-- AlterTable
ALTER TABLE "PartnerCommissionReceipt"
  ADD COLUMN IF NOT EXISTS "parceiro_email" TEXT,
  ADD COLUMN IF NOT EXISTS "parceiro_telefone" TEXT,
  ADD COLUMN IF NOT EXISTS "nota_fiscal_numero" TEXT,
  ADD COLUMN IF NOT EXISTS "nota_fiscal_emitida_em" TIMESTAMP(3);
