-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "EmailDocumentTemplateType" AS ENUM ('QUOTE', 'RECEIPT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "EmailDocumentTemplate" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "type" "EmailDocumentTemplateType" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailDocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmailDocumentTemplate_company_id_idx" ON "EmailDocumentTemplate"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "EmailDocumentTemplate_company_id_type_key" ON "EmailDocumentTemplate"("company_id", "type");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "EmailDocumentTemplate" ADD CONSTRAINT "EmailDocumentTemplate_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
