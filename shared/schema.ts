import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  integer,
  date,
  decimal,
  time,
  text,
  boolean,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - Required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - Supports both Replit Auth (legacy) and Email/Password Auth (new)
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  // New fields for email/password authentication
  passwordHash: varchar("password_hash"), // bcrypt hashed password
  isEmailVerified: boolean("is_email_verified").default(false),
  accountStatus: varchar("account_status").default("pending"), // "pending" | "active" | "suspended"
  role: varchar("role").default("coach"), // "coach" | "admin"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Coaches table
export const coaches = pgTable("coaches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").unique().references(() => users.id), // Made unique - one user per coach
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  level: varchar("level").notNull(), // "Level 3" | "Level 2" | "Level 1" | "No qualification"
  dob: date("dob").notNull(),
  recordStatus: varchar("record_status").notNull().default("active"), // "active" | "inactive"
  createdAt: timestamp("created_at").defaultNow(),
});

export const coachesRelations = relations(coaches, ({ one, many }) => ({
  user: one(users, {
    fields: [coaches.userId],
    references: [users.id],
  }),
  primarySquads: many(squads),
  leadSessions: many(swimmingSessions, { relationName: "leadCoach" }),
  secondSessions: many(swimmingSessions, { relationName: "secondCoach" }),
  helperSessions: many(swimmingSessions, { relationName: "helper" }),
  writerSessions: many(swimmingSessions, { relationName: "setWriter" }),
}));

export type Coach = typeof coaches.$inferSelect;
export const insertCoachSchema = createInsertSchema(coaches).omit({ id: true, createdAt: true, recordStatus: true });
export type InsertCoach = z.infer<typeof insertCoachSchema>;

// Schema for updating coach with userId (used when linking user to coach)
export const updateCoachWithUserSchema = createInsertSchema(coaches).pick({ userId: true });
export type UpdateCoachWithUser = z.infer<typeof updateCoachWithUserSchema>;

// Squads table
export const squads = pgTable("squads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  squadName: varchar("squad_name").notNull(),
  color: varchar("color").notNull().default("#3B82F6"),
  primaryCoachId: varchar("primary_coach_id").references(() => coaches.id),
  recordStatus: varchar("record_status").notNull().default("active"), // "active" | "inactive"
  createdAt: timestamp("created_at").defaultNow(),
});

export const squadsRelations = relations(squads, ({ one, many }) => ({
  primaryCoach: one(coaches, {
    fields: [squads.primaryCoachId],
    references: [coaches.id],
  }),
  swimmers: many(swimmers),
  sessions: many(swimmingSessions),
}));

export type Squad = typeof squads.$inferSelect;
export const insertSquadSchema = createInsertSchema(squads).omit({ id: true, createdAt: true, recordStatus: true }).extend({
  color: z.string().optional(),
});
export type InsertSquad = z.infer<typeof insertSquadSchema>;

// Swimmers table
export const swimmers = pgTable("swimmers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  squadId: varchar("squad_id").references(() => squads.id).notNull(),
  asaNumber: integer("asa_number").notNull(),
  dob: date("dob").notNull(),
  recordStatus: varchar("record_status").notNull().default("active"), // "active" | "inactive"
  createdAt: timestamp("created_at").defaultNow(),
});

export const swimmersRelations = relations(swimmers, ({ one, many }) => ({
  squad: one(squads, {
    fields: [swimmers.squadId],
    references: [squads.id],
  }),
  attendance: many(attendance),
}));

export type Swimmer = typeof swimmers.$inferSelect;
export const insertSwimmerSchema = createInsertSchema(swimmers).omit({ id: true, createdAt: true, recordStatus: true });
export type InsertSwimmer = z.infer<typeof insertSwimmerSchema>;

// Locations table
export const locations = pgTable("locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  poolName: varchar("pool_name").notNull(),
  poolType: varchar("pool_type").notNull(), // "SC" (Short Course/25m) | "LC" (Long Course/50m)
  recordStatus: varchar("record_status").notNull().default("active"), // "active" | "inactive"
  createdAt: timestamp("created_at").defaultNow(),
});

export const locationsRelations = relations(locations, ({ many }) => ({
  sessions: many(swimmingSessions),
}));

export type Location = typeof locations.$inferSelect;
export const insertLocationSchema = createInsertSchema(locations).omit({ id: true, createdAt: true, recordStatus: true });
export type InsertLocation = z.infer<typeof insertLocationSchema>;

// Swimming Sessions table
export const swimmingSessions = pgTable("swimming_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionDate: date("session_date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  duration: decimal("duration", { precision: 4, scale: 2 }).notNull(),
  poolId: varchar("pool_id").references(() => locations.id).notNull(),
  squadId: varchar("squad_id").references(() => squads.id).notNull(),
  leadCoachId: varchar("lead_coach_id").references(() => coaches.id).notNull(),
  secondCoachId: varchar("second_coach_id").references(() => coaches.id),
  helperId: varchar("helper_id").references(() => coaches.id),
  setWriterId: varchar("set_writer_id").references(() => coaches.id).notNull(),
  focus: varchar("focus").notNull(), // "Aerobic capacity" | "Anaerobic capacity" | "Speed" | "Technique" | "Recovery" | "Starts & turns"
  
  // Session content (raw text written by coach)
  sessionContent: text("session_content"),
  sessionContentHtml: text("session_content_html"),
  
  // Distance fields
  totalDistance: integer("total_distance").notNull().default(0),
  
  // Front Crawl
  totalFrontCrawlSwim: integer("total_front_crawl_swim").notNull().default(0),
  totalFrontCrawlDrill: integer("total_front_crawl_drill").notNull().default(0),
  totalFrontCrawlKick: integer("total_front_crawl_kick").notNull().default(0),
  totalFrontCrawlPull: integer("total_front_crawl_pull").notNull().default(0),
  
  // Backstroke
  totalBackstrokeSwim: integer("total_backstroke_swim").notNull().default(0),
  totalBackstrokeDrill: integer("total_backstroke_drill").notNull().default(0),
  totalBackstrokeKick: integer("total_backstroke_kick").notNull().default(0),
  totalBackstrokePull: integer("total_backstroke_pull").notNull().default(0),
  
  // Breaststroke
  totalBreaststrokeSwim: integer("total_breaststroke_swim").notNull().default(0),
  totalBreaststrokeDrill: integer("total_breaststroke_drill").notNull().default(0),
  totalBreaststrokeKick: integer("total_breaststroke_kick").notNull().default(0),
  totalBreaststrokePull: integer("total_breaststroke_pull").notNull().default(0),
  
  // Butterfly
  totalButterflySwim: integer("total_butterfly_swim").notNull().default(0),
  totalButterflyDrill: integer("total_butterfly_drill").notNull().default(0),
  totalButterflyKick: integer("total_butterfly_kick").notNull().default(0),
  totalButterflyPull: integer("total_butterfly_pull").notNull().default(0),
  
  // IM (Individual Medley)
  totalIMSwim: integer("total_im_swim").notNull().default(0),
  totalIMDrill: integer("total_im_drill").notNull().default(0),
  totalIMKick: integer("total_im_kick").notNull().default(0),
  totalIMPull: integer("total_im_pull").notNull().default(0),
  
  // No1 (Swimmer's best stroke)
  totalNo1Swim: integer("total_no1_swim").notNull().default(0),
  totalNo1Drill: integer("total_no1_drill").notNull().default(0),
  totalNo1Kick: integer("total_no1_kick").notNull().default(0),
  totalNo1Pull: integer("total_no1_pull").notNull().default(0),
  
  recordStatus: varchar("record_status").notNull().default("active"), // "active" | "inactive"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const swimmingSessionsRelations = relations(swimmingSessions, ({ one, many }) => ({
  pool: one(locations, {
    fields: [swimmingSessions.poolId],
    references: [locations.id],
  }),
  squad: one(squads, {
    fields: [swimmingSessions.squadId],
    references: [squads.id],
  }),
  leadCoach: one(coaches, {
    fields: [swimmingSessions.leadCoachId],
    references: [coaches.id],
    relationName: "leadCoach",
  }),
  secondCoach: one(coaches, {
    fields: [swimmingSessions.secondCoachId],
    references: [coaches.id],
    relationName: "secondCoach",
  }),
  helper: one(coaches, {
    fields: [swimmingSessions.helperId],
    references: [coaches.id],
    relationName: "helper",
  }),
  setWriter: one(coaches, {
    fields: [swimmingSessions.setWriterId],
    references: [coaches.id],
    relationName: "setWriter",
  }),
  attendance: many(attendance),
}));

export type SwimmingSession = typeof swimmingSessions.$inferSelect;
export const insertSwimmingSessionSchema = createInsertSchema(swimmingSessions).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  recordStatus: true
});
export type InsertSwimmingSession = z.infer<typeof insertSwimmingSessionSchema>;

// Attendance table
export const attendance = pgTable("attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => swimmingSessions.id, { onDelete: 'cascade' }).notNull(),
  swimmerId: varchar("swimmer_id").references(() => swimmers.id).notNull(),
  status: varchar("status").notNull(), // "Present" | "First Half Only" | "Second Half Only" | "Absent"
  notes: varchar("notes"), // "Late" | "Very Late" | null (timeliness indicator)
  recordStatus: varchar("record_status").notNull().default("active"), // "active" | "inactive"
  createdAt: timestamp("created_at").defaultNow(),
});

export const attendanceRelations = relations(attendance, ({ one }) => ({
  session: one(swimmingSessions, {
    fields: [attendance.sessionId],
    references: [swimmingSessions.id],
  }),
  swimmer: one(swimmers, {
    fields: [attendance.swimmerId],
    references: [swimmers.id],
  }),
}));

export type Attendance = typeof attendance.$inferSelect;
export const insertAttendanceSchema = createInsertSchema(attendance).omit({ id: true, createdAt: true, recordStatus: true });
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;

// Authorized Invitations table - For invite-based registration
export const authorizedInvitations = pgTable("authorized_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(), // Email invited
  coachId: varchar("coach_id").notNull().unique().references(() => coaches.id), // Pre-linked coach
  inviteToken: varchar("invite_token").notNull().unique(), // Unique token for registration link
  status: varchar("status").notNull().default("pending"), // "pending" | "accepted" | "expired" | "revoked"
  expiresAt: timestamp("expires_at").notNull(), // Token expiration (48 hours)
  createdBy: varchar("created_by").references(() => users.id), // Admin who sent invite
  createdAt: timestamp("created_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
});

export const authorizedInvitationsRelations = relations(authorizedInvitations, ({ one }) => ({
  coach: one(coaches, {
    fields: [authorizedInvitations.coachId],
    references: [coaches.id],
  }),
  creator: one(users, {
    fields: [authorizedInvitations.createdBy],
    references: [users.id],
  }),
}));

export type AuthorizedInvitation = typeof authorizedInvitations.$inferSelect;
export const insertAuthorizedInvitationSchema = createInsertSchema(authorizedInvitations).omit({ 
  id: true, 
  createdAt: true, 
  acceptedAt: true 
});
export type InsertAuthorizedInvitation = z.infer<typeof insertAuthorizedInvitationSchema>;

// Schema for creating invitation via API (only requires email + coachId)
// Server generates token, status, and expiration
export const createInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  coachId: z.string().min(1, 'Coach ID required'),
});
export type CreateInvitation = z.infer<typeof createInvitationSchema>;

// Email Verification Tokens table
export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(), // 24 hours
  createdAt: timestamp("created_at").defaultNow(),
});

export const emailVerificationTokensRelations = relations(emailVerificationTokens, ({ one }) => ({
  user: one(users, {
    fields: [emailVerificationTokens.userId],
    references: [users.id],
  }),
}));

export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export const insertEmailVerificationTokenSchema = createInsertSchema(emailVerificationTokens).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertEmailVerificationToken = z.infer<typeof insertEmailVerificationTokenSchema>;

// ============================================================================
// Authentication Schemas (Email/Password)
// ============================================================================

// Strong password validation (reusable)
const strongPasswordSchema = z.string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character');

// Login schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Registration schema
export const registrationSchema = z.object({
  inviteToken: z.string().min(1, 'Invitation token required'),
  email: z.string().email('Invalid email address'),
  password: strongPasswordSchema,
  passwordConfirm: z.string(),
}).superRefine((data, ctx) => {
  if (data.password !== data.passwordConfirm) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Passwords do not match',
      path: ['passwordConfirm'],
    });
  }
});

export type RegistrationInput = z.infer<typeof registrationSchema>;
