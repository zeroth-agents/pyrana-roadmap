ALTER TABLE "idea_votes" ADD COLUMN IF NOT EXISTS "value" smallint NOT NULL DEFAULT 1;

DO $$ BEGIN
  ALTER TABLE "idea_votes" ADD CONSTRAINT "idea_votes_value_check" CHECK ("value" IN (-1, 1));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
