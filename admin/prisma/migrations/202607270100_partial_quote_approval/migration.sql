-- Partial quote approval
CREATE TYPE "QuoteItemStatus" AS ENUM ('PENDENTE', 'APROVADO', 'RECUSADO');

CREATE TABLE "QuoteApproval" (
  "id" TEXT PRIMARY KEY,
  "quote_id" TEXT NOT NULL,
  "subtotal" DECIMAL(12,2) NOT NULL,
  "desconto" DECIMAL(12,2) NOT NULL,
  "valor_aprovado" DECIMAL(12,2) NOT NULL,
  "aprovado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "aprovado_por_id" TEXT,
  "observacoes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuoteApproval_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "QuoteApproval_aprovado_por_id_fkey" FOREIGN KEY ("aprovado_por_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "QuoteApproval_quote_id_idx" ON "QuoteApproval"("quote_id");
CREATE INDEX "QuoteApproval_aprovado_em_idx" ON "QuoteApproval"("aprovado_em");

ALTER TABLE "QuoteItem"
  ADD COLUMN "status" "QuoteItemStatus" NOT NULL DEFAULT 'PENDENTE',
  ADD COLUMN "aprovado_em" TIMESTAMP(3),
  ADD COLUMN "aprovado_por_id" TEXT,
  ADD COLUMN "approval_id" TEXT;

ALTER TABLE "QuoteItem"
  ADD CONSTRAINT "QuoteItem_aprovado_por_id_fkey" FOREIGN KEY ("aprovado_por_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "QuoteItem_approval_id_fkey" FOREIGN KEY ("approval_id") REFERENCES "QuoteApproval"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "QuoteItem_quote_id_status_idx" ON "QuoteItem"("quote_id", "status");
CREATE INDEX "QuoteItem_approval_id_idx" ON "QuoteItem"("approval_id");

CREATE TABLE "QuoteItemPriceHistory" (
  "id" TEXT PRIMARY KEY,
  "quote_item_id" TEXT NOT NULL,
  "valor_unitario_anterior" DECIMAL(12,2) NOT NULL,
  "valor_total_anterior" DECIMAL(12,2) NOT NULL,
  "valor_unitario_novo" DECIMAL(12,2) NOT NULL,
  "valor_total_novo" DECIMAL(12,2) NOT NULL,
  "motivo" TEXT,
  "alterado_por_id" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuoteItemPriceHistory_quote_item_id_fkey" FOREIGN KEY ("quote_item_id") REFERENCES "QuoteItem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "QuoteItemPriceHistory_alterado_por_id_fkey" FOREIGN KEY ("alterado_por_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "QuoteItemPriceHistory_quote_item_id_idx" ON "QuoteItemPriceHistory"("quote_item_id");

ALTER TABLE "Environment"
  ADD COLUMN "quote_item_id" TEXT;

CREATE UNIQUE INDEX "Environment_quote_item_id_key" ON "Environment"("quote_item_id");

ALTER TABLE "Environment"
  ADD CONSTRAINT "Environment_quote_item_id_fkey" FOREIGN KEY ("quote_item_id") REFERENCES "QuoteItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: quotes already approved mark all items as approved
INSERT INTO "QuoteApproval" ("id", "quote_id", "subtotal", "desconto", "valor_aprovado", "aprovado_em", "createdAt")
SELECT gen_random_uuid()::text, q."id", q."subtotal", q."desconto", q."valor_final", COALESCE(q."aprovado_em", q."createdAt"), COALESCE(q."aprovado_em", q."createdAt")
FROM "Quote" q
WHERE q."aprovado_em" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "QuoteApproval" qa WHERE qa."quote_id" = q."id");

UPDATE "QuoteItem" qi
SET
  "status" = 'APROVADO',
  "aprovado_em" = q."aprovado_em",
  "approval_id" = qa."id"
FROM "Quote" q
JOIN "QuoteApproval" qa ON qa."quote_id" = q."id"
WHERE qi."quote_id" = q."id"
  AND q."aprovado_em" IS NOT NULL
  AND qi."status" = 'PENDENTE';
