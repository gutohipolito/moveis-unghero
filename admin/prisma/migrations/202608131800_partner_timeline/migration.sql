-- Histórico comercial da ficha de projetistas e arquitetos.
CREATE TABLE IF NOT EXISTS "PartnerTimeline" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerTimeline_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PartnerTimeline_partner_id_data_idx" ON "PartnerTimeline"("partner_id", "data");
CREATE INDEX IF NOT EXISTS "PartnerTimeline_user_id_idx" ON "PartnerTimeline"("user_id");

DO $$ BEGIN
  ALTER TABLE "PartnerTimeline" ADD CONSTRAINT "PartnerTimeline_partner_id_fkey"
    FOREIGN KEY ("partner_id") REFERENCES "ProfessionalPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PartnerTimeline" ADD CONSTRAINT "PartnerTimeline_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
