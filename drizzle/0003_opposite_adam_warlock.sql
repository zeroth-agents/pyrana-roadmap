ALTER TABLE "initiatives" ADD COLUMN "description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "initiatives" ADD COLUMN "content" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "initiatives" ADD COLUMN "milestones" text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "initiatives" ADD COLUMN "linear_project_lead" text;