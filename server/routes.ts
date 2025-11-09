// Referenced from javascript_log_in_with_replit blueprint
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  insertCoachSchema,
  insertSquadSchema,
  insertSwimmerSchema,
  insertLocationSchema,
  insertSwimmingSessionSchema,
  insertAttendanceSchema,
} from "@shared/schema";
import { calculateSessionDistancesAI, validateDistances } from "./aiParser";
import { parseSessionText } from "@shared/sessionParser";
import { getNextAvailableColor } from "./squadColors";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Coach routes
  app.get("/api/coaches", isAuthenticated, async (req, res) => {
    try {
      const coaches = await storage.getCoaches();
      res.json(coaches);
    } catch (error) {
      console.error("Error fetching coaches:", error);
      res.status(500).json({ message: "Failed to fetch coaches" });
    }
  });

  app.get("/api/coaches/me", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const coach = await storage.getCoachByUserId(userId);
      if (!coach) {
        return res.status(404).json({ message: "Coach profile not found" });
      }
      res.json(coach);
    } catch (error) {
      console.error("Error fetching coach profile:", error);
      res.status(500).json({ message: "Failed to fetch coach profile" });
    }
  });

  app.post("/api/coaches/link/:coachId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const coachId = req.params.coachId;
      
      // Check if coach exists
      const coach = await storage.getCoach(coachId);
      if (!coach) {
        return res.status(404).json({ message: "Coach not found" });
      }
      
      // Check if coach is already linked
      if (coach.userId && coach.userId !== userId) {
        return res.status(400).json({ message: "Coach profile already linked to another user" });
      }
      
      // Link the coach to the user
      const updatedCoach = await storage.updateCoach(coachId, { userId });
      res.json(updatedCoach);
    } catch (error: any) {
      console.error("Error linking coach:", error);
      res.status(500).json({ message: error.message || "Failed to link coach profile" });
    }
  });

  app.post("/api/coaches", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertCoachSchema.parse(req.body);
      const coach = await storage.createCoach(validatedData);
      res.json(coach);
    } catch (error: any) {
      console.error("Error creating coach:", error);
      res.status(400).json({ message: error.message || "Failed to create coach" });
    }
  });

  app.patch("/api/coaches/:id", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertCoachSchema.partial().parse(req.body);
      const coach = await storage.updateCoach(req.params.id, validatedData);
      res.json(coach);
    } catch (error: any) {
      console.error("Error updating coach:", error);
      if (error.message === "Coach not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(400).json({ message: error.message || "Failed to update coach" });
    }
  });

  app.delete("/api/coaches/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteCoach(req.params.id);
      res.json({ message: "Coach deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting coach:", error);
      if (error.message === "Coach not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete coach" });
    }
  });

  // Squad routes
  app.get("/api/squads", isAuthenticated, async (req, res) => {
    try {
      const squads = await storage.getSquads();
      res.json(squads);
    } catch (error) {
      console.error("Error fetching squads:", error);
      res.status(500).json({ message: "Failed to fetch squads" });
    }
  });

  app.post("/api/squads", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertSquadSchema.parse(req.body);
      
      if (!validatedData.color) {
        const existingSquads = await storage.getSquads();
        const existingColors = existingSquads.map(s => s.color);
        validatedData.color = getNextAvailableColor(existingColors);
      }
      
      const squad = await storage.createSquad(validatedData);
      res.json(squad);
    } catch (error: any) {
      console.error("Error creating squad:", error);
      res.status(400).json({ message: error.message || "Failed to create squad" });
    }
  });

  app.patch("/api/squads/:id", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertSquadSchema.partial().parse(req.body);
      const squad = await storage.updateSquad(req.params.id, validatedData);
      res.json(squad);
    } catch (error: any) {
      console.error("Error updating squad:", error);
      if (error.message === "Squad not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(400).json({ message: error.message || "Failed to update squad" });
    }
  });

  app.delete("/api/squads/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteSquad(req.params.id);
      res.json({ message: "Squad deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting squad:", error);
      if (error.message === "Squad not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete squad" });
    }
  });

  // Swimmer routes
  app.get("/api/swimmers", isAuthenticated, async (req, res) => {
    try {
      const swimmers = await storage.getSwimmers();
      res.json(swimmers);
    } catch (error) {
      console.error("Error fetching swimmers:", error);
      res.status(500).json({ message: "Failed to fetch swimmers" });
    }
  });

  app.post("/api/swimmers", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertSwimmerSchema.parse(req.body);
      const swimmer = await storage.createSwimmer(validatedData);
      res.json(swimmer);
    } catch (error: any) {
      console.error("Error creating swimmer:", error);
      res.status(400).json({ message: error.message || "Failed to create swimmer" });
    }
  });

  app.patch("/api/swimmers/:id", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertSwimmerSchema.partial().parse(req.body);
      const swimmer = await storage.updateSwimmer(req.params.id, validatedData);
      res.json(swimmer);
    } catch (error: any) {
      console.error("Error updating swimmer:", error);
      if (error.message === "Swimmer not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(400).json({ message: error.message || "Failed to update swimmer" });
    }
  });

  app.delete("/api/swimmers/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteSwimmer(req.params.id);
      res.json({ message: "Swimmer deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting swimmer:", error);
      if (error.message === "Swimmer not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete swimmer" });
    }
  });

  // Location routes
  app.get("/api/locations", isAuthenticated, async (req, res) => {
    try {
      const locations = await storage.getLocations();
      res.json(locations);
    } catch (error) {
      console.error("Error fetching locations:", error);
      res.status(500).json({ message: "Failed to fetch locations" });
    }
  });

  app.post("/api/locations", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertLocationSchema.parse(req.body);
      const location = await storage.createLocation(validatedData);
      res.json(location);
    } catch (error: any) {
      console.error("Error creating location:", error);
      res.status(400).json({ message: error.message || "Failed to create location" });
    }
  });

  app.patch("/api/locations/:id", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertLocationSchema.partial().parse(req.body);
      const location = await storage.updateLocation(req.params.id, validatedData);
      res.json(location);
    } catch (error: any) {
      console.error("Error updating location:", error);
      if (error.message === "Location not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(400).json({ message: error.message || "Failed to update location" });
    }
  });

  app.delete("/api/locations/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteLocation(req.params.id);
      res.json({ message: "Location deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting location:", error);
      if (error.message === "Location not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete location" });
    }
  });

  // Session routes
  app.get("/api/sessions", isAuthenticated, async (req, res) => {
    try {
      const sessions = await storage.getSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  app.get("/api/sessions/:id", isAuthenticated, async (req, res) => {
    try {
      const session = await storage.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      console.error("Error fetching session:", error);
      res.status(500).json({ message: "Failed to fetch session" });
    }
  });

  app.post("/api/sessions", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertSwimmingSessionSchema.parse(req.body);
      const session = await storage.createSession(validatedData);
      res.json(session);
    } catch (error: any) {
      console.error("Error creating session:", error);
      res.status(400).json({ message: error.message || "Failed to create session" });
    }
  });

  app.put("/api/sessions/:id", isAuthenticated, async (req, res) => {
    try {
      console.log('[Session Update] Received body:', JSON.stringify(req.body).substring(0, 500));
      console.log('[Session Update] Distance fields in request:', {
        totalDistance: req.body.totalDistance,
        totalFrontCrawlSwim: req.body.totalFrontCrawlSwim,
        totalFrontCrawlDrill: req.body.totalFrontCrawlDrill,
      });
      
      const validatedData = insertSwimmingSessionSchema.partial().parse(req.body);
      
      console.log('[Session Update] After validation:', {
        totalDistance: validatedData.totalDistance,
        totalFrontCrawlSwim: validatedData.totalFrontCrawlSwim,
        totalFrontCrawlDrill: validatedData.totalFrontCrawlDrill,
      });
      
      const session = await storage.updateSession(req.params.id, validatedData);
      res.json(session);
    } catch (error: any) {
      console.error("Error updating session:", error);
      if (error.message === "Session not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(400).json({ message: error.message || "Failed to update session" });
    }
  });

  app.delete("/api/sessions/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteSession(req.params.id);
      res.json({ message: "Session deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting session:", error);
      if (error.message === "Session not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete session" });
    }
  });

  // AI Session Parsing endpoint
  app.post("/api/sessions/parse-ai", isAuthenticated, async (req, res) => {
    try {
      const { sessionContent } = req.body;

      if (!sessionContent || typeof sessionContent !== 'string') {
        return res.status(400).json({ error: 'Invalid session content' });
      }

      // Try AI parsing first
      try {
        console.log('[AI Parser] Parsing session via GPT-5 Mini...');
        const startTime = Date.now();
        
        const distances = await calculateSessionDistancesAI(sessionContent);
        const validation = validateDistances(distances);
        
        const elapsed = Date.now() - startTime;
        console.log(`[AI Parser] Completed in ${elapsed}ms`);

        if (!validation.valid) {
          console.warn('[AI Parser] Validation failed:', validation.errors);
          console.log('[AI Parser] Falling back to rule-based parser');
          
          // Fallback to rule-based
          const fallback = parseSessionText(sessionContent);
          return res.json({
            ...fallback.totals,
            method: 'rule-based-fallback',
            aiErrors: validation.errors,
            aiWarnings: validation.warnings,
          });
        }

        if (validation.warnings.length > 0) {
          console.warn('[AI Parser] Warnings:', validation.warnings);
        }

        return res.json({
          ...distances,
          method: 'ai',
          warnings: validation.warnings,
        });

      } catch (aiError) {
        console.error('[AI Parser] Error:', aiError);
        console.log('[AI Parser] Falling back to rule-based parser');
        
        // Fallback to rule-based
        const fallback = parseSessionText(sessionContent);
        return res.json({
          ...fallback.totals,
          method: 'rule-based-fallback',
          error: aiError instanceof Error ? aiError.message : 'AI parsing unavailable',
        });
      }

    } catch (error) {
      console.error('[API Error] Parse endpoint failed:', error);
      res.status(500).json({ error: 'Failed to parse session' });
    }
  });

  // Attendance routes
  app.get("/api/attendance/:sessionId", isAuthenticated, async (req, res) => {
    try {
      const attendanceRecords = await storage.getAttendanceBySession(req.params.sessionId);
      res.json(attendanceRecords);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      res.status(500).json({ message: "Failed to fetch attendance" });
    }
  });

  app.post("/api/attendance/:sessionId", isAuthenticated, async (req, res) => {
    try {
      const { attendance: attendanceData } = req.body;
      
      // Delete existing attendance for this session
      await storage.deleteAttendanceBySession(req.params.sessionId);
      
      // Create new attendance records
      const createdRecords = [];
      for (const record of attendanceData) {
        // Validate that notes is null when status is Absent
        const notes = record.status === "Absent" ? null : (record.notes || null);
        
        const validatedData = insertAttendanceSchema.parse({
          sessionId: req.params.sessionId,
          swimmerId: record.swimmerId,
          status: record.status,
          notes: notes,
        });
        const attendance = await storage.createAttendance(validatedData);
        createdRecords.push(attendance);
      }
      
      res.json(createdRecords);
    } catch (error: any) {
      console.error("Error saving attendance:", error);
      res.status(400).json({ message: error.message || "Failed to save attendance" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
