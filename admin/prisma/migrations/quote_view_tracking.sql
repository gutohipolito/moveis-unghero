-- Tracking de abertura do link público do orçamento
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "pdf_view_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "pdf_first_viewed_at" TIMESTAMP(3);
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "pdf_last_viewed_at" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "QuoteView" (
  "id" TEXT NOT NULL,
  "quote_id" TEXT NOT NULL,
  "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "user_agent" TEXT,
  "is_preview" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "QuoteView_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "QuoteView_quote_id_viewed_at_idx" ON "QuoteView"("quote_id", "viewed_at");

ALTER TABLE "QuoteView" DROP CONSTRAINT IF EXISTS "QuoteView_quote_id_fkey";
ALTER TABLE "QuoteView" ADD CONSTRAINT "QuoteView_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
