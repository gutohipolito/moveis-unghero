-- Prazo acordado e prioridade por cômodo no chão de fábrica
CREATE TYPE "ProductionPriority" AS ENUM ('NORMAL', 'PRIORITARIO');

ALTER TABLE "Environment" ADD COLUMN "fila_entrada_em" TIMESTAMP(3);
ALTER TABLE "Environment" ADD COLUMN "data_entrega_acordada" TIMESTAMP(3);
ALTER TABLE "Environment" ADD COLUMN "prioridade_producao" "ProductionPriority" NOT NULL DEFAULT 'NORMAL';

-- Cômodos já em produção: usa createdAt como entrada na fila
UPDATE "Environment"
SET "fila_entrada_em" = "createdAt"
WHERE "fila_entrada_em" IS NULL
  AND "status" IN (
    'PRONTO_PRODUCAO',
    'EM_CORTE',
    'MONTAGEM_FABRICA',
    'PRONTO_ENTREGA',
    'EM_INSTALACAO'
  );
