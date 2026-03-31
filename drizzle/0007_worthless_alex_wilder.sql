DO $$ BEGIN
  CREATE TYPE "public"."attachment_target" AS ENUM('idea', 'initiative');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_type" "attachment_target" NOT NULL,
	"target_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"drive_file_id" text NOT NULL,
	"drive_url" text NOT NULL,
	"drive_folder_id" text,
	"uploaded_by" text NOT NULL,
	"uploaded_by_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
