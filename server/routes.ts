import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { setupNewAuth, requireAuth, requireAdmin } from "./newAuth";
import {
  insertCoachSchema,
  insertSquadSchema,
  insertSwimmerSchema,
  insertLocationSchema,
  insertSwimmingSessionSchema,
  insertAttendanceSchema,
  createInvitationSchema,
  insertCompetitionSchema,
  insertCompetitionCoachingSchema,
  updateCoachingRateSchema,
  insertSessionTemplateSchema,
  insertDrillSchema,
  insertSessionFeedbackSchema,
  type SessionFeedback,
} from "@shared/schema";
import { sendInvitationEmail } from "./emailService";
import { randomBytes } from "crypto";
import { calculateSessionDistancesAI, validateDistances, detectDrillsInSession, type DrillReference } from "./aiParser";
import { parseSessionText } from "@shared/sessionParser";
import { getNextAvailableColor } from "./squadColors";

// Helper function to sanitize invitation data (remove sensitive fields)
function sanitizeInvitation(invitation: any) {
  const { inviteToken, ...sanitized } = invitation;
  return sanitized;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Email/password authentication
  setupNewAuth(app);

  // Auth routes
  app.get('/api/auth/user', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Invitation management routes (Phase 3 - Admin only)
  // List all invitations
  app.get("/api/invitations", requireAuth, requireAdmin, async (req, res) => {
    try {
      const invitations = await storage.getAllInvitations();
      // Sanitize invitations to remove sensitive fields (inviteToken)
      const sanitizedInvitations = invitations.map(sanitizeInvitation);
      res.json(sanitizedInvitations);
    } catch (error) {
      console.error("Error fetching invitations:", error);
      res.status(500).json({ message: "Failed to fetch invitations" });
    }
  });

  // Create new invitation and send email
  app.post("/api/invitations", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      
      // Validate request body (only email and coachId required)
      const validationResult = createInvitationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid invitation data", 
          errors: validationResult.error.errors 
        });
      }

      const { email, coachId } = validationResult.data;

      // Check if coach exists
      const coach = await storage.getCoach(coachId);
      if (!coach) {
        return res.status(404).json({ message: "Coach not found" });
      }

      // Check if invitation already exists for this email
      const existingInvitation = await storage.getInvitationByEmail(email);
      if (existingInvitation && existingInvitation.status === 'pending') {
        return res.status(400).json({ message: "Invitation already sent to this email" });
      }

      // Generate unique invitation token
      const inviteToken = randomBytes(32).toString('hex');
      
      // Set expiration to 48 hours from now
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48);

      // Get current user ID
      const createdBy = req.user?.id || req.user?.claims?.sub;

      // Create invitation
      const invitation = await storage.createInvitation({
        email,
        coachId,
        inviteToken,
        status: 'pending',
        expiresAt,
        createdBy,
      });

      // Send invitation email
      try {
        await sendInvitationEmail(
          email,
          inviteToken,
          `${coach.firstName} ${coach.lastName}`
        );
        console.log(`✅ Invitation email sent to ${email}`);
      } catch (emailError) {
        console.error('Email send error:', emailError);
        // Non-fatal: invitation created but email failed
        return res.status(201).json({
          ...sanitizeInvitation(invitation),
          emailSent: false,
          emailError: 'Failed to send email. Invitation created but email delivery failed.'
        });
      }

      // Return sanitized invitation (without inviteToken)
      res.status(201).json({ ...sanitizeInvitation(invitation), emailSent: true });
    } catch (error: any) {
      console.error("Error creating invitation:", error);
      res.status(500).json({ message: error.message || "Failed to create invitation" });
    }
  });

  // Resend invitation email
  app.post("/api/invitations/:id/resend", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      // Get invitation
      const invitations = await storage.getAllInvitations();
      const invitation = invitations.find(inv => inv.id === id);

      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      // Only resend if status is pending
      if (invitation.status !== 'pending') {
        return res.status(400).json({ 
          message: `Cannot resend invitation with status: ${invitation.status}` 
        });
      }

      // Check if expired
      if (new Date() > new Date(invitation.expiresAt)) {
        return res.status(400).json({ message: "Invitation has expired" });
      }

      // Get coach details
      const coach = await storage.getCoach(invitation.coachId);
      if (!coach) {
        return res.status(404).json({ message: "Coach not found" });
      }

      // Resend email
      try {
        await sendInvitationEmail(
          invitation.email,
          invitation.inviteToken,
          `${coach.firstName} ${coach.lastName}`
        );
        console.log(`✅ Invitation email resent to ${invitation.email}`);
        res.json({ message: "Invitation email resent successfully", emailSent: true });
      } catch (emailError) {
        console.error('Email send error:', emailError);
        res.status(500).json({ 
          message: "Failed to send email", 
          emailSent: false 
        });
      }
    } catch (error: any) {
      console.error("Error resending invitation:", error);
      res.status(500).json({ message: error.message || "Failed to resend invitation" });
    }
  });

  // Revoke invitation
  app.patch("/api/invitations/:id/revoke", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      // Get invitation
      const invitations = await storage.getAllInvitations();
      const invitation = invitations.find(inv => inv.id === id);

      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      // Can only revoke pending invitations
      if (invitation.status !== 'pending') {
        return res.status(400).json({ 
          message: `Cannot revoke invitation with status: ${invitation.status}` 
        });
      }

      // Update status to revoked
      const updatedInvitation = await storage.updateInvitationStatus(id, 'revoked');
      
      console.log(`✅ Invitation revoked: ${invitation.email}`);
      // Return sanitized invitation (without inviteToken)
      res.json(sanitizeInvitation(updatedInvitation));
    } catch (error: any) {
      console.error("Error revoking invitation:", error);
      res.status(500).json({ message: error.message || "Failed to revoke invitation" });
    }
  });

  // Coach routes
  app.get("/api/coaches", requireAuth, async (req, res) => {
    try {
      const coaches = await storage.getCoaches();
      res.json(coaches);
    } catch (error) {
      console.error("Error fetching coaches:", error);
      res.status(500).json({ message: "Failed to fetch coaches" });
    }
  });

  app.get("/api/coaches/me", requireAuth, async (req: any, res) => {
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

  app.post("/api/coaches/link/:coachId", requireAuth, async (req: any, res) => {
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

  app.post("/api/coaches", requireAuth, async (req, res) => {
    try {
      const validatedData = insertCoachSchema.parse(req.body);
      const coach = await storage.createCoach(validatedData);
      res.json(coach);
    } catch (error: any) {
      console.error("Error creating coach:", error);
      res.status(400).json({ message: error.message || "Failed to create coach" });
    }
  });

  app.patch("/api/coaches/:id", requireAuth, async (req, res) => {
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

  app.delete("/api/coaches/:id", requireAuth, async (req, res) => {
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
  app.get("/api/squads", requireAuth, async (req, res) => {
    try {
      const squads = await storage.getSquads();
      res.json(squads);
    } catch (error) {
      console.error("Error fetching squads:", error);
      res.status(500).json({ message: "Failed to fetch squads" });
    }
  });

  app.post("/api/squads", requireAuth, async (req, res) => {
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

  app.patch("/api/squads/:id", requireAuth, async (req, res) => {
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

  app.delete("/api/squads/:id", requireAuth, async (req, res) => {
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
  app.get("/api/swimmers", requireAuth, async (req, res) => {
    try {
      const swimmers = await storage.getSwimmers();
      res.json(swimmers);
    } catch (error) {
      console.error("Error fetching swimmers:", error);
      res.status(500).json({ message: "Failed to fetch swimmers" });
    }
  });

  app.post("/api/swimmers", requireAuth, async (req, res) => {
    try {
      const validatedData = insertSwimmerSchema.parse(req.body);
      const swimmer = await storage.createSwimmer(validatedData);
      res.json(swimmer);
    } catch (error: any) {
      console.error("Error creating swimmer:", error);
      res.status(400).json({ message: error.message || "Failed to create swimmer" });
    }
  });

  app.patch("/api/swimmers/bulk-update-squad", requireAuth, async (req, res) => {
    try {
      const schema = z.object({
        swimmerIds: z.array(z.string()).min(1, 'At least one swimmer required'),
        newSquadId: z.string().min(1, 'Squad ID required'),
      });
      
      const { swimmerIds, newSquadId } = schema.parse(req.body);
      const updatedSwimmers = await storage.bulkUpdateSwimmerSquad(swimmerIds, newSquadId);
      res.json(updatedSwimmers);
    } catch (error: any) {
      console.error("Error bulk updating swimmers:", error);
      res.status(400).json({ message: error.message || "Failed to bulk update swimmers" });
    }
  });

  app.patch("/api/swimmers/:id", requireAuth, async (req, res) => {
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

  app.delete("/api/swimmers/:id", requireAuth, async (req, res) => {
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
  app.get("/api/locations", requireAuth, async (req, res) => {
    try {
      const locations = await storage.getLocations();
      res.json(locations);
    } catch (error) {
      console.error("Error fetching locations:", error);
      res.status(500).json({ message: "Failed to fetch locations" });
    }
  });

  app.post("/api/locations", requireAuth, async (req, res) => {
    try {
      const validatedData = insertLocationSchema.parse(req.body);
      const location = await storage.createLocation(validatedData);
      res.json(location);
    } catch (error: any) {
      console.error("Error creating location:", error);
      res.status(400).json({ message: error.message || "Failed to create location" });
    }
  });

  app.patch("/api/locations/:id", requireAuth, async (req, res) => {
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

  app.delete("/api/locations/:id", requireAuth, async (req, res) => {
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
  app.get("/api/sessions", requireAuth, async (req, res) => {
    try {
      const sessions = await storage.getSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  app.get("/api/sessions/:id", requireAuth, async (req, res) => {
    try {
      const result = await storage.getSessionWithAttendance(req.params.id);
      if (!result) {
        return res.status(404).json({ message: "Session not found" });
      }
      // Return session with attendance embedded
      res.json({ ...result.session, attendance: result.attendance });
    } catch (error) {
      console.error("Error fetching session:", error);
      res.status(500).json({ message: "Failed to fetch session" });
    }
  });

  app.post("/api/sessions", requireAuth, async (req, res) => {
    try {
      const validatedData = insertSwimmingSessionSchema.parse(req.body);
      let session = await storage.createSession(validatedData);

      // Run drill detection if session content exists
      if (session.sessionContent && session.sessionContent.trim()) {
        try {
          // Get all active drills for detection
          const allDrills = await storage.getDrills();
          const drillReferences: DrillReference[] = allDrills.map(drill => ({
            id: drill.id,
            drillName: drill.drillName,
            strokeType: drill.strokeType,
            drillDescription: drill.drillDescription,
          }));

          // Detect drills in session content
          const detectedDrillIds = await detectDrillsInSession(
            session.sessionContent,
            drillReferences
          );

          // Update session with detected drill IDs
          if (detectedDrillIds.length > 0) {
            session = await storage.updateSession(session.id, {
              detectedDrillIds,
            });
            console.log(`[Drill Detection] Found ${detectedDrillIds.length} drills in session ${session.id}`);
          }
        } catch (drillError) {
          // Non-fatal: log error but still return session
          console.error('[Drill Detection] Error detecting drills:', drillError);
        }
      }

      res.json(session);
    } catch (error: any) {
      console.error("Error creating session:", error);
      res.status(400).json({ message: error.message || "Failed to create session" });
    }
  });

  app.put("/api/sessions/:id", requireAuth, async (req, res) => {
    try {
      const validatedData = insertSwimmingSessionSchema.partial().parse(req.body);
      let session = await storage.updateSession(req.params.id, validatedData);

      // Re-run drill detection if session content was updated
      if (validatedData.sessionContent !== undefined && session.sessionContent && session.sessionContent.trim()) {
        try {
          // Get all active drills for detection
          const allDrills = await storage.getDrills();
          const drillReferences: DrillReference[] = allDrills.map(drill => ({
            id: drill.id,
            drillName: drill.drillName,
            strokeType: drill.strokeType,
            drillDescription: drill.drillDescription,
          }));

          // Detect drills in updated session content
          const detectedDrillIds = await detectDrillsInSession(
            session.sessionContent,
            drillReferences
          );

          // Update session with detected drill IDs (may be empty array if no drills found)
          session = await storage.updateSession(session.id, {
            detectedDrillIds,
          });
          console.log(`[Drill Detection] Re-detected drills: found ${detectedDrillIds.length} drills in session ${session.id}`);
        } catch (drillError) {
          // Non-fatal: log error but still return session
          console.error('[Drill Detection] Error re-detecting drills:', drillError);
        }
      }

      res.json(session);
    } catch (error: any) {
      console.error("Error updating session:", error);
      if (error.message === "Session not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(400).json({ message: error.message || "Failed to update session" });
    }
  });

  app.delete("/api/sessions/:id", requireAuth, async (req, res) => {
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
  app.post("/api/sessions/parse-ai", requireAuth, async (req, res) => {
    try {
      const { sessionContent } = req.body;
      
      console.log('[Parse AI] Request body keys:', Object.keys(req.body));
      console.log('[Parse AI] sessionContent type:', typeof sessionContent);
      console.log('[Parse AI] sessionContent length:', sessionContent?.length || 0);
      console.log('[Parse AI] sessionContent preview:', sessionContent?.substring(0, 200));

      // Validate that sessionContent exists and is a string
      if (sessionContent === undefined || sessionContent === null) {
        console.error('[Parse AI] sessionContent is null or undefined');
        return res.status(400).json({ error: 'Session content is required' });
      }
      
      if (typeof sessionContent !== 'string') {
        console.error('[Parse AI] sessionContent is not a string, type:', typeof sessionContent);
        return res.status(400).json({ error: 'Session content must be a string' });
      }
      
      // Allow empty strings - just return zero distances
      if (sessionContent.trim().length === 0) {
        console.log('[Parse AI] Empty session content - returning zero distances');
        return res.json({
          totalFrontCrawlSwim: 0,
          totalFrontCrawlDrill: 0,
          totalFrontCrawlKick: 0,
          totalFrontCrawlPull: 0,
          totalBackstrokeSwim: 0,
          totalBackstrokeDrill: 0,
          totalBackstrokeKick: 0,
          totalBackstrokePull: 0,
          totalBreaststrokeSwim: 0,
          totalBreaststrokeDrill: 0,
          totalBreaststrokeKick: 0,
          totalBreaststrokePull: 0,
          totalButterflySwim: 0,
          totalButterflyDrill: 0,
          totalButterflyKick: 0,
          totalButterflyPull: 0,
          totalIMSwim: 0,
          totalIMDrill: 0,
          totalIMKick: 0,
          totalIMPull: 0,
          totalNo1Swim: 0,
          totalNo1Drill: 0,
          totalNo1Kick: 0,
          totalNo1Pull: 0,
          totalDistance: 0,
          method: 'empty',
        });
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
  app.get("/api/attendance/:sessionId", requireAuth, async (req, res) => {
    try {
      const attendanceRecords = await storage.getAttendanceBySession(req.params.sessionId);
      res.json(attendanceRecords);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      res.status(500).json({ message: "Failed to fetch attendance" });
    }
  });

  app.post("/api/attendance/:sessionId", requireAuth, async (req, res) => {
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

  // ============================================================================
  // Competition routes (NEW - No impact on existing functionality)
  // ============================================================================

  // Get all competitions (all authenticated users)
  app.get("/api/competitions", requireAuth, async (req, res) => {
    try {
      const competitions = await storage.getCompetitions();
      res.json(competitions);
    } catch (error) {
      console.error("Error fetching competitions:", error);
      res.status(500).json({ message: "Failed to fetch competitions" });
    }
  });

  // Get single competition by ID (all authenticated users)
  app.get("/api/competitions/:id", requireAuth, async (req, res) => {
    try {
      const competition = await storage.getCompetition(req.params.id);
      if (!competition) {
        return res.status(404).json({ message: "Competition not found" });
      }
      res.json(competition);
    } catch (error) {
      console.error("Error fetching competition:", error);
      res.status(500).json({ message: "Failed to fetch competition" });
    }
  });

  // Create new competition (admin only)
  app.post("/api/competitions", requireAuth, requireAdmin, async (req, res) => {
    try {
      // Validate request body
      const validationResult = insertCompetitionSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid competition data", 
          errors: validationResult.error.errors 
        });
      }

      const competitionData = validationResult.data;

      // Verify location exists
      const location = await storage.getLocation(competitionData.locationId);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }

      // Create competition
      const competition = await storage.createCompetition(competitionData);
      res.status(201).json(competition);
    } catch (error: any) {
      console.error("Error creating competition:", error);
      res.status(500).json({ message: error.message || "Failed to create competition" });
    }
  });

  // Update competition (admin only)
  app.patch("/api/competitions/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      // Verify competition exists
      const existing = await storage.getCompetition(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Competition not found" });
      }

      // Validate request body (partial update)
      const validationResult = insertCompetitionSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid competition data", 
          errors: validationResult.error.errors 
        });
      }

      const updateData = validationResult.data;

      // If locationId is being updated, verify it exists
      if (updateData.locationId) {
        const location = await storage.getLocation(updateData.locationId);
        if (!location) {
          return res.status(404).json({ message: "Location not found" });
        }
      }

      // Update competition
      const updated = await storage.updateCompetition(req.params.id, updateData);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating competition:", error);
      res.status(500).json({ message: error.message || "Failed to update competition" });
    }
  });

  // Delete competition (admin only)
  app.delete("/api/competitions/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      // Verify competition exists
      const existing = await storage.getCompetition(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Competition not found" });
      }

      // Delete competition (soft delete, cascades to coaching records)
      await storage.deleteCompetition(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting competition:", error);
      res.status(500).json({ message: error.message || "Failed to delete competition" });
    }
  });

  // Get ALL coaching records across all competitions (all authenticated users)
  app.get("/api/competitions/coaching/all", requireAuth, async (req, res) => {
    try {
      const allCoaching = await storage.getAllCompetitionCoaching();
      res.json(allCoaching);
    } catch (error) {
      console.error("Error fetching all competition coaching:", error);
      res.status(500).json({ message: "Failed to fetch all competition coaching" });
    }
  });

  // Get coaching records for a competition (all authenticated users)
  app.get("/api/competitions/:id/coaching", requireAuth, async (req, res) => {
    try {
      const coachingRecords = await storage.getCompetitionCoachingByCompetition(req.params.id);
      res.json(coachingRecords);
    } catch (error) {
      console.error("Error fetching competition coaching:", error);
      res.status(500).json({ message: "Failed to fetch competition coaching" });
    }
  });

  // Create coaching record for a competition (admin only)
  app.post("/api/competitions/:id/coaching", requireAuth, requireAdmin, async (req, res) => {
    try {
      // Verify competition exists
      const competition = await storage.getCompetition(req.params.id);
      if (!competition) {
        return res.status(404).json({ message: "Competition not found" });
      }

      // Validate request body
      const validationResult = insertCompetitionCoachingSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid coaching data", 
          errors: validationResult.error.errors 
        });
      }

      const coachingData = validationResult.data;

      // Verify coach exists
      const coach = await storage.getCoach(coachingData.coachId);
      if (!coach) {
        return res.status(404).json({ message: "Coach not found" });
      }

      // Create coaching record
      const coaching = await storage.createCompetitionCoaching(coachingData);
      res.status(201).json(coaching);
    } catch (error: any) {
      console.error("Error creating coaching:", error);
      res.status(500).json({ message: error.message || "Failed to create coaching" });
    }
  });

  // Delete coaching record (admin only)
  app.delete("/api/competitions/coaching/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      await storage.deleteCompetitionCoaching(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting coaching:", error);
      res.status(500).json({ message: error.message || "Failed to delete coaching" });
    }
  });

  // ============================================================================
  // Coaching Rates API (NEW - No impact on existing functionality)
  // ============================================================================

  // Get all coaching rates (all authenticated users can view)
  app.get("/api/coaching-rates", requireAuth, async (req, res) => {
    try {
      const rates = await storage.getAllCoachingRates();
      res.json(rates);
    } catch (error: any) {
      console.error("Error fetching coaching rates:", error);
      res.status(500).json({ message: error.message || "Failed to fetch coaching rates" });
    }
  });

  // Update coaching rates (admin only)
  app.put("/api/coaching-rates", requireAuth, requireAdmin, async (req, res) => {
    try {
      // Validate request body - expect array of rate updates
      if (!Array.isArray(req.body)) {
        return res.status(400).json({ message: "Request body must be an array of rate updates" });
      }

      // Validate each rate update
      const validatedRates = [];
      for (const rate of req.body) {
        const validationResult = updateCoachingRateSchema.safeParse(rate);
        if (!validationResult.success) {
          return res.status(400).json({ 
            message: "Invalid rate data", 
            errors: validationResult.error.errors,
            invalidRate: rate
          });
        }
        validatedRates.push(validationResult.data);
      }

      // Update each rate
      const updatedRates = [];
      for (const rate of validatedRates) {
        const updated = await storage.updateCoachingRate(rate.qualificationLevel, {
          hourlyRate: rate.hourlyRate.toString(),
          sessionWritingRate: rate.sessionWritingRate.toString(),
        });
        updatedRates.push(updated);
      }

      res.json(updatedRates);
    } catch (error: any) {
      console.error("Error updating coaching rates:", error);
      res.status(500).json({ message: error.message || "Failed to update coaching rates" });
    }
  });

  // ============================================================================
  // Session Template routes (Session Library Feature - No impact on existing functionality)
  // ============================================================================

  // Get all session templates
  app.get("/api/session-templates", requireAuth, async (req, res) => {
    try {
      const templates = await storage.getSessionTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching session templates:", error);
      res.status(500).json({ message: "Failed to fetch session templates" });
    }
  });

  // Get single session template
  app.get("/api/session-templates/:id", requireAuth, async (req, res) => {
    try {
      const template = await storage.getSessionTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Session template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching session template:", error);
      res.status(500).json({ message: "Failed to fetch session template" });
    }
  });

  // Create new session template
  app.post("/api/session-templates", requireAuth, async (req: any, res) => {
    try {
      // Get current user's coach profile
      const userId = req.user?.id || req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const coach = await storage.getCoachByUserId(userId);
      
      // Verify coach profile exists before proceeding
      if (!coach) {
        return res.status(403).json({ message: "No coach profile found. Only coaches can create templates." });
      }

      // Now safe to validate and create - coach.id is guaranteed to be defined
      const validatedData = insertSessionTemplateSchema.parse({
        ...req.body,
        coachId: coach.id, // Ensure coachId is set to current user's coach
      });

      const template = await storage.createSessionTemplate(validatedData);
      res.status(201).json(template);
    } catch (error: any) {
      console.error("Error creating session template:", error);
      // Distinguish between validation errors and server errors
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid template data", errors: error.errors });
      }
      res.status(500).json({ message: error.message || "Failed to create session template" });
    }
  });

  // Update session template
  app.patch("/api/session-templates/:id", requireAuth, async (req: any, res) => {
    try {
      // Get current user's coach profile
      const userId = req.user?.id || req.user?.claims?.sub;
      const coach = await storage.getCoachByUserId(userId);
      
      if (!coach) {
        return res.status(403).json({ message: "No coach profile found" });
      }

      // Get existing template to check ownership
      const existingTemplate = await storage.getSessionTemplate(req.params.id);
      if (!existingTemplate) {
        return res.status(404).json({ message: "Session template not found" });
      }

      // Only the owner can update their template
      if (existingTemplate.coachId !== coach.id) {
        return res.status(403).json({ message: "You can only edit your own templates" });
      }

      // Validate and update (don't allow changing coachId)
      const { coachId, ...updateData } = req.body;
      const validatedData = insertSessionTemplateSchema.partial().parse(updateData);

      const updatedTemplate = await storage.updateSessionTemplate(req.params.id, validatedData);
      res.json(updatedTemplate);
    } catch (error: any) {
      console.error("Error updating session template:", error);
      if (error.message === "Session template not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(400).json({ message: error.message || "Failed to update session template" });
    }
  });

  // Delete session template
  app.delete("/api/session-templates/:id", requireAuth, async (req: any, res) => {
    try {
      // Get current user's coach profile
      const userId = req.user?.id || req.user?.claims?.sub;
      const coach = await storage.getCoachByUserId(userId);
      
      if (!coach) {
        return res.status(403).json({ message: "No coach profile found" });
      }

      // Get existing template to check ownership
      const existingTemplate = await storage.getSessionTemplate(req.params.id);
      if (!existingTemplate) {
        return res.status(404).json({ message: "Session template not found" });
      }

      // Only the owner can delete their template
      if (existingTemplate.coachId !== coach.id) {
        return res.status(403).json({ message: "You can only delete your own templates" });
      }

      await storage.deleteSessionTemplate(req.params.id);
      res.json({ message: "Session template deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting session template:", error);
      if (error.message === "Session template not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete session template" });
    }
  });

  // ============================================================================
  // Drill routes (Drills Library Feature - No impact on existing functionality)
  // ============================================================================

  // Get all drills
  app.get("/api/drills", requireAuth, async (req, res) => {
    try {
      const drills = await storage.getDrills();
      res.json(drills);
    } catch (error) {
      console.error("Error fetching drills:", error);
      res.status(500).json({ message: "Failed to fetch drills" });
    }
  });

  // Get single drill
  app.get("/api/drills/:id", requireAuth, async (req, res) => {
    try {
      const drill = await storage.getDrill(req.params.id);
      if (!drill) {
        return res.status(404).json({ message: "Drill not found" });
      }
      res.json(drill);
    } catch (error) {
      console.error("Error fetching drill:", error);
      res.status(500).json({ message: "Failed to fetch drill" });
    }
  });

  // Create new drill
  app.post("/api/drills", requireAuth, async (req: any, res) => {
    try {
      // Get current user's coach profile
      const userId = req.user?.id || req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const coach = await storage.getCoachByUserId(userId);
      
      // Verify coach profile exists before proceeding
      if (!coach) {
        return res.status(403).json({ message: "No coach profile found. Only coaches can create drills." });
      }

      // Now safe to validate and create - coach.id is guaranteed to be defined
      const validatedData = insertDrillSchema.parse({
        ...req.body,
        coachId: coach.id, // Ensure coachId is set to current user's coach
      });

      const drill = await storage.createDrill(validatedData);
      res.status(201).json(drill);
    } catch (error: any) {
      console.error("Error creating drill:", error);
      // Distinguish between validation errors and server errors
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid drill data", errors: error.errors });
      }
      res.status(500).json({ message: error.message || "Failed to create drill" });
    }
  });

  // Update drill
  app.patch("/api/drills/:id", requireAuth, async (req: any, res) => {
    try {
      // Get current user's coach profile
      const userId = req.user?.id || req.user?.claims?.sub;
      const coach = await storage.getCoachByUserId(userId);
      
      if (!coach) {
        return res.status(403).json({ message: "No coach profile found" });
      }

      // Get existing drill to check ownership
      const existingDrill = await storage.getDrill(req.params.id);
      if (!existingDrill) {
        return res.status(404).json({ message: "Drill not found" });
      }

      // Only the owner can update their drill
      if (existingDrill.coachId !== coach.id) {
        return res.status(403).json({ message: "You can only edit your own drills" });
      }

      // Validate and update (don't allow changing coachId)
      const { coachId, ...updateData } = req.body;
      const validatedData = insertDrillSchema.partial().parse(updateData);

      const updatedDrill = await storage.updateDrill(req.params.id, validatedData);
      res.json(updatedDrill);
    } catch (error: any) {
      console.error("Error updating drill:", error);
      if (error.message === "Drill not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(400).json({ message: error.message || "Failed to update drill" });
    }
  });

  // Delete drill
  app.delete("/api/drills/:id", requireAuth, async (req: any, res) => {
    try {
      // Get current user's coach profile
      const userId = req.user?.id || req.user?.claims?.sub;
      const coach = await storage.getCoachByUserId(userId);
      
      if (!coach) {
        return res.status(403).json({ message: "No coach profile found" });
      }

      // Get existing drill to check ownership
      const existingDrill = await storage.getDrill(req.params.id);
      if (!existingDrill) {
        return res.status(404).json({ message: "Drill not found" });
      }

      // Only the owner can delete their drill
      if (existingDrill.coachId !== coach.id) {
        return res.status(403).json({ message: "You can only delete your own drills" });
      }

      await storage.deleteDrill(req.params.id);
      res.json({ message: "Drill deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting drill:", error);
      if (error.message === "Drill not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete drill" });
    }
  });

  // ============================================================================
  // Invoice routes
  // ============================================================================

  // Get invoice data for a coach for a specific month
  app.get("/api/invoices/:coachId/:year/:month", requireAuth, async (req: any, res) => {
    try {
      const { coachId, year, month } = req.params;
      
      // Authorization: coaches can only view their own invoices, admins can view all
      const userId = req.user?.id || req.user?.claims?.sub;
      const requestingUser = await storage.getUser(userId);
      const isAdmin = requestingUser?.role === 'admin';
      
      // If not admin, must have a coach profile and can only view own invoices
      if (!isAdmin) {
        const requestingCoach = await storage.getCoachByUserId(userId);
        if (!requestingCoach) {
          return res.status(403).json({ message: "No coach profile found" });
        }
        if (requestingCoach.id !== coachId) {
          return res.status(403).json({ message: "You can only view your own invoices" });
        }
      }

      // Validate coach exists
      const coach = await storage.getCoach(coachId);
      if (!coach) {
        return res.status(404).json({ message: "Coach not found" });
      }

      // Get coaching rates based on qualification level
      const rate = await storage.getCoachingRate(coach.level || 'No Qualification');
      if (!rate) {
        return res.status(500).json({ message: "Coaching rates not configured for this qualification level" });
      }

      // Calculate date range for the month
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];

      // Get all sessions for this month
      const allSessions = await storage.getSessions();
      const monthSessions = allSessions.filter(s => 
        s.sessionDate >= startDate && s.sessionDate <= endDate
      );

      // Get all squads for name lookup
      const allSquads = await storage.getSquads();
      const squadMap = new Map(allSquads.map(squad => [squad.id, squad]));

      // Calculate coaching hours
      const coachingSessions = monthSessions.filter(s => 
        s.leadCoachId === coachId || s.secondCoachId === coachId || s.helperId === coachId
      );

      const sessionDetails = coachingSessions.map(s => {
        const squad = squadMap.get(s.squadId);
        return {
          sessionId: s.id,
          sessionDate: s.sessionDate,
          squadId: s.squadId,
          squadName: squad?.squadName || 'Unknown Squad',
          startTime: s.startTime,
          endTime: s.endTime,
          duration: parseFloat(s.duration),
          role: s.leadCoachId === coachId ? 'lead' : (s.secondCoachId === coachId ? 'second' : 'helper'),
        };
      });

      const totalCoachingHours = sessionDetails.reduce((sum, s) => sum + s.duration, 0);

      // Calculate sessions written
      const sessionsWritten = monthSessions.filter(s => s.setWriterId === coachId);
      const sessionWritingDetails = sessionsWritten.map(s => {
        const squad = squadMap.get(s.squadId);
        return {
          sessionId: s.id,
          sessionDate: s.sessionDate,
          squadId: s.squadId,
          squadName: squad?.squadName || 'Unknown Squad',
        };
      });

      // Get competition coaching
      const allCompetitionCoaching = await storage.getAllCompetitionCoaching();
      const competitionCoachingThisMonth = allCompetitionCoaching.filter(c => 
        c.coachId === coachId && c.coachingDate >= startDate && c.coachingDate <= endDate
      );

      // Get all competitions and locations for name lookup
      const allCompetitions = await storage.getCompetitions();
      const competitionMap = new Map(allCompetitions.map(comp => [comp.id, comp]));
      const allLocations = await storage.getLocations();
      const locationMap = new Map(allLocations.map(loc => [loc.id, loc]));

      const competitionDetails = competitionCoachingThisMonth.map(c => {
        const competition = competitionMap.get(c.competitionId);
        const location = competition ? locationMap.get(competition.locationId) : undefined;
        return {
          coachingId: c.id,
          competitionId: c.competitionId,
          competitionName: competition?.competitionName || 'Unknown Competition',
          locationName: location?.poolName || 'Unknown Location',
          coachingDate: c.coachingDate,
          duration: parseFloat(c.duration),
        };
      });

      const totalCompetitionHours = competitionDetails.reduce((sum, c) => sum + c.duration, 0);

      // Calculate totals
      const totalHours = totalCoachingHours + totalCompetitionHours;
      const totalSessionsWritten = sessionsWritten.length;

      const hourlyRate = parseFloat(rate.hourlyRate);
      const sessionWritingRate = parseFloat(rate.sessionWritingRate);

      const coachingEarnings = totalHours * hourlyRate;
      const sessionWritingEarnings = totalSessionsWritten * sessionWritingRate;
      const totalEarnings = coachingEarnings + sessionWritingEarnings;

      // Build invoice data
      const invoiceData = {
        coachId: coach.id,
        coachName: `${coach.firstName} ${coach.lastName}`,
        qualificationLevel: coach.level || 'No Qualification',
        year: parseInt(year),
        month: parseInt(month),
        rates: {
          hourlyRate,
          sessionWritingRate,
        },
        coaching: {
          totalHours,
          breakdown: {
            sessionHours: totalCoachingHours,
            competitionHours: totalCompetitionHours,
          },
          sessions: sessionDetails,
          competitions: competitionDetails,
          earnings: coachingEarnings,
        },
        sessionWriting: {
          count: totalSessionsWritten,
          sessions: sessionWritingDetails,
          earnings: sessionWritingEarnings,
        },
        totals: {
          totalEarnings,
          totalHours,
          totalSessionsWritten,
        },
      };

      res.json(invoiceData);
    } catch (error: any) {
      console.error("Error generating invoice data:", error);
      res.status(500).json({ message: error.message || "Failed to generate invoice data" });
    }
  });

  // ============================================================================
  // Session Feedback routes (Feedback Feature - No impact on existing functionality)
  // ============================================================================

  // Get feedback for a specific session
  app.get("/api/feedback/session/:sessionId", requireAuth, async (req, res) => {
    try {
      const feedback = await storage.getFeedbackBySession(req.params.sessionId);
      if (!feedback) {
        return res.status(404).json({ message: "Feedback not found" });
      }
      res.json(feedback);
    } catch (error: any) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ message: error.message || "Failed to fetch feedback" });
    }
  });

  // Get all feedback (for analytics)
  app.get("/api/feedback", requireAuth, async (req, res) => {
    try {
      const feedback = await storage.getAllFeedback();
      res.json(feedback);
    } catch (error) {
      console.error("Error fetching all feedback:", error);
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  // Create or update feedback for a session
  app.post("/api/feedback", requireAuth, async (req: any, res) => {
    try {
      const validatedData = insertSessionFeedbackSchema.parse(req.body);
      const feedback = await storage.createOrUpdateFeedback(validatedData);
      res.json(feedback);
    } catch (error: any) {
      console.error("Error saving feedback:", error);
      res.status(400).json({ message: error.message || "Failed to save feedback" });
    }
  });

  // Delete feedback
  app.delete("/api/feedback/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteFeedback(req.params.id);
      res.json({ message: "Feedback deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting feedback:", error);
      if (error.message === "Feedback not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete feedback" });
    }
  });

  // ============================================================================
  // Feedback Analytics API (Phase 2 - Analytics Dashboard)
  // ============================================================================

  // Get analytics data with filters
  app.get("/api/feedback/analytics", requireAuth, async (req, res) => {
    try {
      const { squadId, coachId, startDate, endDate } = req.query;

      // Fetch all feedback
      const allFeedback = await storage.getAllFeedback();
      
      // Fetch sessions and squads for filtering
      const allSessions = await storage.getSessions();
      const allSquads = await storage.getSquads();
      const allCoaches = await storage.getCoaches();

      // Create lookup maps
      const sessionMap = new Map(allSessions.map(s => [s.id, s]));
      const squadMap = new Map(allSquads.map(s => [s.id, s]));
      const coachMap = new Map(allCoaches.map(c => [c.id, c]));

      // Enrich feedback with session data
      const enrichedFeedback = allFeedback.map(f => {
        const session = sessionMap.get(f.sessionId);
        const squad = session ? squadMap.get(session.squadId) : undefined;
        const coach = coachMap.get(f.coachId);
        return {
          ...f,
          session,
          squadId: session?.squadId,
          squadName: squad?.squadName,
          sessionDate: session?.sessionDate,
          duration: session?.duration,
          coachName: coach ? `${coach.firstName} ${coach.lastName}` : undefined,
        };
      });

      // Apply filters
      let filteredFeedback = enrichedFeedback;

      if (squadId && typeof squadId === 'string') {
        filteredFeedback = filteredFeedback.filter(f => f.squadId === squadId);
      }

      if (coachId && typeof coachId === 'string') {
        filteredFeedback = filteredFeedback.filter(f => f.coachId === coachId);
      }

      if (startDate && typeof startDate === 'string') {
        filteredFeedback = filteredFeedback.filter(f => f.sessionDate && f.sessionDate >= startDate);
      }

      if (endDate && typeof endDate === 'string') {
        filteredFeedback = filteredFeedback.filter(f => f.sessionDate && f.sessionDate <= endDate);
      }

      // Calculate overall averages
      const ratingCategories = [
        'engagement', 'effortAndIntent', 'enjoyment', 
        'sessionClarity', 'appropriatenessOfChallenge', 'sessionFlow'
      ] as const;

      const calculateAverage = (data: typeof filteredFeedback, category: typeof ratingCategories[number]) => {
        if (data.length === 0) return 0;
        const sum = data.reduce((acc, f) => acc + (f[category] || 0), 0);
        return Math.round((sum / data.length) * 10) / 10;
      };

      const categoryAverages = Object.fromEntries(
        ratingCategories.map(cat => [cat, calculateAverage(filteredFeedback, cat)])
      );

      // Calculate overall average
      const allRatings = filteredFeedback.flatMap(f => 
        ratingCategories.map(cat => f[cat] || 0)
      );
      const overallAverage = allRatings.length > 0 
        ? Math.round((allRatings.reduce((a, b) => a + b, 0) / allRatings.length) * 10) / 10 
        : 0;

      // Calculate trends (last 15 days vs previous 15 days)
      const now = new Date();
      const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const recentFeedback = filteredFeedback.filter(f => 
        f.sessionDate && new Date(f.sessionDate) >= fifteenDaysAgo
      );
      const previousFeedback = filteredFeedback.filter(f => 
        f.sessionDate && new Date(f.sessionDate) >= thirtyDaysAgo && new Date(f.sessionDate) < fifteenDaysAgo
      );

      const recentAvg = recentFeedback.length > 0 
        ? recentFeedback.flatMap(f => ratingCategories.map(cat => f[cat] || 0)).reduce((a, b) => a + b, 0) / (recentFeedback.length * 6)
        : null;
      const previousAvg = previousFeedback.length > 0 
        ? previousFeedback.flatMap(f => ratingCategories.map(cat => f[cat] || 0)).reduce((a, b) => a + b, 0) / (previousFeedback.length * 6)
        : null;

      const trend = recentAvg !== null && previousAvg !== null 
        ? Math.round((recentAvg - previousAvg) * 10) / 10 
        : null;

      // Generate chart data (weekly averages for last 8 weeks)
      const chartData = [];
      for (let i = 7; i >= 0; i--) {
        const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const weekFeedback = filteredFeedback.filter(f => {
          if (!f.sessionDate) return false;
          const date = new Date(f.sessionDate);
          return date >= weekStart && date < weekEnd;
        });

        const weekAvg = weekFeedback.length > 0
          ? weekFeedback.flatMap(f => ratingCategories.map(cat => f[cat] || 0)).reduce((a, b) => a + b, 0) / (weekFeedback.length * 6)
          : null;

        chartData.push({
          weekStart: weekStart.toISOString().split('T')[0],
          weekEnd: weekEnd.toISOString().split('T')[0],
          average: weekAvg !== null ? Math.round(weekAvg * 10) / 10 : null,
          count: weekFeedback.length,
        });
      }

      // Pattern detection engine - generate dynamic insights
      const patterns: Array<{ type: string; title: string; description: string; significance: number; direction: 'positive' | 'negative' | 'neutral'; category?: string }> = [];

      // 1. Identify strongest and weakest categories
      const categoryEntries = Object.entries(categoryAverages).sort((a, b) => b[1] - a[1]);
      const categoryLabels: Record<string, string> = {
        engagement: 'Engagement',
        effortAndIntent: 'Effort & Intent',
        enjoyment: 'Enjoyment',
        sessionClarity: 'Session Clarity',
        appropriatenessOfChallenge: 'Appropriateness of Challenge',
        sessionFlow: 'Session Flow',
      };

      if (categoryEntries.length > 0 && categoryEntries[0][1] > 0) {
        const strongest = categoryEntries[0];
        if (strongest[1] >= 7) {
          patterns.push({
            type: 'strength',
            title: `Strong ${categoryLabels[strongest[0]]}`,
            description: `${categoryLabels[strongest[0]]} is your highest-rated area with an average of ${strongest[1]}/10.`,
            significance: strongest[1],
            direction: 'positive',
            category: strongest[0],
          });
        }

        const weakest = categoryEntries[categoryEntries.length - 1];
        if (weakest[1] < 6 && weakest[1] > 0) {
          patterns.push({
            type: 'improvement',
            title: `Focus on ${categoryLabels[weakest[0]]}`,
            description: `${categoryLabels[weakest[0]]} has the lowest average at ${weakest[1]}/10. Consider strategies to improve this area.`,
            significance: 10 - weakest[1],
            direction: 'negative',
            category: weakest[0],
          });
        }
      }

      // 2. Duration-based patterns
      const durationBands = {
        short: filteredFeedback.filter(f => f.duration && parseFloat(f.duration) <= 60),
        medium: filteredFeedback.filter(f => f.duration && parseFloat(f.duration) > 60 && parseFloat(f.duration) <= 90),
        long: filteredFeedback.filter(f => f.duration && parseFloat(f.duration) > 90),
      };

      const durationAverages = {
        short: durationBands.short.length > 0 
          ? durationBands.short.flatMap(f => ratingCategories.map(cat => f[cat] || 0)).reduce((a, b) => a + b, 0) / (durationBands.short.length * 6)
          : null,
        medium: durationBands.medium.length > 0 
          ? durationBands.medium.flatMap(f => ratingCategories.map(cat => f[cat] || 0)).reduce((a, b) => a + b, 0) / (durationBands.medium.length * 6)
          : null,
        long: durationBands.long.length > 0 
          ? durationBands.long.flatMap(f => ratingCategories.map(cat => f[cat] || 0)).reduce((a, b) => a + b, 0) / (durationBands.long.length * 6)
          : null,
      };

      const validDurationAverages = Object.entries(durationAverages).filter(([, v]) => v !== null) as [string, number][];
      if (validDurationAverages.length >= 2) {
        const sorted = validDurationAverages.sort((a, b) => b[1] - a[1]);
        const best = sorted[0];
        const worst = sorted[sorted.length - 1];
        const diff = best[1] - worst[1];
        
        if (diff >= 0.5) {
          const durationLabels: Record<string, string> = { short: '60-minute', medium: '90-minute', long: '120-minute' };
          patterns.push({
            type: 'duration',
            title: `${durationLabels[best[0]]} sessions perform best`,
            description: `${durationLabels[best[0]]} sessions average ${Math.round(best[1] * 10) / 10}/10 vs ${Math.round(worst[1] * 10) / 10}/10 for ${durationLabels[worst[0]]} sessions.`,
            significance: diff,
            direction: 'neutral',
          });
        }
      }

      // 3. Squad-based patterns (if not filtered by squad)
      if (!squadId) {
        const squadAverages: Record<string, { total: number; count: number; name: string }> = {};
        filteredFeedback.forEach(f => {
          if (f.squadId && f.squadName) {
            if (!squadAverages[f.squadId]) {
              squadAverages[f.squadId] = { total: 0, count: 0, name: f.squadName };
            }
            const avgForFeedback = ratingCategories.reduce((sum, cat) => sum + (f[cat] || 0), 0) / 6;
            squadAverages[f.squadId].total += avgForFeedback;
            squadAverages[f.squadId].count += 1;
          }
        });

        const squadResults = Object.entries(squadAverages)
          .filter(([, v]) => v.count >= 2)
          .map(([id, v]) => ({ id, name: v.name, average: v.total / v.count }))
          .sort((a, b) => b.average - a.average);

        if (squadResults.length >= 2) {
          const best = squadResults[0];
          const worst = squadResults[squadResults.length - 1];
          if (best.average - worst.average >= 1) {
            patterns.push({
              type: 'squad',
              title: `${best.name} leads in satisfaction`,
              description: `${best.name} has the highest average rating at ${Math.round(best.average * 10) / 10}/10, while ${worst.name} averages ${Math.round(worst.average * 10) / 10}/10.`,
              significance: best.average - worst.average,
              direction: 'positive',
            });
          }
        }
      }

      // 4. Trend-based pattern
      if (trend !== null && Math.abs(trend) >= 0.3) {
        patterns.push({
          type: 'trend',
          title: trend > 0 ? 'Ratings are improving' : 'Ratings are declining',
          description: `Average ratings ${trend > 0 ? 'increased' : 'decreased'} by ${Math.abs(trend).toFixed(1)} points over the last 15 days compared to the previous period.`,
          significance: Math.abs(trend),
          direction: trend > 0 ? 'positive' : 'negative',
        });
      }

      // Sort patterns by significance and take top 3
      const topPatterns = patterns.sort((a, b) => b.significance - a.significance).slice(0, 3);

      // Build response
      const analyticsData = {
        overview: {
          overallAverage,
          totalFeedbackCount: filteredFeedback.length,
          categoryAverages,
          trend,
          trendPeriod: '15 days',
        },
        chartData,
        patterns: topPatterns,
        filters: {
          squadId: squadId || null,
          coachId: coachId || null,
          startDate: startDate || null,
          endDate: endDate || null,
        },
        meta: {
          squads: allSquads.filter(s => s.recordStatus === 'active').map(s => ({ id: s.id, name: s.squadName })),
          coaches: allCoaches.filter(c => c.recordStatus === 'active').map(c => ({ id: c.id, name: `${c.firstName} ${c.lastName}` })),
        },
      };

      res.json(analyticsData);
    } catch (error: any) {
      console.error("Error fetching feedback analytics:", error);
      res.status(500).json({ message: error.message || "Failed to fetch analytics" });
    }
  });

  // Session Attributes Analytics endpoint
  app.get("/api/feedback/analytics/attributes", async (req, res) => {
    try {
      const { attribute, category, squadId, coachId } = req.query;
      
      // Validate required parameters
      if (!attribute || !category) {
        return res.status(400).json({ message: "attribute and category are required" });
      }
      
      const validAttributes = ['dayOfWeek', 'timeOfDay', 'duration', 'focus', 'squad', 'staffing'];
      const validCategories = ['engagement', 'effortAndIntent', 'enjoyment', 'sessionClarity', 'appropriatenessOfChallenge', 'sessionFlow'];
      
      if (!validAttributes.includes(attribute as string)) {
        return res.status(400).json({ message: `Invalid attribute. Must be one of: ${validAttributes.join(', ')}` });
      }
      
      if (!validCategories.includes(category as string)) {
        return res.status(400).json({ message: `Invalid category. Must be one of: ${validCategories.join(', ')}` });
      }

      // Fetch all feedback with their sessions
      const allFeedback = await storage.getAllFeedback();
      const allSessions = await storage.getSessions();
      const allSquads = await storage.getSquads();
      
      // Create lookup maps
      const sessionMap = new Map(allSessions.map(s => [s.id, s]));
      const squadMap = new Map(allSquads.filter(s => s.recordStatus === 'active').map(s => [s.id, s.squadName]));
      
      // Filter feedback based on squad/coach filters
      let filteredFeedback = allFeedback.filter((f: SessionFeedback) => {
        const session = sessionMap.get(f.sessionId);
        if (!session) return false;
        if (squadId && session.squadId !== squadId) return false;
        if (coachId) {
          const isInvolved = session.leadCoachId === coachId || 
                            session.secondCoachId === coachId || 
                            session.helperId === coachId;
          if (!isInvolved) return false;
        }
        return true;
      });

      // Helper to get attribute value for a session
      const getAttributeValue = (session: any): string => {
        switch (attribute) {
          case 'dayOfWeek': {
            const date = new Date(session.sessionDate);
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            return days[date.getDay()];
          }
          case 'timeOfDay': {
            const hour = parseInt(session.startTime.split(':')[0]);
            if (hour < 12) return 'Morning';
            if (hour < 17) return 'Afternoon';
            return 'Evening';
          }
          case 'duration': {
            const mins = parseFloat(session.duration);
            if (mins <= 60) return '≤60 min';
            if (mins <= 90) return '60-90 min';
            return '>90 min';
          }
          case 'focus': {
            return session.focus || 'Unknown';
          }
          case 'squad': {
            return squadMap.get(session.squadId) || 'Unknown';
          }
          case 'staffing': {
            let count = 1; // Lead coach always present
            if (session.secondCoachId) count++;
            if (session.helperId) count++;
            return `${count} coach${count > 1 ? 'es' : ''}`;
          }
          default:
            return 'Unknown';
        }
      };

      // Group and aggregate data
      const aggregated: Record<string, { total: number; count: number }> = {};
      
      filteredFeedback.forEach((feedback: SessionFeedback) => {
        const session = sessionMap.get(feedback.sessionId);
        if (!session) return;
        
        const attrValue = getAttributeValue(session);
        const categoryValue = (feedback as any)[category as string] as number;
        
        if (!aggregated[attrValue]) {
          aggregated[attrValue] = { total: 0, count: 0 };
        }
        aggregated[attrValue].total += categoryValue;
        aggregated[attrValue].count++;
      });

      // Convert to array and sort by attribute order
      const getAttributeOrder = (attr: string, value: string): number => {
        if (attr === 'dayOfWeek') {
          const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
          const idx = order.indexOf(value);
          return idx >= 0 ? idx : 999;
        }
        if (attr === 'timeOfDay') {
          const order = ['Morning', 'Afternoon', 'Evening'];
          const idx = order.indexOf(value);
          return idx >= 0 ? idx : 999;
        }
        if (attr === 'duration') {
          const order = ['≤60 min', '60-90 min', '>90 min'];
          const idx = order.indexOf(value);
          return idx >= 0 ? idx : 999;
        }
        if (attr === 'staffing') {
          const order = ['1 coach', '2 coaches', '3 coaches'];
          const idx = order.indexOf(value);
          return idx >= 0 ? idx : 999;
        }
        // For focus, squad, and other attributes - sort alphabetically
        return 0;
      };

      const chartData = Object.entries(aggregated)
        .map(([name, data]) => ({
          name,
          rating: data.count > 0 ? Math.round((data.total / data.count) * 10) / 10 : 0,
          count: data.count,
        }))
        .sort((a, b) => {
          const orderA = getAttributeOrder(attribute as string, a.name);
          const orderB = getAttributeOrder(attribute as string, b.name);
          if (orderA !== orderB) return orderA - orderB;
          // Fallback to alphabetical for same order or unknown values
          return a.name.localeCompare(b.name);
        });

      res.json({
        attribute,
        category,
        chartData,
        totalEntries: filteredFeedback.length,
      });
    } catch (error: any) {
      console.error("Error fetching attribute analytics:", error);
      res.status(500).json({ message: error.message || "Failed to fetch attribute analytics" });
    }
  });

  // In-memory cache for AI insights (10 minute TTL)
  const insightsCache = new Map<string, { data: any; timestamp: number; dataHash: string }>();
  const INSIGHTS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  // AI-Powered Insights endpoint
  app.get("/api/feedback/analytics/insights", requireAuth, async (req, res) => {
    try {
      const { squadId, coachId, forceRefresh } = req.query;
      
      // Fetch all data
      const allFeedback = await storage.getAllFeedback();
      const allSessions = await storage.getSessions();
      const allSquads = await storage.getSquads();
      const allCoaches = await storage.getCoaches();
      
      // Create lookup maps
      const sessionMap = new Map(allSessions.map(s => [s.id, s]));
      const squadMap = new Map(allSquads.filter(s => s.recordStatus === 'active').map(s => [s.id, s.squadName]));
      const coachMap = new Map(allCoaches.filter(c => c.recordStatus === 'active').map(c => [c.id, `${c.firstName} ${c.lastName}`]));
      
      // Filter feedback based on squad/coach filters
      const filteredFeedback = allFeedback.filter((f: SessionFeedback) => {
        const session = sessionMap.get(f.sessionId);
        if (!session) return false;
        if (squadId && session.squadId !== squadId) return false;
        if (coachId) {
          const isInvolved = session.leadCoachId === coachId || 
                            session.secondCoachId === coachId || 
                            session.helperId === coachId;
          if (!isInvolved) return false;
        }
        return true;
      });

      if (filteredFeedback.length < 3) {
        return res.json({
          insights: null,
          message: "Not enough feedback data to generate insights (minimum 3 sessions required)",
          cached: false,
        });
      }

      // Create data hash for cache invalidation
      const dataHash = `${filteredFeedback.length}-${filteredFeedback.reduce((sum, f) => sum + f.engagement + f.enjoyment, 0)}`;
      const cacheKey = `${squadId || 'all'}-${coachId || 'all'}`;
      
      // Check cache
      const cached = insightsCache.get(cacheKey);
      if (!forceRefresh && cached && 
          Date.now() - cached.timestamp < INSIGHTS_CACHE_TTL && 
          cached.dataHash === dataHash) {
        return res.json({
          ...cached.data,
          cached: true,
          cachedAt: new Date(cached.timestamp).toISOString(),
        });
      }

      // Aggregate discipline data (swim, drill, kick, pull totals across all strokes)
      const disciplineStats: Record<string, { totalDistance: number; sessionCount: number; feedbackTotals: Record<string, number>; feedbackCount: number }> = {
        swim: { totalDistance: 0, sessionCount: 0, feedbackTotals: { engagement: 0, effortAndIntent: 0, enjoyment: 0, sessionClarity: 0, appropriatenessOfChallenge: 0, sessionFlow: 0 }, feedbackCount: 0 },
        drill: { totalDistance: 0, sessionCount: 0, feedbackTotals: { engagement: 0, effortAndIntent: 0, enjoyment: 0, sessionClarity: 0, appropriatenessOfChallenge: 0, sessionFlow: 0 }, feedbackCount: 0 },
        kick: { totalDistance: 0, sessionCount: 0, feedbackTotals: { engagement: 0, effortAndIntent: 0, enjoyment: 0, sessionClarity: 0, appropriatenessOfChallenge: 0, sessionFlow: 0 }, feedbackCount: 0 },
        pull: { totalDistance: 0, sessionCount: 0, feedbackTotals: { engagement: 0, effortAndIntent: 0, enjoyment: 0, sessionClarity: 0, appropriatenessOfChallenge: 0, sessionFlow: 0 }, feedbackCount: 0 },
      };

      // Aggregate stroke data
      const strokeStats: Record<string, { totalDistance: number; sessionCount: number; avgEnjoyment: number; avgEngagement: number; feedbackCount: number }> = {};
      const strokes = ['FrontCrawl', 'Backstroke', 'Breaststroke', 'Butterfly', 'IM'];
      strokes.forEach(s => {
        strokeStats[s] = { totalDistance: 0, sessionCount: 0, avgEnjoyment: 0, avgEngagement: 0, feedbackCount: 0 };
      });

      // Aggregate coach data
      const coachStats: Record<string, { name: string; sessionCount: number; totalRating: number; feedbackCount: number }> = {};
      
      // Process each feedback with its session
      filteredFeedback.forEach((f: SessionFeedback) => {
        const session = sessionMap.get(f.sessionId);
        if (!session) return;

        // Discipline aggregation
        const swimTotal = (session.totalFrontCrawlSwim || 0) + (session.totalBackstrokeSwim || 0) + 
                         (session.totalBreaststrokeSwim || 0) + (session.totalButterflySwim || 0) + 
                         (session.totalIMSwim || 0) + (session.totalNo1Swim || 0);
        const drillTotal = (session.totalFrontCrawlDrill || 0) + (session.totalBackstrokeDrill || 0) + 
                          (session.totalBreaststrokeDrill || 0) + (session.totalButterflyDrill || 0) + 
                          (session.totalIMDrill || 0) + (session.totalNo1Drill || 0);
        const kickTotal = (session.totalFrontCrawlKick || 0) + (session.totalBackstrokeKick || 0) + 
                         (session.totalBreaststrokeKick || 0) + (session.totalButterflyKick || 0) + 
                         (session.totalIMKick || 0) + (session.totalNo1Kick || 0);
        const pullTotal = (session.totalFrontCrawlPull || 0) + (session.totalBackstrokePull || 0) + 
                         (session.totalBreaststrokePull || 0) + (session.totalButterflyPull || 0) + 
                         (session.totalIMPull || 0) + (session.totalNo1Pull || 0);

        if (swimTotal > 0) {
          disciplineStats.swim.totalDistance += swimTotal;
          disciplineStats.swim.sessionCount++;
          disciplineStats.swim.feedbackTotals.engagement += f.engagement;
          disciplineStats.swim.feedbackTotals.enjoyment += f.enjoyment;
          disciplineStats.swim.feedbackTotals.effortAndIntent += f.effortAndIntent;
          disciplineStats.swim.feedbackCount++;
        }
        if (drillTotal > 0) {
          disciplineStats.drill.totalDistance += drillTotal;
          disciplineStats.drill.sessionCount++;
          disciplineStats.drill.feedbackTotals.engagement += f.engagement;
          disciplineStats.drill.feedbackTotals.enjoyment += f.enjoyment;
          disciplineStats.drill.feedbackTotals.effortAndIntent += f.effortAndIntent;
          disciplineStats.drill.feedbackCount++;
        }
        if (kickTotal > 0) {
          disciplineStats.kick.totalDistance += kickTotal;
          disciplineStats.kick.sessionCount++;
          disciplineStats.kick.feedbackTotals.engagement += f.engagement;
          disciplineStats.kick.feedbackTotals.enjoyment += f.enjoyment;
          disciplineStats.kick.feedbackCount++;
        }
        if (pullTotal > 0) {
          disciplineStats.pull.totalDistance += pullTotal;
          disciplineStats.pull.sessionCount++;
          disciplineStats.pull.feedbackTotals.engagement += f.engagement;
          disciplineStats.pull.feedbackTotals.enjoyment += f.enjoyment;
          disciplineStats.pull.feedbackCount++;
        }

        // Stroke aggregation
        strokes.forEach(stroke => {
          const strokeKey = `total${stroke}Swim` as keyof typeof session;
          const strokeDistance = (session[strokeKey] as number) || 0;
          if (strokeDistance > 0) {
            strokeStats[stroke].totalDistance += strokeDistance;
            strokeStats[stroke].sessionCount++;
            strokeStats[stroke].avgEnjoyment += f.enjoyment;
            strokeStats[stroke].avgEngagement += f.engagement;
            strokeStats[stroke].feedbackCount++;
          }
        });

        // Coach aggregation (lead coach)
        if (session.leadCoachId) {
          const coachName = coachMap.get(session.leadCoachId) || 'Unknown';
          if (!coachStats[session.leadCoachId]) {
            coachStats[session.leadCoachId] = { name: coachName, sessionCount: 0, totalRating: 0, feedbackCount: 0 };
          }
          const avgRating = (f.engagement + f.effortAndIntent + f.enjoyment + f.sessionClarity + f.appropriatenessOfChallenge + f.sessionFlow) / 6;
          coachStats[session.leadCoachId].sessionCount++;
          coachStats[session.leadCoachId].totalRating += avgRating;
          coachStats[session.leadCoachId].feedbackCount++;
        }
      });

      // Calculate averages
      const disciplineImpact = Object.entries(disciplineStats)
        .filter(([, v]) => v.feedbackCount >= 2)
        .map(([discipline, stats]) => ({
          discipline,
          avgDistance: Math.round(stats.totalDistance / stats.sessionCount),
          sessionCount: stats.sessionCount,
          avgEngagement: Math.round((stats.feedbackTotals.engagement / stats.feedbackCount) * 10) / 10,
          avgEnjoyment: Math.round((stats.feedbackTotals.enjoyment / stats.feedbackCount) * 10) / 10,
        }));

      const strokeImpact = Object.entries(strokeStats)
        .filter(([, v]) => v.feedbackCount >= 2)
        .map(([stroke, stats]) => ({
          stroke: stroke === 'FrontCrawl' ? 'Freestyle' : stroke,
          totalDistance: stats.totalDistance,
          sessionCount: stats.sessionCount,
          avgEnjoyment: Math.round((stats.avgEnjoyment / stats.feedbackCount) * 10) / 10,
          avgEngagement: Math.round((stats.avgEngagement / stats.feedbackCount) * 10) / 10,
        }));

      const coachInfluence = Object.entries(coachStats)
        .filter(([, v]) => v.feedbackCount >= 2)
        .map(([id, stats]) => ({
          coach: stats.name,
          sessionCount: stats.sessionCount,
          avgRating: Math.round((stats.totalRating / stats.feedbackCount) * 10) / 10,
        }))
        .sort((a, b) => b.avgRating - a.avgRating);

      // Overall category averages
      const categoryAverages: Record<string, number> = {};
      const categories = ['engagement', 'effortAndIntent', 'enjoyment', 'sessionClarity', 'appropriatenessOfChallenge', 'sessionFlow'];
      categories.forEach(cat => {
        const total = filteredFeedback.reduce((sum, f: any) => sum + (f[cat] || 0), 0);
        categoryAverages[cat] = Math.round((total / filteredFeedback.length) * 10) / 10;
      });

      // Build the AI prompt payload
      const payload = {
        filters: {
          squad: squadId ? squadMap.get(squadId as string) || 'Selected Squad' : 'All Squads',
          coach: coachId ? coachMap.get(coachId as string) || 'Selected Coach' : 'All Coaches',
        },
        overview: {
          totalSessions: filteredFeedback.length,
          overallAverage: Math.round(Object.values(categoryAverages).reduce((a, b) => a + b, 0) / 6 * 10) / 10,
        },
        categoryAverages,
        disciplineImpact,
        strokeImpact,
        coachInfluence: coachInfluence.slice(0, 5), // Top 5 coaches
      };

      // Call OpenAI for insights
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const systemPrompt = `You are an elite swimming performance analyst helping coaches improve their training sessions.
Analyze the provided JSON data and generate 4-6 specific, evidence-backed insights.
Every insight MUST cite exact numbers from the data - never invent statistics.
Focus on actionable recommendations that coaches can implement immediately.
Use markdown formatting with bold headers for each section.`;

      const userPrompt = `Context:
- Active filters: Squad = ${payload.filters.squad}, Coach = ${payload.filters.coach}
- Disciplines tracked: swim, drill, kick, pull (measured in metres)
- Strokes: Freestyle, Backstroke, Breaststroke, Butterfly, IM
- Feedback categories: Engagement, Effort & Intent, Enjoyment, Session Clarity, Challenge Level, Session Flow (all rated 1-10)

Analytics Data:
${JSON.stringify(payload, null, 2)}

Instructions:
1. Generate insights in these sections:
   - **Discipline Patterns**: How do different training types (drill, kick, swim) affect feedback scores?
   - **Stroke Sentiment**: Which strokes do swimmers enjoy most/least? Any concerning patterns?
   - **Coach Impact**: Any notable differences between coaches? What's working well?
   - **Recommendations**: 2-3 specific experiments the coaching team could try

2. For each insight, reference concrete figures (e.g., "Sessions with >1500m of drill work show higher Engagement (7.8 vs 6.6 baseline)")

3. If sample size is <10 for any metric, note this limitation

4. Highlight any concerning trends (ratings below 6.5) or positive outliers (above 8.0)

5. Keep total response under 400 words, using bullet points for clarity`;

      const response = await openai.chat.completions.create({
        model: 'gpt-5-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_completion_tokens: 1000,
      });

      const insightsText = response.choices[0]?.message?.content || 'Unable to generate insights.';

      const result = {
        insights: insightsText,
        dataUsed: payload,
        generatedAt: new Date().toISOString(),
      };

      // Cache the result
      insightsCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
        dataHash,
      });

      res.json({
        ...result,
        cached: false,
      });
    } catch (error: any) {
      console.error("Error generating AI insights:", error);
      res.status(500).json({ 
        message: error.message || "Failed to generate insights",
        insights: null,
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
