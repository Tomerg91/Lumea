# Tech Context

**🚀 MAJOR UPDATE: Supabase Migration Near Complete - Real-time Features Implemented**

Technologies used: Frontend: React (`^18.3.1`) with TypeScript (`5.8.3`), Tailwind CSS (`^3.4.11`), i18next, Vite (`^5.4.1`). Backend: **Supabase-first architecture** - **Supabase** for PostgreSQL database, JWT authentication, storage, and real-time features. **Legacy systems fully migrated**: Node.js/Express API endpoints (migrated to Supabase), Prisma ORM (replaced), MongoDB/Mongoose interactions (migrated). **Redis** still used for caching. Native Wrapper: Capacitor (`^7.2.0`).

Development setup: Project structure using npm workspaces (`client`, `server`). Configuration managed via .env files (including Supabase URL/keys). **Supabase CLI** for database management and local development. 

**Migration Status**: 
- ✅ **Database schema complete** (Epic 8.1) - Unified Supabase PostgreSQL with RLS policies
- ✅ **Authentication complete** (Epic 8.2) - Full Supabase JWT authentication replacing Passport.js
- ✅ **Data migration complete** (Epic 8.3) - Infrastructure ready for production data transfer
- ✅ **API migration complete** (Epic 8.4) - All backend controllers using Supabase client
- ✅ **File storage complete** (Epic 8.5) - Supabase Storage with 5 buckets configured
- ✅ **Row Level Security complete** (Epic 8.6) - Comprehensive multi-tenant security policies
- ✅ **Real-time features complete** (Epic 8.7) - Full real-time subscription system with React hooks
- 🔄 **React frontend integration** (Epic 8.8) - In progress
- ⏳ **TypeScript integration** (Epic 8.9) - Pending

**Current Architecture:**
- **Database**: Supabase PostgreSQL with 16 core tables, RLS policies, performance indexes
- **Authentication**: Unified Supabase Auth with JWT tokens (frontend + backend)
- **API**: Express.js backend with Supabase client (all controllers migrated)
- **Storage**: Supabase Storage buckets (profiles, resources, audio-notes, documents, session-files)
- **Real-time**: Comprehensive subscription system with authentication-based filtering
- **Frontend**: React with Supabase client integration (in progress)

**Key Files:**
- Database: `supabase/migrations/*.sql` (5 migration files)
- Auth: `server/src/middleware/supabaseAuth.ts`, `client/src/lib/api.ts`
- Real-time: `client/src/services/realtimeService.ts`, `client/src/hooks/useRealtime.ts`
- Storage: `server/src/lib/storageAdapter.ts`, `server/src/lib/supabaseFileStorage.ts`
- Config: `supabase/config.toml`, `.env` files

**Next Phase**: React frontend integration to use Supabase client directly in components.

Development setup: Project structure using npm workspaces (`client`, `server`). Configuration managed via .env files (including Supabase URL/keys). **Supabase CLI** for database management and local development. **Migration Status**: Backend migration complete, frontend integration in progress. CI/CD pipeline with GitHub Actions (`.github/workflows/typecheck.yml`). TypeScript (`5.8.3`) for type checking (client check: `npm --workspace client run typecheck`). Client TS config isolated via `client/tsconfig.json` extending `client/tsconfig.base.json`. Root `package.json` uses `overrides` for TS and React types. Performance monitoring via custom metrics collection.

Technical constraints: Application must be bilingual (Hebrew/RTL default, English/LTR secondary). Must meet WCAG 2.1 AA accessibility guidelines. No real-time chat, integrated payments, or automatic calendar sync (within MVP). High security standards required (**now handled by Supabase RLS policies**, HTTPS). Mobile performance optimization required for low-end devices and poor network conditions.

Dependencies:
- **Key Libraries:** `react@^18.3.1`, `react-dom@^18.3.1`, `react-router-dom@^6.30.0`, `tailwindcss@^3.4.11`, `i18next@^25.0.1`, **`@supabase/supabase-js@^2.49.4`** (primary), `typescript@5.8.3`, `vite@^5.4.1`.
- **React Types:** `@types/react@18.3.20`, `@types/react-dom@18.3.7` (exact versions, client dev dep).
- **UI/Utils (Client):** `@radix-ui/*`, `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tailwindcss-animate`, `zod`, `react-hook-form`, `embla-carousel-react`, `react-day-picker`, `date-fns`, `recharts`, `sonner`, `input-otp`, `vaul`.
- **Server/Performance:** `redis`, `compression`, `node-cache`, `express-rate-limit`, `helmet` (legacy, being phased out).
- **Build Optimization:** `rollup-plugin-visualizer`, `vite-plugin-compression2`.
- **Node.js:** `>= 20.0.0` required for development and deployment.
- **Native:** Capacitor (`@capacitor/core@^7.2.0`, `@capacitor/cli@^7.2.0`, etc.).

Tool usage patterns: Development involves interaction with AI code generation tools requiring review. Standard code editors and version control (Git). **Supabase Dashboard/CLI** for backend configuration and schema management (primary). TypeScript (`5.8.3`) for type checking. ESLint for code quality. GitHub Actions for CI/CD (using `npm --workspace client run typecheck`). Npm workspaces and overrides for dependency management. Redis for caching frequently accessed data. **Supabase local development** with `supabase start/stop/db reset`. Bundle analyzer for optimizing JS bundle size.

# Technical Context

## 🚀 **Current Architecture: Supabase Migration Near Complete**

**Migration Status**: Epic 8 - Technical Excellence & Supabase Migration
- ✅ **8.1: Database Schema Migration** - Complete unified schema ready
- ✅ **8.2: Authentication Migration** - Complete JWT-based Supabase Auth
- ✅ **8.3: Data Migration Infrastructure** - Complete migration scripts ready
- ✅ **8.4: API Migration** - Complete backend using Supabase client
- ✅ **8.5: File Storage Migration** - Complete Supabase Storage integration
- ✅ **8.6: Row Level Security** - Complete multi-tenant security policies
- ✅ **8.7: Real-time Features** - Complete subscription system with React hooks
- 🔄 **8.8: React Frontend Integration** - In Progress (Next)
- ⏳ **8.9: TypeScript Integration** - Pending

## Core Technologies

*   **Frontend:**
    *   Framework: React 18 with TypeScript
    *   Build Tool: Vite
    *   Styling: Tailwind CSS (with `tailwindcss-animate`, `tailwindcss-rtl`)
    *   State Management/Data Fetching: **Supabase client with real-time subscriptions** (migrating from `@tanstack/react-query`)
    *   Routing: `react-router-dom` v6
    *   Forms: `react-hook-form` with `zod` for validation
    *   UI Components: Radix UI primitives, custom components, `lucide-react` icons, `sonner` for toasts, `recharts` for charts.
    *   i18n: `i18next`, `react-i18next`
    *   Mobile: Capacitor (Core, Network, potentially others)
    *   **Real-time**: Custom hooks (`useRealtime.ts`) for live data subscriptions

*   **Backend (Current Supabase Architecture):**
    *   **Database**: Supabase PostgreSQL with comprehensive schema (16 tables)
    *   **Authentication**: Supabase Auth with JWT tokens (complete)
    *   **Storage**: Supabase Storage with 5 buckets (profiles, resources, audio-notes, documents, session-files)
    *   **Real-time**: Supabase real-time subscriptions with authentication-based filtering
    *   **Security**: Row Level Security (RLS) policies for multi-tenant access (complete)
    *   **Functions**: Supabase Edge Functions (for complex operations)
    *   **API**: Express.js backend using Supabase client (all controllers migrated)

*   **Backend (Legacy - Fully Migrated):**
    *   Runtime: Node.js (>= v20)
    *   Framework: Express.js with TypeScript (now using Supabase client)
    *   Database: ~~MongoDB Atlas~~ (migrated to Supabase)
    *   ORM/ODM: ~~Prisma~~ (replaced), ~~Mongoose~~ (migrated)
    *   Session Store: ~~`connect-pg-simple`~~ (replaced with JWT)
    *   Authentication: ~~Passport.js~~ (replaced with Supabase Auth)
    *   File Storage: ~~AWS S3~~ (migrated to Supabase Storage)
    *   Email: Nodemailer via SMTP configuration

*   **Shared:** TypeScript types defined in `shared/` directory (being updated for Supabase).

## **Supabase Schema Overview**

**16 Core Tables with Full RLS:**
- `users` (extends auth.users), `sessions`, `payments`, `reflections`, `resources`, `resource_users`
- `coach_notes`, `files`, `notifications`, `calendar_integrations`, `calendar_events`
- `audit_logs`, `consents`, `password_reset_tokens`, `performance_metrics`, `session_feedback`

**Security Features:**
- Multi-tenant RLS policies for coach-client data separation (complete)
- Comprehensive audit logging for compliance
- Automated triggers for data consistency
- Business logic functions for metrics and operations

**Storage Buckets:**
- `profiles` (public), `resources` (private), `audio-notes` (private), `documents` (private), `session-files` (private)

**Real-time Features:**
- Authentication-based automatic subscriptions
- Role-based filtering (coach vs client access)
- Privacy controls for coach notes (private vs shared)
- Connection management and cleanup
- Generic table subscription method

## Development Setup & Tools

*   **Package Manager:** npm (using workspaces for `client` and `server`)
*   **Linting:** ESLint (with TypeScript plugin, Prettier integration)
*   **Formatting:** Prettier
*   **Type Checking:** TypeScript (`tsc`)
*   **Database Management:** **Supabase CLI** (`supabase start/stop/db reset/db push`)
*   **Testing:**
    *   Frontend: Vitest with `jsdom`, `@testing-library/react`
    *   Backend: Jest (migrated to Supabase testing)
    *   RLS Tests: Vitest (`supabase/tests/rls.spec.ts`)
    *   Real-time Tests: Vitest (`client/src/tests/realtimeService.test.ts`)
*   **Version Control:** Git hosted on GitHub.
*   **CI/CD:** GitHub Actions (`.github/workflows/ci.yml`, `release-mobile.yml`).
*   **Deployment Target:** Vercel (configured via `vercel.json`) + Supabase hosted database.

## Technical Constraints & Considerations

*   **Node.js Version:** Requires v20+.
*   **Monorepo Structure:** Requires careful dependency management and build scripts using npm workspaces.
*   **Bilingual Support (Hebrew RTL):** Requires careful CSS handling (`tailwindcss-rtl`) and i18n implementation.
*   **Supabase Integration:** Environment variables must be configured for Supabase URL and anon key.
*   **TypeScript Strictness:** Currently disabled (`strict: false`). Enabling strict mode is a high-priority task for stability but will require significant code adjustments.
*   **Authentication Flow:** **Complete JWT-based Supabase Auth** with RLS policies.
*   **Database Choice:** **Primary: Supabase PostgreSQL**. Legacy systems fully migrated.

## Key Libraries & Dependencies (Highlights)

*   **`@supabase/supabase-js`**: Primary backend integration (database, auth, storage, real-time).
*   `@tanstack/react-query`: Central to frontend data fetching and caching (being migrated to Supabase client).
*   `radix-ui`: Foundation for many UI components.
*   `i18next`: Handles internationalization.
*   **Migrated/Removed**: ~~`express-session`~~, ~~`connect-pg-simple`~~, ~~`passport`~~, ~~`mongoose`~~, ~~`prisma`~~.
*   `vite`: Frontend build and development server.
*   `tailwindcss`: Utility-first CSS framework.
*   `capacitor`: For potential mobile app builds.

## Tool Usage Patterns

*   `npm run dev`: Starts client and server concurrently for local development.
*   `npm run build`: Builds both client and server for production.
*   `npm run install:all`: Installs dependencies for root and workspaces.
*   `npm run lint`: Runs ESLint checks.
*   `npm test`: Runs backend (Jest) and frontend (Vitest) tests.
*   `npm run ci-all`: Used in GitHub Actions for linting, type checking, and testing.
*   **`supabase start`**: Starts local Supabase instance for development.
*   **`supabase db reset`**: Applies all migrations to local database.
*   **`supabase db push`**: Pushes schema changes to remote database.
*   **`supabase gen types typescript`**: Generates TypeScript types from database schema.
*   `vercel dev`: Can be used for local testing of Vercel deployment environment.
