// Extend express-session to include custom session properties
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    userEmail?: string;
    authMethod?: 'email_password' | 'replit_oauth';
  }
}
