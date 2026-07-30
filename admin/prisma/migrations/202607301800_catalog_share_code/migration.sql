-- Link público estável: moveisunghero.com.br/catalogos/{share_code}
ALTER TABLE "ProductCatalog" ADD COLUMN IF NOT EXISTS "share_code" TEXT;
ALTER TABLE "ProductCatalog" ADD COLUMN IF NOT EXISTS "shared_at" TIMESTAMP(3);

-- Backfill códigos únicos para catálogos existentes (12 chars, alphabet sem ambíguos)
DO $$
DECLARE
  alphabet TEXT := 'abcdefghijkmnopqrstuvwxyz23456789';
  rec RECORD;
  code TEXT;
  i INT;
  attempts INT;
BEGIN
  FOR rec IN
    SELECT id FROM "ProductCatalog" WHERE "share_code" IS NULL
  LOOP
    attempts := 0;
    LOOP
      attempts := attempts + 1;
      code := '';
      FOR i IN 1..12 LOOP
        code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
      END LOOP;
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM "ProductCatalog" WHERE "share_code" = code
      );
      IF attempts > 20 THEN
        RAISE EXCEPTION 'Não foi possível gerar share_code único para ProductCatalog %', rec.id;
      END IF;
    END LOOP;
    UPDATE "ProductCatalog"
    SET "share_code" = code, "shared_at" = COALESCE("shared_at", NOW())
    WHERE id = rec.id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "ProductCatalog_share_code_key"
  ON "ProductCatalog"("share_code");
