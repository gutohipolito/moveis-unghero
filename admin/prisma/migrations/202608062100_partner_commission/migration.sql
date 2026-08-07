-- CreateEnum
CREATE TYPE "PartnerCommissionStatus" AS ENUM ('PENDENTE', 'AGENDADA', 'PAGA', 'CANCELADA');

-- CreateTable
CREATE TABLE "PartnerCommission" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "percentual" DECIMAL(5,2) NOT NULL,
    "base_valor" DECIMAL(12,2) NOT NULL,
    "valor_comissao" DECIMAL(12,2) NOT NULL,
    "status" "PartnerCommissionStatus" NOT NULL DEFAULT 'PENDENTE',
    "data_pagamento_prevista" TIMESTAMP(3),
    "data_pagamento_efetiva" TIMESTAMP(3),
    "observacoes" TEXT,
    "criado_por_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerCommission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerCommissionReceipt" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "commission_id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "parceiro_nome" TEXT NOT NULL,
    "parceiro_tipo" TEXT NOT NULL,
    "parceiro_registro" TEXT,
    "parceiro_escritorio" TEXT,
    "cliente_nome" TEXT NOT NULL,
    "projeto_ref" TEXT,
    "orcamento_codigo" TEXT,
    "orcamento_versao" INTEGER,
    "percentual" DECIMAL(5,2) NOT NULL,
    "base_valor" DECIMAL(12,2) NOT NULL,
    "valor_comissao" DECIMAL(12,2) NOT NULL,
    "data_pagamento_prevista" TIMESTAMP(3),
    "data_pagamento_efetiva" TIMESTAMP(3),
    "emitido_por_id" TEXT,
    "emitido_por_nome" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerCommissionReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartnerCommission_company_id_status_idx" ON "PartnerCommission"("company_id", "status");

-- CreateIndex
CREATE INDEX "PartnerCommission_partner_id_idx" ON "PartnerCommission"("partner_id");

-- CreateIndex
CREATE INDEX "PartnerCommission_project_id_idx" ON "PartnerCommission"("project_id");

-- CreateIndex
CREATE INDEX "PartnerCommission_quote_id_idx" ON "PartnerCommission"("quote_id");

-- CreateIndex
CREATE INDEX "PartnerCommission_createdAt_idx" ON "PartnerCommission"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerCommissionReceipt_company_id_numero_key" ON "PartnerCommissionReceipt"("company_id", "numero");

-- CreateIndex
CREATE INDEX "PartnerCommissionReceipt_company_id_idx" ON "PartnerCommissionReceipt"("company_id");

-- CreateIndex
CREATE INDEX "PartnerCommissionReceipt_commission_id_idx" ON "PartnerCommissionReceipt"("commission_id");

-- AddForeignKey
ALTER TABLE "PartnerCommission" ADD CONSTRAINT "PartnerCommission_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerCommission" ADD CONSTRAINT "PartnerCommission_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "ProfessionalPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerCommission" ADD CONSTRAINT "PartnerCommission_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerCommission" ADD CONSTRAINT "PartnerCommission_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerCommission" ADD CONSTRAINT "PartnerCommission_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerCommissionReceipt" ADD CONSTRAINT "PartnerCommissionReceipt_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerCommissionReceipt" ADD CONSTRAINT "PartnerCommissionReceipt_commission_id_fkey" FOREIGN KEY ("commission_id") REFERENCES "PartnerCommission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
