CREATE TABLE "authorized_invitations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar NOT NULL,
	"coach_id" varchar NOT NULL,
	"invite_token" varchar NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"accepted_at" timestamp,
	CONSTRAINT "authorized_invitations_email_unique" UNIQUE("email"),
	CONSTRAINT "authorized_invitations_coach_id_unique" UNIQUE("coach_id"),
	CONSTRAINT "authorized_invitations_invite_token_unique" UNIQUE("invite_token")
);
--> statement-breakpoint
CREATE TABLE "email_verification_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"token" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "email_verification_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "record_status" varchar DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "coaches" ADD COLUMN "record_status" varchar DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "record_status" varchar DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "squads" ADD COLUMN "record_status" varchar DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "swimmers" ADD COLUMN "record_status" varchar DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "swimming_sessions" ADD COLUMN "session_content_html" text;--> statement-breakpoint
ALTER TABLE "swimming_sessions" ADD COLUMN "record_status" varchar DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_email_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "account_status" varchar DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" varchar DEFAULT 'coach';--> statement-breakpoint
ALTER TABLE "authorized_invitations" ADD CONSTRAINT "authorized_invitations_coach_id_coaches_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."coaches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authorized_invitations" ADD CONSTRAINT "authorized_invitations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coaches" ADD CONSTRAINT "coaches_user_id_unique" UNIQUE("user_id");