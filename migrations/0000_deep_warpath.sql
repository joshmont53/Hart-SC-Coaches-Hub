CREATE TABLE "attendance" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"swimmer_id" varchar NOT NULL,
	"status" varchar NOT NULL,
	"notes" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "coaches" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"first_name" varchar NOT NULL,
	"last_name" varchar NOT NULL,
	"level" varchar NOT NULL,
	"dob" date NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pool_name" varchar NOT NULL,
	"pool_type" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "squads" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"squad_name" varchar NOT NULL,
	"color" varchar DEFAULT '#3B82F6' NOT NULL,
	"primary_coach_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "swimmers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" varchar NOT NULL,
	"last_name" varchar NOT NULL,
	"squad_id" varchar NOT NULL,
	"asa_number" integer NOT NULL,
	"dob" date NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "swimming_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"duration" numeric(4, 2) NOT NULL,
	"pool_id" varchar NOT NULL,
	"squad_id" varchar NOT NULL,
	"lead_coach_id" varchar NOT NULL,
	"second_coach_id" varchar,
	"helper_id" varchar,
	"set_writer_id" varchar NOT NULL,
	"focus" varchar NOT NULL,
	"session_content" text,
	"total_distance" integer DEFAULT 0 NOT NULL,
	"total_front_crawl_swim" integer DEFAULT 0 NOT NULL,
	"total_front_crawl_drill" integer DEFAULT 0 NOT NULL,
	"total_front_crawl_kick" integer DEFAULT 0 NOT NULL,
	"total_front_crawl_pull" integer DEFAULT 0 NOT NULL,
	"total_backstroke_swim" integer DEFAULT 0 NOT NULL,
	"total_backstroke_drill" integer DEFAULT 0 NOT NULL,
	"total_backstroke_kick" integer DEFAULT 0 NOT NULL,
	"total_backstroke_pull" integer DEFAULT 0 NOT NULL,
	"total_breaststroke_swim" integer DEFAULT 0 NOT NULL,
	"total_breaststroke_drill" integer DEFAULT 0 NOT NULL,
	"total_breaststroke_kick" integer DEFAULT 0 NOT NULL,
	"total_breaststroke_pull" integer DEFAULT 0 NOT NULL,
	"total_butterfly_swim" integer DEFAULT 0 NOT NULL,
	"total_butterfly_drill" integer DEFAULT 0 NOT NULL,
	"total_butterfly_kick" integer DEFAULT 0 NOT NULL,
	"total_butterfly_pull" integer DEFAULT 0 NOT NULL,
	"total_im_swim" integer DEFAULT 0 NOT NULL,
	"total_im_drill" integer DEFAULT 0 NOT NULL,
	"total_im_kick" integer DEFAULT 0 NOT NULL,
	"total_im_pull" integer DEFAULT 0 NOT NULL,
	"total_no1_swim" integer DEFAULT 0 NOT NULL,
	"total_no1_drill" integer DEFAULT 0 NOT NULL,
	"total_no1_kick" integer DEFAULT 0 NOT NULL,
	"total_no1_pull" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_session_id_swimming_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."swimming_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_swimmer_id_swimmers_id_fk" FOREIGN KEY ("swimmer_id") REFERENCES "public"."swimmers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coaches" ADD CONSTRAINT "coaches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "squads" ADD CONSTRAINT "squads_primary_coach_id_coaches_id_fk" FOREIGN KEY ("primary_coach_id") REFERENCES "public"."coaches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swimmers" ADD CONSTRAINT "swimmers_squad_id_squads_id_fk" FOREIGN KEY ("squad_id") REFERENCES "public"."squads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swimming_sessions" ADD CONSTRAINT "swimming_sessions_pool_id_locations_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swimming_sessions" ADD CONSTRAINT "swimming_sessions_squad_id_squads_id_fk" FOREIGN KEY ("squad_id") REFERENCES "public"."squads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swimming_sessions" ADD CONSTRAINT "swimming_sessions_lead_coach_id_coaches_id_fk" FOREIGN KEY ("lead_coach_id") REFERENCES "public"."coaches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swimming_sessions" ADD CONSTRAINT "swimming_sessions_second_coach_id_coaches_id_fk" FOREIGN KEY ("second_coach_id") REFERENCES "public"."coaches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swimming_sessions" ADD CONSTRAINT "swimming_sessions_helper_id_coaches_id_fk" FOREIGN KEY ("helper_id") REFERENCES "public"."coaches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swimming_sessions" ADD CONSTRAINT "swimming_sessions_set_writer_id_coaches_id_fk" FOREIGN KEY ("set_writer_id") REFERENCES "public"."coaches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");