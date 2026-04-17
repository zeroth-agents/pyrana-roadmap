ALTER TABLE "idea_votes" ADD COLUMN IF NOT EXISTS "value" smallint NOT NULL DEFAULT 1;

-- NOTE: Drizzle does not track this CHECK constraint in its snapshot.
-- It is intentionally hand-written and will be idempotent on re-runs.
DO $$ BEGIN
  ALTER TABLE "idea_votes" ADD CONSTRAINT "idea_votes_value_check" CHECK ("value" IN (-1, 1));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
