-- Link ProductCatalog to Supplier (ex.: Zen Design)
ALTER TABLE "ProductCatalog" ADD COLUMN IF NOT EXISTS "supplier_id" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProductCatalog_supplier_id_fkey'
  ) THEN
    ALTER TABLE "ProductCatalog"
      ADD CONSTRAINT "ProductCatalog_supplier_id_fkey"
      FOREIGN KEY ("supplier_id") REFERENCES "Supplier"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ProductCatalog_company_id_supplier_id_idx"
  ON "ProductCatalog"("company_id", "supplier_id");
