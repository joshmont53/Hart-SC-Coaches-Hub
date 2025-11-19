CREATE TABLE "coaching_rates" (
	"qualification_level" varchar PRIMARY KEY NOT NULL,
	"hourly_rate" numeric(6, 2) NOT NULL,
	"session_writing_rate" numeric(6, 2) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
