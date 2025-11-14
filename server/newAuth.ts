// New Email/Password Authentication endpoints
// Separate from existing Replit OAuth (server/replitAuth.ts)
import { Express, RequestHandler } from 'express';
import { storage } from './storage';
import { hashPassword, verifyPassword } from './passwordUtils';
import { generateSecureToken, getInvitationExpiry, getVerificationExpiry, isTokenExpired } from './tokenUtils';
import { sendInvitationEmail, sendVerificationEmail } from './emailService';
import crypto from 'crypto';

/**
 * Setup new email/password authentication routes
 * These are separate from the existing Replit OAuth routes
 */
export function setupNewAuth(app: Express) {
  
  // Register endpoint - validates invitation token and creates user account
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { inviteToken, password, email } = req.body;
      
      // Validate required fields
      if (!inviteToken || !password || !email) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      // Validate password strength (min 12 characters)
      if (password.length < 12) {
        return res.status(400).json({ message: 'Password must be at least 12 characters' });
      }
      
      // Find invitation by token
      const invitation = await storage.getInvitationByToken(inviteToken);
      
      if (!invitation) {
        return res.status(400).json({ message: 'Invalid invitation token' });
      }
      
      // Check if invitation is expired
      if (isTokenExpired(invitation.expiresAt)) {
        return res.status(400).json({ message: 'Invitation has expired' });
      }
      
      // Check if invitation is still pending
      if (invitation.status !== 'pending') {
        return res.status(400).json({ message: 'Invitation has already been used' });
      }
      
      // Verify email matches invitation
      if (invitation.email.toLowerCase() !== email.toLowerCase()) {
        return res.status(400).json({ message: 'Email does not match invitation' });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }
      
      // Get coach details for the user
      const coach = await storage.getCoach(invitation.coachId);
      if (!coach) {
        return res.status(400).json({ message: 'Coach profile not found' });
      }
      
      // Hash password
      const passwordHash = await hashPassword(password);
      
      // Generate user ID (using email as base for consistency)
      const userId = crypto.randomUUID();
      
      // Create user account
      const user = await storage.createUser({
        id: userId,
        email: email.toLowerCase(),
        firstName: coach.firstName,
        lastName: coach.lastName,
        passwordHash,
        isEmailVerified: false, // Will be verified via email
        accountStatus: 'pending', // Active after email verification
        role: 'coach',
      });
      
      // Link user to coach profile
      await storage.updateCoach(invitation.coachId, { userId: user.id });
      
      // Mark invitation as accepted
      await storage.updateInvitationStatus(invitation.id, 'accepted', new Date());
      
      // Generate email verification token
      const verificationToken = generateSecureToken();
      await storage.createVerificationToken({
        userId: user.id,
        token: verificationToken,
        expiresAt: getVerificationExpiry(),
      });
      
      // Send verification email
      await sendVerificationEmail(user.email!, verificationToken, user.firstName!);
      
      res.status(201).json({ 
        message: 'Registration successful. Please check your email to verify your account.',
        userId: user.id,
      });
      
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(500).json({ message: error.message || 'Registration failed' });
    }
  });
  
  // Email verification endpoint
  app.get('/api/auth/verify-email', async (req, res) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: 'Invalid verification token' });
      }
      
      // Find verification token
      const verificationToken = await storage.getVerificationToken(token);
      
      if (!verificationToken) {
        return res.status(400).json({ message: 'Invalid or expired verification link' });
      }
      
      // Check if token is expired
      if (isTokenExpired(verificationToken.expiresAt)) {
        await storage.deleteVerificationToken(verificationToken.id);
        return res.status(400).json({ message: 'Verification link has expired' });
      }
      
      // Get user
      const user = await storage.getUser(verificationToken.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Update user to verified and active
      await storage.upsertUser({
        ...user,
        isEmailVerified: true,
        accountStatus: 'active',
      });
      
      // Delete used verification token
      await storage.deleteVerificationToken(verificationToken.id);
      
      res.json({ 
        message: 'Email verified successfully. You can now log in.',
        success: true,
      });
      
    } catch (error: any) {
      console.error('Email verification error:', error);
      res.status(500).json({ message: error.message || 'Verification failed' });
    }
  });
  
  // Login endpoint - validates email and password
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }
      
      // Find user by email
      const user = await storage.getUserByEmail(email.toLowerCase());
      
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      // Verify password
      const isValidPassword = await verifyPassword(password, user.passwordHash);
      
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      // Check if email is verified
      if (!user.isEmailVerified) {
        return res.status(403).json({ message: 'Please verify your email before logging in' });
      }
      
      // Check account status
      if (user.accountStatus !== 'active') {
        return res.status(403).json({ message: 'Your account is not active. Please contact administrator.' });
      }
      
      // TODO: Create session (will be implemented with proper session management)
      // For now, just return user data
      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      });
      
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ message: error.message || 'Login failed' });
    }
  });
  
  // Check authentication status
  app.get('/api/auth/status', async (req, res) => {
    // TODO: Implement session checking in Phase 2
    // For now, return unauthenticated
    res.json({ authenticated: false });
  });
}

// Middleware to check if user is authenticated (for new auth system)
// This is separate from the existing isAuthenticated middleware for Replit auth
export const requireAuth: RequestHandler = async (req, res, next) => {
  // TODO: Implement session checking in Phase 2
  // For now, just pass through
  next();
};
