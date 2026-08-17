-- Histórico automático da ficha do cliente.
CREATE TYPE "ClientTimelineCategory" AS ENUM ('CADASTRO', 'ARQUIVO', 'CONTATO', 'COMERCIAL', 'PROJETO', 'NOTAS');

CREATE TABLE IF NOT EXISTS "ClientTimeline" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "user_id" TEXT,
    "categoria" "ClientTimelineCategory" NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "project_id" TEXT,
    "macro" BOOLEAN NOT NULL DEFAULT true,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientTimeline_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ClientTimeline_client_id_data_idx" ON "ClientTimeline"("client_id", "data");
CREATE INDEX IF NOT EXISTS "ClientTimeline_user_id_idx" ON "ClientTimeline"("user_id");
CREATE INDEX IF NOT EXISTS "ClientTimeline_project_id_idx" ON "ClientTimeline"("project_id");

DO $$ BEGIN
  ALTER TABLE "ClientTimeline" ADD CONSTRAINT "ClientTimeline_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ClientTimeline" ADD CONSTRAINT "ClientTimeline_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ClientTimeline" ADD CONSTRAINT "ClientTimeline_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
