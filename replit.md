# SwimCoach - Session Logging Platform

## Overview
SwimCoach is a professional swimming coaching session logging platform designed for poolside use on tablets and mobile devices. Its primary purpose is to enable coaches to record training sessions, manage competitions, track attendance, manage squads, and analyze performance data. The platform prioritizes efficiency and usability in wet environments through a mobile-first approach with generous touch targets and a clear visual hierarchy. Key capabilities include comprehensive competition management, integrated session and competition calendars, and a robust session library for template management and reuse. The business vision is to provide a reliable, feature-rich tool that enhances coaching effectiveness and streamlines administrative tasks, offering significant market potential in the athletic coaching sector.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is built with React and TypeScript, using Vite for bundling and Wouter for routing. The UI/UX leverages shadcn/ui (New York style) based on Radix UI primitives, styled with Tailwind CSS and custom HSL-based CSS variables, featuring the Inter font and a mobile-first responsive design. State management is handled by TanStack Query for server state, React Hook Form with Zod for form validation, and React context for authentication.
Core features include:
- **Session & Competition Calendar**: Displays sessions and competitions with distinct visual cues (e.g., diagonal stripes for competitions).
- **Session Detail View**: A three-tab interface for metadata, rich-text content with a distance breakdown sidebar, and attendance.
- **Competition Management**: Admin-only functionality to create, edit, and delete competitions, including coach assignments with time blocks.
- **Attendance Register**: Manages swimmer attendance with status and notes, enforcing business rules.
- **Session Library**: A template management system allowing coaches to create, edit, store, and reuse session content, integrated with the session editor.
- **Drills Library**: A comprehensive drill management system with stroke-based filtering (Freestyle, Backstroke, Breaststroke, Butterfly, Starts, Turns), real-time search, YouTube video embedding, and full CRUD operations. Features color-coded badges, permission-based edit/delete controls, and responsive card layout.

### Backend
The backend uses Node.js with Express.js and TypeScript, providing a RESTful API with JSON responses. Drizzle ORM is used for type-safe PostgreSQL operations, abstracted via a storage interface. AI integration is provided by GPT-5 Mini via Replit AI for automated distance extraction from session text, with a rule-based parser fallback. Session management uses Express sessions with a PostgreSQL store and secure HTTP-only cookies. Authentication is admin-controlled Email/Password based, featuring bcrypt hashing, crypto-secure tokens, Resend email integration, and role-based access control. A soft delete system (`record_status`) is implemented across core entities for data preservation.

### Database
The system utilizes a PostgreSQL database hosted on Neon Serverless, with Drizzle ORM for type-safe interactions. The schema includes core entities such as `users`, `coaches`, `squads`, `swimmers`, `locations`, `swimming_sessions`, `attendance`, `competitions`, `competition_coaching`, `session_templates`, and `drills`. Relationships are comprehensive, linking various entities. The data model uses UUID primary keys, timestamp tracking, detailed stroke/distance tracking, template content storage (both plain text and rich HTML), and drill metadata (name, stroke type, description, video URL). Soft deletes are implemented using a `record_status` column across all core entities.

### Authentication & Authorization
The authentication system is a production-ready, standalone Email/Password authentication with an admin-controlled invitation flow, eliminating external OAuth dependencies. It features a single-email invitation process where the token proves email ownership. Key security features include bcrypt hashing, crypto-secure tokens, atomic database transactions, and role-based access control with `requireAdmin` middleware. The system supports a robust invitation flow from admin creation to coach registration and login, with comprehensive error handling and recovery mechanisms.

## External Dependencies

### Third-Party Services
-   **Database Hosting**: Neon Serverless PostgreSQL
-   **Font Delivery**: Google Fonts CDN
-   **AI Integration**: Replit AI (GPT-5 Mini)
-   **Email Service**: Resend API

### Key NPM Packages
-   **Frontend**: `react`, `react-dom`, `wouter`, `@tanstack/react-query`, `react-hook-form`, `zod`, `@radix-ui/*`, `tailwindcss`, `class-variance-authority`, `lucide-react`.
-   **Backend**: `express`, `drizzle-orm`, `@neondatabase/serverless`, `express-session`, `connect-pg-simple`, `bcrypt`.