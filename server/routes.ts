import type { Express } from "express";
import { createServer, type Server } from "http";
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
} from "@shared/schema";
import { sendInvitationEmail } from "./emailService";
import { randomBytes } from "crypto";
import { calculateSessionDistancesAI, validateDistances } from "./aiParser";
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
      const session = await storage.createSession(validatedData);
      res.json(session);
    } catch (error: any) {
      console.error("Error creating session:", error);
      res.status(400).json({ message: error.message || "Failed to create session" });
    }
  });

  app.put("/api/sessions/:id", requireAuth, async (req, res) => {
    try {
      const validatedData = insertSwimmingSessionSchema.partial().parse(req.body);
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

  const httpServer = createServer(app);
  return httpServer;
}
