-- AlterTable
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "obs_updated_at" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "obs_updated_by_id" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "obs_updated_by_name" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProjectNoteRead" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectNoteRead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Project_obs_updated_at_idx" ON "Project"("obs_updated_at");
CREATE INDEX IF NOT EXISTS "ProjectNoteRead_user_id_idx" ON "ProjectNoteRead"("user_id");
CREATE INDEX IF NOT EXISTS "ProjectNoteRead_project_id_idx" ON "ProjectNoteRead"("project_id");
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectNoteRead_project_id_user_id_key" ON "ProjectNoteRead"("project_id", "user_id");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Project" ADD CONSTRAINT "Project_obs_updated_by_id_fkey"
    FOREIGN KEY ("obs_updated_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectNoteRead" ADD CONSTRAINT "ProjectNoteRead_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectNoteRead" ADD CONSTRAINT "ProjectNoteRead_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
