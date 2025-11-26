// Referenced from javascript_database and javascript_log_in_with_replit blueprints
import {
  users,
  coaches,
  squads,
  swimmers,
  locations,
  swimmingSessions,
  attendance,
  authorizedInvitations,
  emailVerificationTokens,
  competitions,
  competitionCoaching,
  coachingRates,
  sessionTemplates,
  drills,
  type User,
  type UpsertUser,
  type Coach,
  type InsertCoach,
  type Squad,
  type InsertSquad,
  type Swimmer,
  type InsertSwimmer,
  type Location,
  type InsertLocation,
  type SwimmingSession,
  type InsertSwimmingSession,
  type Attendance,
  type InsertAttendance,
  type AuthorizedInvitation,
  type InsertAuthorizedInvitation,
  type EmailVerificationToken,
  type InsertEmailVerificationToken,
  type Competition,
  type InsertCompetition,
  type CompetitionCoaching,
  type InsertCompetitionCoaching,
  type CoachingRate,
  type InsertCoachingRate,
  type SessionTemplate,
  type InsertSessionTemplate,
  type Drill,
  type InsertDrill,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth + Email/Password Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(user: UpsertUser): Promise<User>;
  
  // Coach operations
  getCoaches(): Promise<Coach[]>;
  getCoach(id: string): Promise<Coach | undefined>;
  getCoachByUserId(userId: string): Promise<Coach | undefined>;
  createCoach(coach: InsertCoach): Promise<Coach>;
  updateCoach(id: string, coach: Partial<InsertCoach>): Promise<Coach>;
  linkUserToCoach(coachId: string, userId: string): Promise<void>;
  deleteCoach(id: string): Promise<void>;
  
  // Squad operations
  getSquads(): Promise<Squad[]>;
  getSquad(id: string): Promise<Squad | undefined>;
  createSquad(squad: InsertSquad): Promise<Squad>;
  updateSquad(id: string, squad: Partial<InsertSquad>): Promise<Squad>;
  deleteSquad(id: string): Promise<void>;
  
  // Swimmer operations
  getSwimmers(): Promise<Swimmer[]>;
  getSwimmer(id: string): Promise<Swimmer | undefined>;
  createSwimmer(swimmer: InsertSwimmer): Promise<Swimmer>;
  updateSwimmer(id: string, swimmer: Partial<InsertSwimmer>): Promise<Swimmer>;
  deleteSwimmer(id: string): Promise<void>;
  bulkUpdateSwimmerSquad(swimmerIds: string[], newSquadId: string): Promise<Swimmer[]>;
  
  // Location operations
  getLocations(): Promise<Location[]>;
  getLocation(id: string): Promise<Location | undefined>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: string, location: Partial<InsertLocation>): Promise<Location>;
  deleteLocation(id: string): Promise<void>;
  
  // Session operations
  getSessions(): Promise<SwimmingSession[]>;
  getSession(id: string): Promise<SwimmingSession | undefined>;
  getSessionWithAttendance(id: string): Promise<{ session: SwimmingSession; attendance: Attendance[] } | undefined>;
  createSession(session: InsertSwimmingSession): Promise<SwimmingSession>;
  updateSession(id: string, session: Partial<InsertSwimmingSession>): Promise<SwimmingSession>;
  deleteSession(id: string): Promise<void>;
  
  // Attendance operations
  getAttendanceBySession(sessionId: string): Promise<Attendance[]>;
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  deleteAttendanceBySession(sessionId: string): Promise<void>;
  
  // Invitation operations (for email/password auth)
  createInvitation(invitation: InsertAuthorizedInvitation): Promise<AuthorizedInvitation>;
  getInvitationByToken(token: string): Promise<AuthorizedInvitation | undefined>;
  getInvitationByEmail(email: string): Promise<AuthorizedInvitation | undefined>;
  updateInvitationStatus(id: string, status: string, acceptedAt?: Date): Promise<AuthorizedInvitation>;
  claimInvitation(id: string): Promise<AuthorizedInvitation>;
  revertInvitationToPending(id: string): Promise<void>;
  getAllInvitations(): Promise<AuthorizedInvitation[]>;
  
  // Email verification operations
  createVerificationToken(token: InsertEmailVerificationToken): Promise<EmailVerificationToken>;
  getVerificationToken(token: string): Promise<EmailVerificationToken | undefined>;
  deleteVerificationToken(id: string): Promise<void>;
  deleteVerificationTokensForUser(userId: string): Promise<void>;
  
  // Competition operations (NEW - No impact on existing functionality)
  getCompetitions(): Promise<Competition[]>;
  getCompetition(id: string): Promise<Competition | undefined>;
  createCompetition(competition: InsertCompetition): Promise<Competition>;
  updateCompetition(id: string, competition: Partial<InsertCompetition>): Promise<Competition>;
  deleteCompetition(id: string): Promise<void>;
  
  // Competition Coaching operations (NEW - No impact on existing functionality)
  getCompetitionCoachingByCompetition(competitionId: string): Promise<CompetitionCoaching[]>;
  getAllCompetitionCoaching(): Promise<CompetitionCoaching[]>;
  createCompetitionCoaching(coaching: InsertCompetitionCoaching): Promise<CompetitionCoaching>;
  deleteCompetitionCoachingByCompetition(competitionId: string): Promise<void>;
  deleteCompetitionCoaching(id: string): Promise<void>;
  
  // Coaching Rates operations (NEW - No impact on existing functionality)
  getAllCoachingRates(): Promise<CoachingRate[]>;
  getCoachingRate(qualificationLevel: string): Promise<CoachingRate | undefined>;
  updateCoachingRate(qualificationLevel: string, rate: Partial<InsertCoachingRate>): Promise<CoachingRate>;
  
  // Session Template operations (Session Library Feature - No impact on existing functionality)
  getSessionTemplates(): Promise<SessionTemplate[]>;
  getSessionTemplate(id: string): Promise<SessionTemplate | undefined>;
  createSessionTemplate(template: InsertSessionTemplate): Promise<SessionTemplate>;
  updateSessionTemplate(id: string, template: Partial<InsertSessionTemplate>): Promise<SessionTemplate>;
  deleteSessionTemplate(id: string): Promise<void>;
  
  // Drill operations (Drills Library Feature - No impact on existing functionality)
  getDrills(): Promise<Drill[]>;
  getDrill(id: string): Promise<Drill | undefined>;
  createDrill(drill: InsertDrill): Promise<Drill>;
  updateDrill(id: string, drill: Partial<InsertDrill>): Promise<Drill>;
  deleteDrill(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // First try to find existing user by email
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, userData.email!));
    
    if (existingUser) {
      // Update existing user
      const [user] = await db
        .update(users)
        .set({
          ...userData,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUser.id))
        .returning();
      return user;
    }
    
    // Insert new user
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Coach operations
  async getCoaches(): Promise<Coach[]> {
    return await db.select().from(coaches).where(eq(coaches.recordStatus, 'active'));
  }

  async getCoach(id: string): Promise<Coach | undefined> {
    const [coach] = await db.select().from(coaches).where(and(eq(coaches.id, id), eq(coaches.recordStatus, 'active')));
    return coach;
  }

  async getCoachByUserId(userId: string): Promise<Coach | undefined> {
    const [coach] = await db.select().from(coaches).where(and(eq(coaches.userId, userId), eq(coaches.recordStatus, 'active')));
    return coach;
  }

  async createCoach(coach: InsertCoach): Promise<Coach> {
    const [newCoach] = await db.insert(coaches).values(coach).returning();
    return newCoach;
  }

  async updateCoach(id: string, coach: Partial<InsertCoach>): Promise<Coach> {
    const [updatedCoach] = await db
      .update(coaches)
      .set(coach)
      .where(eq(coaches.id, id))
      .returning();
    if (!updatedCoach) {
      throw new Error("Coach not found");
    }
    return updatedCoach;
  }

  async linkUserToCoach(coachId: string, userId: string): Promise<void> {
    const result = await db
      .update(coaches)
      .set({ userId })
      .where(eq(coaches.id, coachId))
      .returning();
    if (result.length === 0) {
      throw new Error("Coach not found");
    }
  }

  async deleteCoach(id: string): Promise<void> {
    const result = await db
      .update(coaches)
      .set({ recordStatus: 'inactive' })
      .where(eq(coaches.id, id))
      .returning();
    if (result.length === 0) {
      throw new Error("Coach not found");
    }
  }

  // Squad operations
  async getSquads(): Promise<Squad[]> {
    return await db.select().from(squads).where(eq(squads.recordStatus, 'active'));
  }

  async getSquad(id: string): Promise<Squad | undefined> {
    const [squad] = await db.select().from(squads).where(and(eq(squads.id, id), eq(squads.recordStatus, 'active')));
    return squad;
  }

  async createSquad(squad: InsertSquad): Promise<Squad> {
    const [newSquad] = await db.insert(squads).values(squad).returning();
    return newSquad;
  }

  async updateSquad(id: string, squad: Partial<InsertSquad>): Promise<Squad> {
    const [updatedSquad] = await db
      .update(squads)
      .set(squad)
      .where(eq(squads.id, id))
      .returning();
    if (!updatedSquad) {
      throw new Error("Squad not found");
    }
    return updatedSquad;
  }

  async deleteSquad(id: string): Promise<void> {
    const result = await db
      .update(squads)
      .set({ recordStatus: 'inactive' })
      .where(eq(squads.id, id))
      .returning();
    if (result.length === 0) {
      throw new Error("Squad not found");
    }
  }

  // Swimmer operations
  async getSwimmers(): Promise<Swimmer[]> {
    return await db.select().from(swimmers).where(eq(swimmers.recordStatus, 'active'));
  }

  async getSwimmer(id: string): Promise<Swimmer | undefined> {
    const [swimmer] = await db.select().from(swimmers).where(and(eq(swimmers.id, id), eq(swimmers.recordStatus, 'active')));
    return swimmer;
  }

  async createSwimmer(swimmer: InsertSwimmer): Promise<Swimmer> {
    const [newSwimmer] = await db.insert(swimmers).values(swimmer).returning();
    return newSwimmer;
  }

  async updateSwimmer(id: string, swimmer: Partial<InsertSwimmer>): Promise<Swimmer> {
    const [updatedSwimmer] = await db
      .update(swimmers)
      .set(swimmer)
      .where(eq(swimmers.id, id))
      .returning();
    if (!updatedSwimmer) {
      throw new Error("Swimmer not found");
    }
    return updatedSwimmer;
  }

  async deleteSwimmer(id: string): Promise<void> {
    const result = await db
      .update(swimmers)
      .set({ recordStatus: 'inactive' })
      .where(eq(swimmers.id, id))
      .returning();
    if (result.length === 0) {
      throw new Error("Swimmer not found");
    }
  }

  async bulkUpdateSwimmerSquad(swimmerIds: string[], newSquadId: string): Promise<Swimmer[]> {
    if (swimmerIds.length === 0) {
      return [];
    }
    const updatedSwimmers = await db
      .update(swimmers)
      .set({ squadId: newSquadId })
      .where(inArray(swimmers.id, swimmerIds))
      .returning();
    return updatedSwimmers;
  }

  // Location operations
  async getLocations(): Promise<Location[]> {
    return await db.select().from(locations).where(eq(locations.recordStatus, 'active'));
  }

  async getLocation(id: string): Promise<Location | undefined> {
    const [location] = await db.select().from(locations).where(and(eq(locations.id, id), eq(locations.recordStatus, 'active')));
    return location;
  }

  async createLocation(location: InsertLocation): Promise<Location> {
    const [newLocation] = await db.insert(locations).values(location).returning();
    return newLocation;
  }

  async updateLocation(id: string, location: Partial<InsertLocation>): Promise<Location> {
    const [updatedLocation] = await db
      .update(locations)
      .set(location)
      .where(eq(locations.id, id))
      .returning();
    if (!updatedLocation) {
      throw new Error("Location not found");
    }
    return updatedLocation;
  }

  async deleteLocation(id: string): Promise<void> {
    const result = await db
      .update(locations)
      .set({ recordStatus: 'inactive' })
      .where(eq(locations.id, id))
      .returning();
    if (result.length === 0) {
      throw new Error("Location not found");
    }
  }

  // Session operations
  async getSessions(): Promise<SwimmingSession[]> {
    return await db.select().from(swimmingSessions).where(eq(swimmingSessions.recordStatus, 'active'));
  }

  async getSession(id: string): Promise<SwimmingSession | undefined> {
    const [session] = await db.select().from(swimmingSessions).where(and(eq(swimmingSessions.id, id), eq(swimmingSessions.recordStatus, 'active')));
    return session;
  }

  async getSessionWithAttendance(id: string): Promise<{ session: SwimmingSession; attendance: Attendance[] } | undefined> {
    const [session] = await db.select().from(swimmingSessions).where(and(eq(swimmingSessions.id, id), eq(swimmingSessions.recordStatus, 'active')));
    if (!session) {
      return undefined;
    }
    const attendanceRecords = await db.select().from(attendance).where(and(eq(attendance.sessionId, id), eq(attendance.recordStatus, 'active')));
    return { session, attendance: attendanceRecords };
  }

  async createSession(session: InsertSwimmingSession): Promise<SwimmingSession> {
    const [newSession] = await db.insert(swimmingSessions).values(session).returning();
    return newSession;
  }

  async updateSession(id: string, session: Partial<InsertSwimmingSession>): Promise<SwimmingSession> {
    const [updatedSession] = await db
      .update(swimmingSessions)
      .set({ ...session, updatedAt: new Date() })
      .where(eq(swimmingSessions.id, id))
      .returning();
    if (!updatedSession) {
      throw new Error("Session not found");
    }
    return updatedSession;
  }

  async deleteSession(id: string): Promise<void> {
    // Soft delete the session
    const result = await db
      .update(swimmingSessions)
      .set({ recordStatus: 'inactive' })
      .where(eq(swimmingSessions.id, id))
      .returning();
    if (result.length === 0) {
      throw new Error("Session not found");
    }
    
    // Also soft delete all associated attendance records
    await db
      .update(attendance)
      .set({ recordStatus: 'inactive' })
      .where(eq(attendance.sessionId, id));
  }

  // Attendance operations
  async getAttendanceBySession(sessionId: string): Promise<Attendance[]> {
    return await db.select().from(attendance).where(and(eq(attendance.sessionId, sessionId), eq(attendance.recordStatus, 'active')));
  }

  async createAttendance(attendanceRecord: InsertAttendance): Promise<Attendance> {
    const [newAttendance] = await db.insert(attendance).values(attendanceRecord).returning();
    return newAttendance;
  }

  async deleteAttendanceBySession(sessionId: string): Promise<void> {
    await db
      .update(attendance)
      .set({ recordStatus: 'inactive' })
      .where(eq(attendance.sessionId, sessionId));
  }

  // New Email/Password Auth operations
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  // Invitation operations
  async createInvitation(invitation: InsertAuthorizedInvitation): Promise<AuthorizedInvitation> {
    const [newInvitation] = await db.insert(authorizedInvitations).values(invitation).returning();
    return newInvitation;
  }

  async getInvitationByToken(token: string): Promise<AuthorizedInvitation | undefined> {
    const [invitation] = await db.select().from(authorizedInvitations).where(eq(authorizedInvitations.inviteToken, token));
    return invitation;
  }

  async getInvitationByEmail(email: string): Promise<AuthorizedInvitation | undefined> {
    const [invitation] = await db.select().from(authorizedInvitations).where(eq(authorizedInvitations.email, email));
    return invitation;
  }

  async updateInvitationStatus(id: string, status: string, acceptedAt?: Date): Promise<AuthorizedInvitation> {
    const [updatedInvitation] = await db
      .update(authorizedInvitations)
      .set({ status, acceptedAt })
      .where(eq(authorizedInvitations.id, id))
      .returning();
    if (!updatedInvitation) {
      throw new Error("Invitation not found");
    }
    return updatedInvitation;
  }

  // Atomically claim an invitation (only succeeds if status is 'pending')
  async claimInvitation(id: string): Promise<AuthorizedInvitation> {
    const [claimedInvitation] = await db
      .update(authorizedInvitations)
      .set({ status: 'processing' })
      .where(and(
        eq(authorizedInvitations.id, id),
        eq(authorizedInvitations.status, 'pending')
      ))
      .returning();
    
    if (!claimedInvitation) {
      throw new Error("Invitation not available (already claimed or invalid status)");
    }
    
    return claimedInvitation;
  }

  // Revert invitation back to pending (for error recovery)
  async revertInvitationToPending(id: string): Promise<void> {
    await db
      .update(authorizedInvitations)
      .set({ status: 'pending' })
      .where(and(
        eq(authorizedInvitations.id, id),
        eq(authorizedInvitations.status, 'processing')
      ));
  }

  async getAllInvitations(): Promise<AuthorizedInvitation[]> {
    return await db.select().from(authorizedInvitations);
  }

  // Email verification operations
  async createVerificationToken(tokenData: InsertEmailVerificationToken): Promise<EmailVerificationToken> {
    const [token] = await db.insert(emailVerificationTokens).values(tokenData).returning();
    return token;
  }

  async getVerificationToken(token: string): Promise<EmailVerificationToken | undefined> {
    const [verificationToken] = await db.select().from(emailVerificationTokens).where(eq(emailVerificationTokens.token, token));
    return verificationToken;
  }

  async deleteVerificationToken(id: string): Promise<void> {
    await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.id, id));
  }
  
  async deleteVerificationTokensForUser(userId: string): Promise<void> {
    await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, userId));
  }

  // ============================================================================
  // Competition operations (NEW - No impact on existing functionality)
  // ============================================================================

  async getCompetitions(): Promise<Competition[]> {
    return await db.select().from(competitions).where(eq(competitions.recordStatus, 'active'));
  }

  async getCompetition(id: string): Promise<Competition | undefined> {
    const [competition] = await db.select().from(competitions).where(and(eq(competitions.id, id), eq(competitions.recordStatus, 'active')));
    return competition;
  }

  async createCompetition(competition: InsertCompetition): Promise<Competition> {
    const [newCompetition] = await db.insert(competitions).values(competition).returning();
    return newCompetition;
  }

  async updateCompetition(id: string, competition: Partial<InsertCompetition>): Promise<Competition> {
    const [updatedCompetition] = await db
      .update(competitions)
      .set(competition)
      .where(eq(competitions.id, id))
      .returning();
    if (!updatedCompetition) {
      throw new Error("Competition not found");
    }
    return updatedCompetition;
  }

  async deleteCompetition(id: string): Promise<void> {
    // Soft delete the competition
    const result = await db
      .update(competitions)
      .set({ recordStatus: 'inactive' })
      .where(eq(competitions.id, id))
      .returning();
    if (result.length === 0) {
      throw new Error("Competition not found");
    }
    
    // Also soft delete all associated competition coaching records
    // (Note: Database CASCADE DELETE on FK handles hard deletes, but we use soft deletes)
    await db
      .update(competitionCoaching)
      .set({ recordStatus: 'inactive' })
      .where(eq(competitionCoaching.competitionId, id));
  }

  // ============================================================================
  // Competition Coaching operations (NEW - No impact on existing functionality)
  // ============================================================================

  async getCompetitionCoachingByCompetition(competitionId: string): Promise<CompetitionCoaching[]> {
    return await db.select().from(competitionCoaching).where(and(eq(competitionCoaching.competitionId, competitionId), eq(competitionCoaching.recordStatus, 'active')));
  }

  async getAllCompetitionCoaching(): Promise<CompetitionCoaching[]> {
    return await db.select().from(competitionCoaching).where(eq(competitionCoaching.recordStatus, 'active'));
  }

  async createCompetitionCoaching(coaching: InsertCompetitionCoaching): Promise<CompetitionCoaching> {
    const [newCoaching] = await db.insert(competitionCoaching).values(coaching).returning();
    return newCoaching;
  }

  async deleteCompetitionCoachingByCompetition(competitionId: string): Promise<void> {
    await db
      .update(competitionCoaching)
      .set({ recordStatus: 'inactive' })
      .where(eq(competitionCoaching.competitionId, competitionId));
  }

  async deleteCompetitionCoaching(id: string): Promise<void> {
    await db
      .update(competitionCoaching)
      .set({ recordStatus: 'inactive' })
      .where(eq(competitionCoaching.id, id));
  }

  // ============================================================================
  // Coaching Rates operations (NEW - No impact on existing functionality)
  // ============================================================================

  async getAllCoachingRates(): Promise<CoachingRate[]> {
    return await db.select().from(coachingRates);
  }

  async getCoachingRate(qualificationLevel: string): Promise<CoachingRate | undefined> {
    const [rate] = await db.select().from(coachingRates).where(eq(coachingRates.qualificationLevel, qualificationLevel));
    return rate;
  }

  async updateCoachingRate(qualificationLevel: string, rate: Partial<InsertCoachingRate>): Promise<CoachingRate> {
    const [updatedRate] = await db
      .update(coachingRates)
      .set({
        ...rate,
        updatedAt: new Date(),
      })
      .where(eq(coachingRates.qualificationLevel, qualificationLevel))
      .returning();
    if (!updatedRate) {
      throw new Error("Coaching rate not found");
    }
    return updatedRate;
  }

  // ============================================================================
  // Session Template operations (Session Library Feature - No impact on existing functionality)
  // ============================================================================

  async getSessionTemplates(): Promise<SessionTemplate[]> {
    return await db.select().from(sessionTemplates).where(eq(sessionTemplates.recordStatus, 'active'));
  }

  async getSessionTemplate(id: string): Promise<SessionTemplate | undefined> {
    const [template] = await db.select().from(sessionTemplates).where(and(eq(sessionTemplates.id, id), eq(sessionTemplates.recordStatus, 'active')));
    return template;
  }

  async createSessionTemplate(template: InsertSessionTemplate): Promise<SessionTemplate> {
    const [newTemplate] = await db.insert(sessionTemplates).values(template).returning();
    return newTemplate;
  }

  async updateSessionTemplate(id: string, template: Partial<InsertSessionTemplate>): Promise<SessionTemplate> {
    const [updatedTemplate] = await db
      .update(sessionTemplates)
      .set(template)
      .where(eq(sessionTemplates.id, id))
      .returning();
    if (!updatedTemplate) {
      throw new Error("Session template not found");
    }
    return updatedTemplate;
  }

  async deleteSessionTemplate(id: string): Promise<void> {
    const result = await db
      .update(sessionTemplates)
      .set({ recordStatus: 'inactive' })
      .where(eq(sessionTemplates.id, id))
      .returning();
    if (result.length === 0) {
      throw new Error("Session template not found");
    }
  }

  // ============================================================================
  // Drill operations (Drills Library Feature - No impact on existing functionality)
  // ============================================================================

  async getDrills(): Promise<Drill[]> {
    return await db.select().from(drills).where(eq(drills.recordStatus, 'active'));
  }

  async getDrill(id: string): Promise<Drill | undefined> {
    const [drill] = await db.select().from(drills).where(and(eq(drills.id, id), eq(drills.recordStatus, 'active')));
    return drill;
  }

  async createDrill(drill: InsertDrill): Promise<Drill> {
    const [newDrill] = await db.insert(drills).values(drill).returning();
    return newDrill;
  }

  async updateDrill(id: string, drill: Partial<InsertDrill>): Promise<Drill> {
    const [updatedDrill] = await db
      .update(drills)
      .set(drill)
      .where(eq(drills.id, id))
      .returning();
    if (!updatedDrill) {
      throw new Error("Drill not found");
    }
    return updatedDrill;
  }

  async deleteDrill(id: string): Promise<void> {
    const result = await db
      .update(drills)
      .set({ recordStatus: 'inactive' })
      .where(eq(drills.id, id))
      .returning();
    if (result.length === 0) {
      throw new Error("Drill not found");
    }
  }
}

export const storage = new DatabaseStorage();
