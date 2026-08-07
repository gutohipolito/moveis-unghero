-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "PartnerQuoteCardMode" AS ENUM ('HIDDEN', 'UNVERIFIED', 'VERIFIED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "ProfessionalPartner" ADD COLUMN IF NOT EXISTS "lgpd_aceite" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ProfessionalPartner" ADD COLUMN IF NOT EXISTS "lgpd_aceite_em" TIMESTAMP(3);
ALTER TABLE "ProfessionalPartner" ADD COLUMN IF NOT EXISTS "quote_card_mode" "PartnerQuoteCardMode" NOT NULL DEFAULT 'HIDDEN';
ALTER TABLE "ProfessionalPartner" ADD COLUMN IF NOT EXISTS "cadastro_canal" TEXT;

-- Backfill: cadastro pelo painel (origem PAINEL) → oculto até o operador autorizar.
-- Demais (provável portal / legado sem PAINEL) → verificado para não quebrar PDFs existentes.
UPDATE "ProfessionalPartner"
SET
  "cadastro_canal" = CASE
    WHEN COALESCE("origem", '') = 'PAINEL' THEN 'OPERADOR'
    ELSE 'PORTAL_PUBLICO'
  END,
  "quote_card_mode" = CASE
    WHEN COALESCE("origem", '') = 'PAINEL' THEN 'HIDDEN'::"PartnerQuoteCardMode"
    ELSE 'VERIFIED'::"PartnerQuoteCardMode"
  END
WHERE "cadastro_canal" IS NULL;
