CREATE TABLE "session_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_id" varchar NOT NULL,
	"template_name" varchar NOT NULL,
	"template_description" text,
	"session_content" text NOT NULL,
	"session_content_html" text,
	"record_status" varchar DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "session_templates" ADD CONSTRAINT "session_templates_coach_id_coaches_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."coaches"("id") ON DELETE no action ON UPDATE no action;