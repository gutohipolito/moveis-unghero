CREATE TABLE IF NOT EXISTS "EmailTransitionTemplate" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTransitionTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EmailTransitionTemplate_company_id_idx" ON "EmailTransitionTemplate"("company_id");

CREATE UNIQUE INDEX IF NOT EXISTS "EmailTransitionTemplate_company_id_key_key" ON "EmailTransitionTemplate"("company_id", "key");

DO $$ BEGIN
  ALTER TABLE "EmailTransitionTemplate" ADD CONSTRAINT "EmailTransitionTemplate_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
