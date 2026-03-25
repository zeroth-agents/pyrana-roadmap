-- Drop proposals system (removed in Task 1)
ALTER TABLE "proposals" DROP CONSTRAINT IF EXISTS "proposals_pillar_id_pillars_id_fk";--> statement-breakpoint
DROP TABLE IF EXISTS "proposals";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."proposal_status";--> statement-breakpoint

-- Create idea_status enum
CREATE TYPE "public"."idea_status" AS ENUM('open', 'promoted', 'archived');--> statement-breakpoint

-- Extend comment_target enum with 'idea'
ALTER TYPE "public"."comment_target" ADD VALUE 'idea';--> statement-breakpoint

-- Create ideas table
CREATE TABLE "ideas" (
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
);--> statement-breakpoint

-- Create idea_votes table
CREATE TABLE "idea_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idea_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "idea_votes_idea_user_unique" UNIQUE("idea_id","user_id")
);--> statement-breakpoint

-- Add foreign keys
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_pillar_id_pillars_id_fk" FOREIGN KEY ("pillar_id") REFERENCES "public"."pillars"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_promoted_initiative_id_initiatives_id_fk" FOREIGN KEY ("promoted_initiative_id") REFERENCES "public"."initiatives"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idea_votes" ADD CONSTRAINT "idea_votes_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;
