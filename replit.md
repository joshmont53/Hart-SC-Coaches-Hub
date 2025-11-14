# SwimCoach - Session Logging Platform

## Overview

SwimCoach is a professional swimming coaching session logging platform for poolside use on tablets and mobile devices. It enables coaches to record training sessions, track attendance, manage squads, and analyze performance data. The platform is designed with a mobile-first approach, prioritizing efficiency and usability in wet, poolside environments through generous touch targets and a clear visual hierarchy.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Tooling**: React with TypeScript, Vite for bundling, Wouter for client-side routing.
**UI/UX**: shadcn/ui (New York style) built on Radix UI primitives, styled with Tailwind CSS and custom HSL-based CSS variables. Features Inter font, mobile-first responsive design, and productivity-focused aesthetics.
**State Management**: TanStack Query for server state, React Hook Form with Zod for form state and validation, React context for authentication.
**Core Features**:
- **SessionDetail**: A three-tab interface for session metadata, rich-text session content with a sliding distance breakdown sidebar (showing stroke-by-stroke distances for 6 stroke types and 4 activity types), and an attendance register.
- **Attendance Register**: Manages swimmer attendance with status ('Present', '1st half only', '2nd half only', 'Absent') and notes ('-', 'Late', 'Very Late') dropdowns, initializing records for all squad swimmers and enforcing business rules (e.g., 'Absent' status forces notes to '-').

### Backend Architecture

**Runtime & API**: Node.js with Express.js, TypeScript. RESTful API with JSON responses and authentication via middleware.
**Data Access**: Drizzle ORM for type-safe PostgreSQL operations, abstracted via a storage interface pattern.
**AI Integration**: GPT-5 Mini via Replit AI for automated extraction of distance totals from natural language session text (targeting >95% accuracy), with a rule-based parser as fallback.
**Session Management**: Express sessions with a PostgreSQL store (`connect-pg-simple`), using HTTP-only secure cookies.
**Authentication**: Admin-controlled Email/Password Authentication with a single-email invitation flow. Features bcrypt hashing, crypto-secure tokens, Resend email integration, and role-based access control (`requireAdmin` middleware). All core entities now use a soft delete system (`record_status='active'` or `'inactive'`) for data preservation and audit trails, with read operations automatically filtering active records.

### Database Architecture

**Database**: PostgreSQL (Neon serverless).
**ORM**: Drizzle ORM for type-safe interactions.
**Schema**:
- **Core Entities**: `users`, `coaches`, `squads`, `swimmers`, `locations`, `swimming_sessions`, `attendance`.
- **Relationships**: Comprehensive relationships linking users to coaches, squads to coaches, swimmers to squads, sessions to various entities, and attendance to sessions/swimmers.
- **Data Model**: Uses UUID primary keys, timestamp tracking, and detailed stroke/distance tracking.
- **Soft Deletes**: Implemented across all core entities using a `record_status` column. Delete operations set `record_status='inactive'`, preserving data while making it invisible in standard views.
- **Validation**: Drizzle-Zod for schema validation.

## Authentication & Authorization

**Current System**: Email/Password Authentication with Admin-Controlled Invitations (Phase 3 Complete - November 2025)
- **Production-ready standalone authentication** - No external OAuth dependencies
- **Single-email invitation flow** - Invitation token proves email ownership (no separate verification needed)
- **Admin-controlled access** - No public registration, all users invited by administrators
- **End-to-end tested** - Complete flow validated: invitation → email → registration → login

**Email/Password Authentication** (November 2025 - Phase 3 Complete):

**Implementation Philosophy**:
- Admin-controlled invite system (no public registration)
- Single-email flow: invitation token proves email ownership
- Atomic database transactions for data consistency
- Race condition protection via optimistic locking
- Non-fatal email delivery with retry support
- Comprehensive error handling and status recovery

**Core Components**:
- `server/newAuth.ts` - Registration, login, session management, admin middleware
- `server/passwordUtils.ts` - bcrypt password hashing (10 rounds)
- `server/tokenUtils.ts` - Crypto-secure token generation
- `server/emailService.ts` - Resend email integration with HTML templates
- `server/routes.ts` - Invitation CRUD APIs (list, create, resend, revoke)
- `client/src/pages/manage-invitations.tsx` - Admin invitation management UI
- `client/src/pages/login-page.tsx` - Login interface
- `client/src/pages/registration-page.tsx` - Registration interface

**Database Schema**:
- `authorizedInvitations` - Invite tokens with status tracking (pending/processing/accepted/expired/revoked)
- `emailVerificationTokens` - 24-hour verification tokens (legacy - not used in single-email flow)
- `users` - Extended with password_hash, is_email_verified, account_status, role
- `coaches` - Enhanced with unique userId constraint for 1:1 linking

**Invitation Flow** (Admin Side):
1. Admin navigates to Invitations management page
2. Admin creates invitation: selects coach + enters email
3. Backend generates crypto-secure 48-hour invitation token
4. Email sent via Resend with branded HTML template
5. Invitation stored with status='pending'
6. Admin can resend emails or revoke invitations

**Registration & Login Flow** (Coach Side):
1. Coach receives invitation email with registration link
2. Coach clicks link → lands on registration page with pre-filled token
3. Coach submits: email, password, confirmation
4. Backend validates:
   - Invitation exists and not expired
   - Email matches invitation
   - User doesn't already exist
   - Coach exists in system
5. Atomic transaction:
   - Create user with hashed password
   - Link user to coach (coaches.userId)
   - Mark invitation 'accepted'
   - Auto-activate account (invitation proves email ownership)
6. Coach redirected to login page
7. Coach logs in with email/password
8. Session created, coach accesses platform

**Security Features**:
- Password complexity validation (min 12 chars, uppercase, lowercase, number, special char)
- bcrypt hashing with 10 rounds
- Invitation tokens: crypto-secure 32-byte hex strings (never exposed in API responses)
- Token sanitization: `sanitizeInvitation()` strips sensitive data from all API responses
- Atomic invitation claiming (WHERE status='pending')
- Race condition protection via status transitions
- Admin-only endpoints: requireAdmin middleware enforces role-based access
- HTTP-only secure cookies
- Session secrets from environment variables

**Email Configuration**:
- **Provider**: Resend API
- **Development Mode**: Uses `onboarding@resend.dev` sender (bypasses domain verification)
- **Production**: Configure verified domain in Resend dashboard
- **Template**: Professional HTML email with Hart SC branding
- **Environment Variables**: `RESEND_API_KEY`, `APP_URL` (or falls back to `REPLIT_DEV_DOMAIN`)

**Admin Role System**:
- Users can be granted `role='admin'` via direct database update
- Requires logout/login to take effect
- Admin users access invitation management via sidebar navigation
- All invitation endpoints protected by `requireAdmin` middleware

**Error Handling & Recovery**:
- Email mismatch → invitation not claimed (retriable)
- Duplicate user → invitation reverted to 'pending' (retriable)
- Missing coach → invitation reverted to 'pending' (retriable)
- Transaction failure → automatic rollback + invitation reverted (retriable)
- Stuck 'processing' invitation → auto-recovery to 'pending' (retriable)
- Email delivery failure → 201 success with warning (admin can resend)
- Already-used invitation → clear message to log in instead
- Expired/revoked invitation → clear error message

**Testing & Validation** (November 14, 2025):
- ✅ End-to-end flow tested: admin creates → email sent → coach registers → coach logs in
- ✅ Invitation status properly transitions: pending → accepted
- ✅ Email delivery via Resend confirmed
- ✅ Security audit passed: no token leaks in API responses
- ✅ Date handling verified: proper null checks for createdAt/expiresAt/acceptedAt
- ✅ URL generation fixed: uses proper Replit dev domain (not localhost)

**Legacy Replit OAuth** (Deprecated):
- Passport.js OIDC authentication still configured but not actively used
- To be removed in future cleanup phase
- Email/password authentication is now the primary and recommended system

## External Dependencies

### Third-Party Services

-   **Database Hosting**: Neon Serverless PostgreSQL
-   **Font Delivery**: Google Fonts CDN (Inter font family)
-   **AI Integration**: Replit AI (GPT-5 Mini)
-   **Email Service**: Resend API

### Key NPM Packages

-   **Frontend**: `react`, `react-dom`, `wouter`, `@tanstack/react-query`, `react-hook-form`, `zod`, `@radix-ui/*`, `tailwindcss`, `class-variance-authority`, `lucide-react`.
-   **Backend**: `express`, `drizzle-orm`, `@neondatabase/serverless`, `express-session`, `connect-pg-simple`, `bcrypt`, `jsonwebtoken`, `nodemailer`.
-   **Development**: `vite`, `typescript`, `tsx`, `drizzle-kit`, `esbuild`.