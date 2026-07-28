-- Link ShowcaseProduct to Supplier for vitrine by brand
ALTER TABLE "ShowcaseProduct" ADD COLUMN IF NOT EXISTS "supplier_id" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ShowcaseProduct_supplier_id_fkey'
  ) THEN
    ALTER TABLE "ShowcaseProduct"
      ADD CONSTRAINT "ShowcaseProduct_supplier_id_fkey"
      FOREIGN KEY ("supplier_id") REFERENCES "Supplier"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ShowcaseProduct_company_id_supplier_id_idx"
  ON "ShowcaseProduct"("company_id", "supplier_id");
