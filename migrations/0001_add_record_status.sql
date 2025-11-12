-- Add record_status column to coaches table
ALTER TABLE "coaches" ADD COLUMN "record_status" varchar DEFAULT 'active' NOT NULL;
--> statement-breakpoint

-- Add record_status column to swimmers table
ALTER TABLE "swimmers" ADD COLUMN "record_status" varchar DEFAULT 'active' NOT NULL;
--> statement-breakpoint

-- Add record_status column to locations table
ALTER TABLE "locations" ADD COLUMN "record_status" varchar DEFAULT 'active' NOT NULL;
--> statement-breakpoint

-- Add record_status column to squads table
ALTER TABLE "squads" ADD COLUMN "record_status" varchar DEFAULT 'active' NOT NULL;
--> statement-breakpoint

-- Add record_status column to swimming_sessions table
ALTER TABLE "swimming_sessions" ADD COLUMN "record_status" varchar DEFAULT 'active' NOT NULL;
--> statement-breakpoint

-- Add record_status column to attendance table
ALTER TABLE "attendance" ADD COLUMN "record_status" varchar DEFAULT 'active' NOT NULL;
--> statement-breakpoint

-- Update all existing records to have active status
UPDATE "coaches" SET "record_status" = 'active' WHERE "record_status" IS NULL;
--> statement-breakpoint
UPDATE "swimmers" SET "record_status" = 'active' WHERE "record_status" IS NULL;
--> statement-breakpoint
UPDATE "locations" SET "record_status" = 'active' WHERE "record_status" IS NULL;
--> statement-breakpoint
UPDATE "squads" SET "record_status" = 'active' WHERE "record_status" IS NULL;
--> statement-breakpoint
UPDATE "swimming_sessions" SET "record_status" = 'active' WHERE "record_status" IS NULL;
--> statement-breakpoint
UPDATE "attendance" SET "record_status" = 'active' WHERE "record_status" IS NULL;
