CREATE TYPE "public"."comment_target" AS ENUM('initiative', 'pillar');--> statement-breakpoint
CREATE TYPE "public"."lane" AS ENUM('now', 'next', 'backlog');--> statement-breakpoint
CREATE TYPE "public"."proposal_status" AS ENUM('pending', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."size" AS ENUM('S', 'M', 'L');--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_type" "comment_target" NOT NULL,
	"target_id" uuid NOT NULL,
	"body" text NOT NULL,
	"author" text NOT NULL,
	"author_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "initiatives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pillar_id" uuid NOT NULL,
	"title" text NOT NULL,
	"lane" "lane" DEFAULT 'backlog' NOT NULL,
	"size" "size" DEFAULT 'M' NOT NULL,
	"why" text DEFAULT '' NOT NULL,
	"depends_on" uuid[] DEFAULT '{}' NOT NULL,
	"linear_project_url" text,
	"linear_id" text,
	"linear_status" text,
	"linear_assignee" text,
	"linear_synced_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" text NOT NULL,
	"created_by_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal_access_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_oid" text NOT NULL,
	"user_name" text NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	CONSTRAINT "personal_access_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "pillars" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"boundary" text NOT NULL,
	"customer_story" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pillar_id" uuid NOT NULL,
	"title" text NOT NULL,
	"size" "size" DEFAULT 'M' NOT NULL,
	"why" text DEFAULT '' NOT NULL,
	"proposed_by" text NOT NULL,
	"proposed_by_name" text NOT NULL,
	"status" "proposal_status" DEFAULT 'pending' NOT NULL,
	"reviewer_notes" text,
	"resolved_at" timestamp with time zone,
	"resolved_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "initiatives" ADD CONSTRAINT "initiatives_pillar_id_pillars_id_fk" FOREIGN KEY ("pillar_id") REFERENCES "public"."pillars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_pillar_id_pillars_id_fk" FOREIGN KEY ("pillar_id") REFERENCES "public"."pillars"("id") ON DELETE cascade ON UPDATE no action;