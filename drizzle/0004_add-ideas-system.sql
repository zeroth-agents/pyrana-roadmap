-- Migration 0004: Add Ideas System (idempotent)
-- Drops proposals, creates ideas + idea_votes, extends comment_target enum

-- Drop proposals system
ALTER TABLE IF EXISTS "proposals" DROP CONSTRAINT IF EXISTS "proposals_pillar_id_pillars_id_fk";
DROP TABLE IF EXISTS "proposals";
DROP TYPE IF EXISTS "public"."proposal_status";

-- Create idea_status enum (drop first if it has wrong values from a botched rename)
DO $$ BEGIN
  -- If the enum exists but doesn't have 'open', it has the wrong values
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'idea_status')
     AND NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'idea_status') AND enumlabel = 'open')
  THEN
    DROP TYPE "public"."idea_status" CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'idea_status') THEN
    CREATE TYPE "public"."idea_status" AS ENUM('open', 'promoted', 'archived');
  END IF;
END $$;

-- Extend comment_target enum with 'idea'
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'comment_target') AND enumlabel = 'idea') THEN
    ALTER TYPE "public"."comment_target" ADD VALUE 'idea';
  END IF;
END $$;

-- Create ideas table
CREATE TABLE IF NOT EXISTS "ideas" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "pillar_id" uuid,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "author_id" text NOT NULL,
  "author_name" text NOT NULL,
  "priority_score" integer,
  "status" "idea_status" DEFAULT 'open' NOT NULL,
  "promoted_initiative_id" uuid,
  "linear_project_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create idea_votes table
CREATE TABLE IF NOT EXISTS "idea_votes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "idea_id" uuid NOT NULL,
  "user_id" text NOT NULL,
  "user_name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "idea_votes_idea_user_unique" UNIQUE("idea_id","user_id")
);

-- Add foreign keys (skip if they already exist)
DO $$ BEGIN
  ALTER TABLE "ideas" ADD CONSTRAINT "ideas_pillar_id_pillars_id_fk" FOREIGN KEY ("pillar_id") REFERENCES "public"."pillars"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ideas" ADD CONSTRAINT "ideas_promoted_initiative_id_initiatives_id_fk" FOREIGN KEY ("promoted_initiative_id") REFERENCES "public"."initiatives"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "idea_votes" ADD CONSTRAINT "idea_votes_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
