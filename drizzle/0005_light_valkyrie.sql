DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'idea_status') THEN
    CREATE TYPE "public"."idea_status" AS ENUM('open', 'promoted', 'archived');
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'comment_target') AND enumlabel = 'idea') THEN
    ALTER TYPE "public"."comment_target" ADD VALUE 'idea';
  END IF;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "idea_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idea_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "idea_votes_idea_user_unique" UNIQUE("idea_id","user_id")
);
--> statement-breakpoint
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
	"assignee_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entra_oid" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"linear_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_entra_oid_unique" UNIQUE("entra_oid"),
	CONSTRAINT "users_linear_user_id_unique" UNIQUE("linear_user_id")
);
--> statement-breakpoint
DROP TABLE IF EXISTS "proposals" CASCADE;--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN IF NOT EXISTS "assignee_id" uuid;--> statement-breakpoint
ALTER TABLE "initiatives" ADD COLUMN IF NOT EXISTS "assignee_id" uuid;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "idea_votes" ADD CONSTRAINT "idea_votes_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "ideas" ADD CONSTRAINT "ideas_pillar_id_pillars_id_fk" FOREIGN KEY ("pillar_id") REFERENCES "public"."pillars"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "ideas" ADD CONSTRAINT "ideas_promoted_initiative_id_initiatives_id_fk" FOREIGN KEY ("promoted_initiative_id") REFERENCES "public"."initiatives"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "ideas" ADD CONSTRAINT "ideas_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "initiatives" ADD CONSTRAINT "initiatives_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DROP TYPE IF EXISTS "public"."proposal_status";
