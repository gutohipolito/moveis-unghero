-- Link de indicação do parceiro + atribuição no cadastro frio
ALTER TABLE "ProfessionalPartner"
  ADD COLUMN IF NOT EXISTS "invite_code" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "ProfessionalPartner_invite_code_key"
  ON "ProfessionalPartner"("invite_code");

ALTER TABLE "Client"
  ADD COLUMN IF NOT EXISTS "partner_id" TEXT,
  ADD COLUMN IF NOT EXISTS "partner_attributed_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Client_partner_id_partner_attributed_at_idx"
  ON "Client"("partner_id", "partner_attributed_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Client_partner_id_fkey'
  ) THEN
    ALTER TABLE "Client"
      ADD CONSTRAINT "Client_partner_id_fkey"
      FOREIGN KEY ("partner_id") REFERENCES "ProfessionalPartner"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
