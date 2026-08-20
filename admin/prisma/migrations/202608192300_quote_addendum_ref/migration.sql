ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "adendo_ref_quote_id" TEXT;

CREATE INDEX IF NOT EXISTS "Quote_adendo_ref_quote_id_idx" ON "Quote"("adendo_ref_quote_id");

DO $$ BEGIN
  ALTER TABLE "Quote" ADD CONSTRAINT "Quote_adendo_ref_quote_id_fkey" FOREIGN KEY ("adendo_ref_quote_id") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
