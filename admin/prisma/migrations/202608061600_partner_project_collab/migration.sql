-- CreateTable
CREATE TABLE "PartnerProjectNote" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerProjectNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerProjectFile" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size_bytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerProjectFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartnerProjectNote_project_id_createdAt_idx" ON "PartnerProjectNote"("project_id", "createdAt");

-- CreateIndex
CREATE INDEX "PartnerProjectNote_partner_id_idx" ON "PartnerProjectNote"("partner_id");

-- CreateIndex
CREATE INDEX "PartnerProjectFile_project_id_createdAt_idx" ON "PartnerProjectFile"("project_id", "createdAt");

-- CreateIndex
CREATE INDEX "PartnerProjectFile_partner_id_idx" ON "PartnerProjectFile"("partner_id");

-- AddForeignKey
ALTER TABLE "PartnerProjectNote" ADD CONSTRAINT "PartnerProjectNote_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerProjectNote" ADD CONSTRAINT "PartnerProjectNote_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "ProfessionalPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerProjectFile" ADD CONSTRAINT "PartnerProjectFile_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerProjectFile" ADD CONSTRAINT "PartnerProjectFile_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "ProfessionalPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
