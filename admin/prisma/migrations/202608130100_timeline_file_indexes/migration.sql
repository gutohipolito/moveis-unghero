-- Timeline: join por projeto no live-sync + orderBy data nos cards.
CREATE INDEX IF NOT EXISTS "Timeline_project_id_data_idx" ON "Timeline"("project_id", "data");
CREATE INDEX IF NOT EXISTS "Timeline_user_id_idx" ON "Timeline"("user_id");

-- File: include/findMany por projeto (detalhe, fábrica, portal).
CREATE INDEX IF NOT EXISTS "File_project_id_idx" ON "File"("project_id");
