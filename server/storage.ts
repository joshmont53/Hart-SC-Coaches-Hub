// Referenced from javascript_database and javascript_log_in_with_replit blueprints
import {
  users,
  coaches,
  squads,
  swimmers,
  locations,
  swimmingSessions,
  attendance,
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
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Coach operations
  getCoaches(): Promise<Coach[]>;
  getCoach(id: string): Promise<Coach | undefined>;
  createCoach(coach: InsertCoach): Promise<Coach>;
  updateCoach(id: string, coach: Partial<InsertCoach>): Promise<Coach>;
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
  
  // Location operations
  getLocations(): Promise<Location[]>;
  getLocation(id: string): Promise<Location | undefined>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: string, location: Partial<InsertLocation>): Promise<Location>;
  deleteLocation(id: string): Promise<void>;
  
  // Session operations
  getSessions(): Promise<SwimmingSession[]>;
  getSession(id: string): Promise<SwimmingSession | undefined>;
  createSession(session: InsertSwimmingSession): Promise<SwimmingSession>;
  updateSession(id: string, session: Partial<InsertSwimmingSession>): Promise<SwimmingSession>;
  deleteSession(id: string): Promise<void>;
  
  // Attendance operations
  getAttendanceBySession(sessionId: string): Promise<Attendance[]>;
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  deleteAttendanceBySession(sessionId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
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
    return await db.select().from(coaches);
  }

  async getCoach(id: string): Promise<Coach | undefined> {
    const [coach] = await db.select().from(coaches).where(eq(coaches.id, id));
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

  async deleteCoach(id: string): Promise<void> {
    const result = await db.delete(coaches).where(eq(coaches.id, id)).returning();
    if (result.length === 0) {
      throw new Error("Coach not found");
    }
  }

  // Squad operations
  async getSquads(): Promise<Squad[]> {
    return await db.select().from(squads);
  }

  async getSquad(id: string): Promise<Squad | undefined> {
    const [squad] = await db.select().from(squads).where(eq(squads.id, id));
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
    const result = await db.delete(squads).where(eq(squads.id, id)).returning();
    if (result.length === 0) {
      throw new Error("Squad not found");
    }
  }

  // Swimmer operations
  async getSwimmers(): Promise<Swimmer[]> {
    return await db.select().from(swimmers);
  }

  async getSwimmer(id: string): Promise<Swimmer | undefined> {
    const [swimmer] = await db.select().from(swimmers).where(eq(swimmers.id, id));
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
    const result = await db.delete(swimmers).where(eq(swimmers.id, id)).returning();
    if (result.length === 0) {
      throw new Error("Swimmer not found");
    }
  }

  // Location operations
  async getLocations(): Promise<Location[]> {
    return await db.select().from(locations);
  }

  async getLocation(id: string): Promise<Location | undefined> {
    const [location] = await db.select().from(locations).where(eq(locations.id, id));
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
    const result = await db.delete(locations).where(eq(locations.id, id)).returning();
    if (result.length === 0) {
      throw new Error("Location not found");
    }
  }

  // Session operations
  async getSessions(): Promise<SwimmingSession[]> {
    return await db.select().from(swimmingSessions);
  }

  async getSession(id: string): Promise<SwimmingSession | undefined> {
    const [session] = await db.select().from(swimmingSessions).where(eq(swimmingSessions.id, id));
    return session;
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
    const result = await db.delete(swimmingSessions).where(eq(swimmingSessions.id, id)).returning();
    if (result.length === 0) {
      throw new Error("Session not found");
    }
  }

  // Attendance operations
  async getAttendanceBySession(sessionId: string): Promise<Attendance[]> {
    return await db.select().from(attendance).where(eq(attendance.sessionId, sessionId));
  }

  async createAttendance(attendanceRecord: InsertAttendance): Promise<Attendance> {
    const [newAttendance] = await db.insert(attendance).values(attendanceRecord).returning();
    return newAttendance;
  }

  async deleteAttendanceBySession(sessionId: string): Promise<void> {
    await db.delete(attendance).where(eq(attendance.sessionId, sessionId));
  }
}

export const storage = new DatabaseStorage();
