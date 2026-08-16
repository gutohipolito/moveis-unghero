-- Imagem nos itens salvos do orçamento + vínculo opcional de detalhe com estoque.
ALTER TABLE "QuoteItemPreset" ADD COLUMN IF NOT EXISTS "imagem_url" TEXT;

ALTER TABLE "QuoteDetailPreset" ADD COLUMN IF NOT EXISTS "imagem_url" TEXT;
ALTER TABLE "QuoteDetailPreset" ADD COLUMN IF NOT EXISTS "inventory_item_id" TEXT;

CREATE INDEX IF NOT EXISTS "QuoteDetailPreset_company_id_inventory_item_id_idx"
  ON "QuoteDetailPreset"("company_id", "inventory_item_id");

DO $$ BEGIN
  ALTER TABLE "QuoteDetailPreset" ADD CONSTRAINT "QuoteDetailPreset_inventory_item_id_fkey"
    FOREIGN KEY ("inventory_item_id") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
