# SwimCoach - Session Logging Platform

## Overview

SwimCoach is a professional swimming coaching session logging platform designed for poolside use on tablets and mobile devices. The application enables coaches to record detailed training sessions, track swimmer attendance, manage squads, and analyze performance data. Built with a mobile-first approach, it prioritizes efficiency and usability in wet, poolside environments with generous touch targets and clear visual hierarchy.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript, using Vite as the build tool and bundler.

**Routing**: Client-side routing implemented with Wouter, a lightweight routing library that provides a simple API for single-page application navigation.

**UI Component System**: shadcn/ui components (New York style variant) built on Radix UI primitives. This provides:
- Accessible, unstyled component primitives from Radix UI
- Customizable components styled with Tailwind CSS
- Consistent design system across the application

**Styling Approach**: Tailwind CSS with custom CSS variables for theming. The design system uses:
- Inter font family via Google Fonts CDN
- HSL-based color system with CSS custom properties for easy theme switching
- Mobile-first responsive design with defined breakpoints
- Productivity-focused design inspired by Linear and Notion

**State Management**: 
- TanStack Query (React Query) for server state management, data fetching, and caching
- React Hook Form with Zod for form state and validation
- React context for auth state

**Key Design Principles**:
- Mobile-first with generous touch targets (minimum 44px)
- Progressive disclosure - complex features hidden until needed
- Instant visual feedback for all user actions
- Information density balanced with clarity

### Backend Architecture

**Runtime**: Node.js with Express.js framework

**Language**: TypeScript throughout (shared types between frontend and backend)

**API Design**: RESTful API with JSON responses
- Authentication-protected endpoints via middleware
- Structured route handlers in `server/routes.ts`
- Centralized data access through storage layer abstraction

**Data Access Layer**: Storage interface pattern (`server/storage.ts`) provides:
- Abstraction over database operations
- Type-safe CRUD operations for all entities
- Separation of concerns between route handlers and data access

**AI-Powered Session Parsing** (November 2025):
- **Purpose**: Automatically extract distance totals from natural language session text written by coaches
- **Implementation**: GPT-5 Mini via Replit AI Integrations (`server/aiParser.ts`)
- **Accuracy**: Targets >95% accuracy (improved from ~75% baseline of rule-based parser)
- **Flow**: 
  1. Frontend debounces session text input (800ms delay)
  2. POST to `/api/sessions/parse-ai` endpoint
  3. AI analyzes text for stroke types, activity types, and distances
  4. Validation ensures distances are multiples of 25m/50m
  5. Falls back to rule-based parser if AI fails
  6. Returns 24 distance fields (6 strokes × 4 activity types)
- **Cost**: ~0.5-1 Replit credit per session (~$5-10/year for 1,000 sessions)
- **Integration**: Configured in `replit.nix` with `OPENAI_API_KEY` environment variable
- **Strokes**: Front Crawl (FC), Backstroke (BK), Breaststroke (BR), Butterfly (FL), IM, No1 (swimmer's choice)
- **Activities**: Swim, Drill, Kick, Pull
- **Prompt Engineering**: Comprehensive parsing rules for abbreviations, multipliers, breakdowns, and edge cases
- **Legacy**: Rule-based parser (`shared/sessionParser.ts`) maintained as fallback only

**Session Management**: 
- Express sessions with PostgreSQL session store (connect-pg-simple)
- Server-side session storage in dedicated `sessions` table
- HTTP-only secure cookies with 1-week TTL

**Development Environment**:
- Hot module replacement via Vite in development
- Express middleware mode for Vite integration
- Custom logging middleware for API request tracking

### Database Architecture

**ORM**: Drizzle ORM for type-safe database operations

**Database**: PostgreSQL (via Neon serverless PostgreSQL)
- WebSocket-based connection pooling
- Environment-based connection string configuration

**Schema Design**:

**Core Entities**:
- `users` - Authentication and profile data (linked to Replit OAuth)
- `coaches` - Coaching staff with qualifications and details
- `squads` - Training groups with primary coach assignments
- `swimmers` - Athlete records with squad membership and ASA numbers
- `locations` - Pool facilities with type classification
- `swimming_sessions` - Training session records with comprehensive stroke/distance tracking
- `attendance` - Session attendance tracking with two separate fields:
  - `status` field: Records attendance presence/duration with options: Present, First Half Only, Second Half Only, Absent (defaults to "Present")
  - `notes` field: Records timeliness with options: null (blank), Late, Very Late (defaults to null)
  - Records are created for ALL swimmers in a squad (not just attendees)
  - When status is "Absent", notes must be null (enforced in both frontend and backend)

**Key Relationships**:
- Users → Coaches (one-to-one via userId foreign key)
- Squads → Coaches (many-to-one via primaryCoachId)
- Swimmers → Squads (many-to-one via squadId)
- Sessions → Multiple foreign keys (poolId, squadId, leadCoachId, optional secondCoachId/helperId/setWriterId)
- Attendance → Sessions and Swimmers (junction table with status tracking)

**Data Model Characteristics**:
- UUID primary keys generated via PostgreSQL `gen_random_uuid()`
- Timestamp tracking (createdAt/updatedAt) on most entities
- Comprehensive stroke distance tracking (swim/drill/kick/pull for each stroke type)
- Flexible coach assignment (lead, second, helper, set writer roles)

**Schema Validation**: Drizzle-Zod integration generates Zod schemas from database schema for runtime validation

### Authentication & Authorization

**Provider**: Replit OAuth (OpenID Connect)

**Implementation**:
- Passport.js strategy for OIDC authentication
- Server-side session management with PostgreSQL storage
- User profile synchronization on login
- Protected routes via `isAuthenticated` middleware

**User Flow**:
- Unauthenticated users see landing page with login button
- Authentication redirects to Replit OAuth
- Successful auth creates/updates user record and establishes session
- Frontend queries `/api/auth/user` to check authentication status
- Client-side routing protects authenticated pages

**Security Measures**:
- HTTP-only secure cookies
- Session secrets from environment variables
- CSRF protection via session tokens
- Credentials included in fetch requests

## External Dependencies

### Third-Party Services

**Authentication**: Replit OAuth (OpenID Connect provider)
- User identity and profile management
- Single sign-on for Replit users

**Database Hosting**: Neon Serverless PostgreSQL
- Managed PostgreSQL with WebSocket support
- Connection pooling and serverless scaling
- Configured via `DATABASE_URL` environment variable

**Font Delivery**: Google Fonts CDN
- Inter font family (weights: 400, 500, 600, 700)

### Key NPM Packages

**Frontend Core**:
- `react` & `react-dom` - UI framework
- `wouter` - Lightweight client-side routing
- `@tanstack/react-query` - Server state management
- `react-hook-form` - Form state management
- `zod` & `@hookform/resolvers` - Schema validation

**UI Components**:
- `@radix-ui/*` - Accessible component primitives (20+ components)
- `tailwindcss` - Utility-first CSS framework
- `class-variance-authority` - Component variant management
- `lucide-react` - Icon library

**Backend Core**:
- `express` - Web framework
- `drizzle-orm` - Type-safe ORM
- `@neondatabase/serverless` - PostgreSQL client
- `passport` & `openid-client` - Authentication
- `express-session` & `connect-pg-simple` - Session management

**Development Tools**:
- `vite` - Build tool and dev server
- `typescript` - Type system
- `tsx` - TypeScript execution
- `drizzle-kit` - Database migration tool
- `esbuild` - Production bundler for server code

### Build & Deployment Configuration

**Development**: `NODE_ENV=development tsx server/index.ts`
- Vite dev server in middleware mode
- HMR for frontend changes
- TypeScript execution without compilation

**Production Build**: 
- Frontend: Vite builds to `dist/public`
- Backend: esbuild bundles server to `dist/index.js`
- Platform: Node.js with ESM modules

**Environment Requirements**:
- `DATABASE_URL` - PostgreSQL connection string (required)
- `SESSION_SECRET` - Session encryption key (required)
- `ISSUER_URL` - OIDC issuer URL (defaults to Replit)
- `REPL_ID` - Replit environment identifier (for OAuth client ID)