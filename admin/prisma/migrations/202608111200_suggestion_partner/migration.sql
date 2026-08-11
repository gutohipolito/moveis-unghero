-- Sugestões do portal do parceiro (autor opcional; vínculo com ProfessionalPartner)
ALTER TABLE "Suggestion" ALTER COLUMN "created_by" DROP NOT NULL;

ALTER TABLE "Suggestion" ADD COLUMN IF NOT EXISTS "partner_id" TEXT;

CREATE INDEX IF NOT EXISTS "Suggestion_partner_id_createdAt_idx"
  ON "Suggestion"("partner_id", "createdAt");

DO $$ BEGIN
  ALTER TABLE "Suggestion"
    ADD CONSTRAINT "Suggestion_partner_id_fkey"
    FOREIGN KEY ("partner_id") REFERENCES "ProfessionalPartner"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
