-- Área para caixa de envio automático de documentos (ex.: noreply@ / documentos@).
ALTER TYPE "EmailMailboxArea" ADD VALUE IF NOT EXISTS 'DOCUMENTOS';

-- Opt-in de marketing para parceiros (arquitetos / projetistas).
ALTER TABLE "ProfessionalPartner" ADD COLUMN IF NOT EXISTS "marketing_aceite" BOOLEAN NOT NULL DEFAULT false;
