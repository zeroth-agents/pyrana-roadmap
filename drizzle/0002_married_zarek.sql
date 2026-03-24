ALTER TABLE "initiatives" ADD COLUMN "linear_project_id" text;--> statement-breakpoint
ALTER TABLE "initiatives" ADD COLUMN "issue_count_total" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "initiatives" ADD COLUMN "issue_count_done" integer DEFAULT 0 NOT NULL;