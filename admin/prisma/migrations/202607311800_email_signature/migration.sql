-- Assinatura de e-mail por caixa (texto puro).
ALTER TABLE "EmailMailbox" ADD COLUMN IF NOT EXISTS "signature_text" TEXT;
