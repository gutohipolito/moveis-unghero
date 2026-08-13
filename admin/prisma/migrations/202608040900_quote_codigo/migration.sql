-- Código legível do orçamento (ex.: DFCS-060726)
ALTER TABLE "Quote"
  ADD COLUMN IF NOT EXISTS "codigo" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Quote_codigo_key" ON "Quote"("codigo");
