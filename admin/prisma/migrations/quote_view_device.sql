-- Dispositivo/SO da última abertura do link do orçamento
ALTER TABLE "QuoteView" ADD COLUMN IF NOT EXISTS "device" TEXT;
ALTER TABLE "QuoteView" ADD COLUMN IF NOT EXISTS "os" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "pdf_last_device" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "pdf_last_os" TEXT;
