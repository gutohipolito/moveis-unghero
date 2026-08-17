-- CreateTable
CREATE TABLE IF NOT EXISTS "ProjectChatThread" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3),
    "closedById" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "lastMessagePreview" VARCHAR(180),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectChatThread_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProjectChatMessage" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "author_id" TEXT,
    "author_name" TEXT NOT NULL,
    "author_role" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProjectChatRead" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectChatRead_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProjectChatThread_project_id_key" ON "ProjectChatThread"("project_id");
CREATE INDEX IF NOT EXISTS "ProjectChatThread_company_id_lastMessageAt_idx" ON "ProjectChatThread"("company_id", "lastMessageAt");
CREATE INDEX IF NOT EXISTS "ProjectChatThread_closedAt_idx" ON "ProjectChatThread"("closedAt");
CREATE INDEX IF NOT EXISTS "ProjectChatMessage_thread_id_createdAt_idx" ON "ProjectChatMessage"("thread_id", "createdAt");
CREATE INDEX IF NOT EXISTS "ProjectChatMessage_author_id_idx" ON "ProjectChatMessage"("author_id");
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectChatRead_thread_id_user_id_key" ON "ProjectChatRead"("thread_id", "user_id");
CREATE INDEX IF NOT EXISTS "ProjectChatRead_user_id_idx" ON "ProjectChatRead"("user_id");

DO $$ BEGIN
  ALTER TABLE "ProjectChatThread" ADD CONSTRAINT "ProjectChatThread_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectChatThread" ADD CONSTRAINT "ProjectChatThread_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectChatThread" ADD CONSTRAINT "ProjectChatThread_closedById_fkey"
    FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectChatMessage" ADD CONSTRAINT "ProjectChatMessage_thread_id_fkey"
    FOREIGN KEY ("thread_id") REFERENCES "ProjectChatThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectChatMessage" ADD CONSTRAINT "ProjectChatMessage_author_id_fkey"
    FOREIGN KEY ("author_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectChatRead" ADD CONSTRAINT "ProjectChatRead_thread_id_fkey"
    FOREIGN KEY ("thread_id") REFERENCES "ProjectChatThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectChatRead" ADD CONSTRAINT "ProjectChatRead_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
