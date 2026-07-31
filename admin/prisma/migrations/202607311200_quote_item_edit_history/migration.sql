-- Expand quote item price history to capture full pending-item edits
ALTER TABLE "QuoteItemPriceHistory"
  ADD COLUMN IF NOT EXISTS "descricao_anterior" TEXT,
  ADD COLUMN IF NOT EXISTS "descricao_nova" TEXT,
  ADD COLUMN IF NOT EXISTS "quantidade_anterior" INTEGER,
  ADD COLUMN IF NOT EXISTS "quantidade_nova" INTEGER,
  ADD COLUMN IF NOT EXISTS "subitens_anterior" JSONB,
  ADD COLUMN IF NOT EXISTS "subitens_novo" JSONB;
