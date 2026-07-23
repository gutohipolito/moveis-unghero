-- Template de proposta (BASICO | COMPARATIVO)
ALTER TABLE "Quote"
  ADD COLUMN IF NOT EXISTS "template_tipo" TEXT NOT NULL DEFAULT 'BASICO';

CREATE INDEX IF NOT EXISTS "Quote_template_tipo_idx" ON "Quote"("template_tipo");
