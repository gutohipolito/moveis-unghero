-- Cofre de acessos da empresa (login/senha de sites e serviços)
CREATE TABLE IF NOT EXISTS "AccessCredential" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "titulo" TEXT NOT NULL,
  "categoria" TEXT NOT NULL DEFAULT 'SITE',
  "url" TEXT,
  "usuario" TEXT,
  "senha_enc" TEXT,
  "notas" TEXT,
  "favorito" BOOLEAN NOT NULL DEFAULT false,
  "ordem" INTEGER NOT NULL DEFAULT 0,
  "created_by" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccessCredential_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AccessCredential_company_id_idx" ON "AccessCredential"("company_id");
CREATE INDEX IF NOT EXISTS "AccessCredential_company_id_categoria_idx" ON "AccessCredential"("company_id", "categoria");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AccessCredential_company_id_fkey'
  ) THEN
    ALTER TABLE "AccessCredential"
      ADD CONSTRAINT "AccessCredential_company_id_fkey"
      FOREIGN KEY ("company_id") REFERENCES "Company"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
