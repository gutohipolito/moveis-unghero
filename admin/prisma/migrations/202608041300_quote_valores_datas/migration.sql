-- Datas comerciais no PDF do orçamento (calculado vs atualizado)
ALTER TABLE "Quote"
  ADD COLUMN IF NOT EXISTS "valores_calculados_em" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "valores_atualizados_em" TIMESTAMP(3);

-- Backfill: calculado = createdAt
UPDATE "Quote"
SET "valores_calculados_em" = "createdAt"
WHERE "valores_calculados_em" IS NULL;

-- Backfill: atualizado = última edição em QuoteItemPriceHistory (se posterior à criação)
UPDATE "Quote" q
SET "valores_atualizados_em" = hist.max_edit
FROM (
  SELECT
    qi."quote_id" AS quote_id,
    MAX(h."createdAt") AS max_edit
  FROM "QuoteItemPriceHistory" h
  INNER JOIN "QuoteItem" qi ON qi."id" = h."quote_item_id"
  GROUP BY qi."quote_id"
) hist
WHERE q."id" = hist.quote_id
  AND q."valores_atualizados_em" IS NULL
  AND hist.max_edit > q."createdAt";

-- Garantir NOT NULL + default para novos registros
ALTER TABLE "Quote"
  ALTER COLUMN "valores_calculados_em" SET DEFAULT CURRENT_TIMESTAMP;

UPDATE "Quote"
SET "valores_calculados_em" = COALESCE("valores_calculados_em", "createdAt", CURRENT_TIMESTAMP);

ALTER TABLE "Quote"
  ALTER COLUMN "valores_calculados_em" SET NOT NULL;
