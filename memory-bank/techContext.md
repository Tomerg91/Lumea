# Tech Context

**🚀 MAJOR UPDATE: Platform Near Production-Ready - Performance Optimized & Payment System Complete**

Technologies used: Frontend: React (`^18.3.1`) with TypeScript (`5.8.3`), Tailwind CSS (`^3.4.11`), i18next, Vite (`^5.4.1`) **with performance-first architecture**. Backend: **Supabase-first architecture** - **Supabase** for PostgreSQL database, JWT authentication, storage, and real-time features. **Legacy systems fully migrated**: Node.js/Express API endpoints (migrated to Supabase), Prisma ORM (replaced), MongoDB/Mongoose interactions (migrated). **Redis** still used for caching. Native Wrapper: Capacitor (`^7.2.0`). **NEW: Automated performance monitoring, comprehensive payment management system**.

Development setup: Project structure using npm workspaces (`client`, `server`). Configuration managed via .env files (including Supabase URL/keys). **Supabase CLI** for database management and local development. **GitHub Actions CI/CD** with automated performance budgets, bundle analysis, and quality gates.

**Migration Status**: 
- ✅ **Database schema complete** (Epic 8.1) - Unified Supabase PostgreSQL with RLS policies
- ✅ **Authentication complete** (Epic 8.2) - Full Supabase JWT authentication replacing Passport.js
- ✅ **Data migration complete** (Epic 8.3) - Infrastructure ready for production data transfer
- ✅ **API migration complete** (Epic 8.4) - All backend controllers using Supabase client
- ✅ **File storage complete** (Epic 8.5) - Supabase Storage with 5 buckets configured
- ✅ **Row Level Security complete** (Epic 8.6) - Comprehensive multi-tenant security policies
- ✅ **Real-time features complete** (Epic 8.7) - Full real-time subscription system with React hooks
- ✅ **React frontend integration complete** (Epic 8.8) - Full Supabase client integration
- ✅ **TypeScript integration complete** (Epic 8.9) - Complete type safety

**NEW TECHNICAL ACHIEVEMENTS (January 2025):**
- ✅ **Performance Optimization Complete** (Epic 8.25) - Bundle analysis, component splitting, automated monitoring
- ✅ **Payment System Complete** (Epic 2) - Full CRUD payment management with dashboard
- ✅ **Quality Assurance Enhanced** - Regression testing, performance budgets, CI/CD automation

**Current Architecture:**
- **Database**: Supabase PostgreSQL with 16 core tables, RLS policies, performance indexes
- **Authentication**: Unified Supabase Auth with JWT tokens (frontend + backend)
- **API**: Express.js backend with Supabase client (all controllers migrated) + comprehensive service layer
- **Storage**: Supabase Storage buckets (profiles, resources, audio-notes, documents, session-files)
- **Real-time**: Comprehensive subscription system with authentication-based filtering
- **Frontend**: React with Supabase client integration **+ performance-optimized architecture**
- **Payment Management**: Complete payment system with backend controllers, frontend dashboard, and database integration
- **Performance**: Automated bundle analysis, component splitting, CI/CD monitoring
- **Quality**: Regression testing, performance budgets, comprehensive documentation

**Key Files:**
- Database: `supabase/migrations/*.sql` (5 migration files)
- Auth: `server/src/middleware/supabaseAuth.ts`, `client/src/lib/api.ts`
- Real-time: `client/src/services/realtimeService.ts`, `client/src/hooks/useRealtime.ts`
- Storage: `server/src/lib/storageAdapter.ts`, `server/src/lib/supabaseFileStorage.ts`
- **Payment**: `server/src/controllers/paymentController.ts`, `client/src/services/paymentService.ts`, `client/src/components/payment/PaymentDashboard.tsx`
- **Performance**: `.github/workflows/performance.yml`, `client/performance-optimization-report.md`, `docs/performance-budgets.md`
- **Testing**: `client/src/__tests__/auth-context-regression.test.tsx`
- Config: `supabase/config.toml`, `.env` files, `lighthouserc.json`

**Next Phase**: Epic 3.4 - Reflection Notifications (final subtask to complete Epic 3).

Development setup: Project structure using npm workspaces (`client`, `server`). Configuration managed via .env files (including Supabase URL/keys). **Supabase CLI** for database management and local development. **Migration Status**: **Complete - All backend and frontend integration finished**. **CI/CD pipeline with GitHub Actions** (`.github/workflows/performance.yml`, `.github/workflows/typecheck.yml`) **with automated performance budget enforcement**. TypeScript (`5.8.3`) for type checking (client check: `npm --workspace client run typecheck`). Client TS config isolated via `client/tsconfig.json` extending `client/tsconfig.base.json`. Root `package.json` uses `overrides` for TS and React types. **Performance monitoring via automated bundle analysis and Lighthouse CI**.

Technical constraints: Application must be bilingual (Hebrew/RTL default, English/LTR secondary). Must meet WCAG 2.1 AA accessibility guidelines. No real-time chat, integrated payments, or automatic calendar sync (within MVP). High security standards required (**now handled by Supabase RLS policies**, HTTPS). **Mobile performance optimization required for low-end devices and poor network conditions - now optimized with component splitting and bundle analysis**.

Dependencies:
- **Key Libraries:** `react@^18.3.1`, `react-dom@^18.3.1`, `react-router-dom@^6.30.0`, `tailwindcss@^3.4.11`, `i18next@^25.0.1`, **`@supabase/supabase-js@^2.49.4`** (primary), `typescript@5.8.3`, `vite@^5.4.1`.
- **React Types:** `@types/react@18.3.20`, `@types/react-dom@18.3.7` (exact versions, client dev dep).
- **UI/Utils (Client):** `@radix-ui/*`, `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tailwindcss-animate`, `zod`, `react-hook-form`, `embla-carousel-react`, `react-day-picker`, `date-fns`, `recharts`, `sonner`, `input-otp`, `vaul`.
- **Performance (NEW):** `bundlesize2`, `@lhci/cli`, `rollup-plugin-visualizer`, `vite-plugin-compression2`, `size-limit` (bundle analysis and monitoring).
- **Server/Performance:** `redis`, `compression`, `node-cache`, `express-rate-limit`, `helmet` (legacy, being phased out).
- **Build Optimization:** `rollup-plugin-visualizer`, `vite-plugin-compression2`.
- **Node.js:** `>= 20.0.0` required for development and deployment.
- **Native:** Capacitor (`@capacitor/core@^7.2.0`, `@capacitor/cli@^7.2.0`, etc.).

Tool usage patterns: Development involves interaction with AI code generation tools requiring review. Standard code editors and version control (Git). **Supabase Dashboard/CLI** for backend configuration and schema management (primary). TypeScript (`5.8.3`) for type checking. ESLint for code quality. **GitHub Actions for CI/CD** (using `npm --workspace client run typecheck`) **with automated performance budget enforcement via Lighthouse CI and bundle size monitoring**. Npm workspaces and overrides for dependency management. Redis for caching frequently accessed data. **Supabase local development** with `supabase start/stop/db reset`. **Bundle analyzer for optimizing JS bundle size - now automated in CI/CD**.

# Technical Context

## 🚀 **Current Architecture: Production-Ready with Performance Optimization**

**Migration Status**: Epic 8 - Technical Excellence & Supabase Migration
- ✅ **8.1: Database Schema Migration** - Complete unified schema ready
- ✅ **8.2: Authentication Migration** - Complete JWT-based Supabase Auth
- ✅ **8.3: Data Migration Infrastructure** - Complete migration scripts ready
- ✅ **8.4: API Migration** - Complete backend using Supabase client
- ✅ **8.5: File Storage Migration** - Complete Supabase Storage integration
- ✅ **8.6: Row Level Security** - Complete multi-tenant security policies
- ✅ **8.7: Real-time Features** - Complete subscription system with React hooks
- ✅ **8.8: React Frontend Integration** - Complete Supabase client integration
- ✅ **8.9: TypeScript Integration** - Complete type safety and schema integration

**NEW: Epic 8.25 - Performance Optimization & Technical Excellence**
- ✅ **Bundle Analysis & Optimization** - Comprehensive bundle analysis with optimization strategies
- ✅ **Component Architecture Refactoring** - Large component splitting with React.lazy()
- ✅ **Automated Performance Monitoring** - CI/CD enforcement with GitHub Actions
- ✅ **Performance Documentation** - Comprehensive guides and emergency procedures

**NEW: Epic 2 - Session & Scheduling Management (Complete)**
- ✅ **Payment Management System** - Full CRUD operations with comprehensive dashboard
- ✅ **Backend Integration** - Complete payment controllers and API routes
- ✅ **Frontend Dashboard** - Feature-rich payment tracking and management UI
- ✅ **Database Integration** - Proper Supabase relationships and data flow

## Core Technologies

*   **Frontend (Performance-Optimized):**
    *   Framework: React 18 with TypeScript
    *   Build Tool: Vite **with advanced performance optimization**
    *   **Performance**: Bundle analysis, component splitting, lazy loading, compression (brotli/gzip)
    *   **Monitoring**: Automated Lighthouse CI, bundle size enforcement, Core Web Vitals tracking
    *   Styling: Tailwind CSS (with `tailwindcss-animate`, `tailwindcss-rtl`)
    *   State Management/Data Fetching: **Supabase client with real-time subscriptions** (fully migrated from `@tanstack/react-query`)
    *   Routing: `react-router-dom` v6
    *   Forms: `react-hook-form` with `zod` for validation
    *   UI Components: Radix UI primitives, custom components, `lucide-react` icons, `sonner` for toasts, `recharts` for charts.
    *   i18n: `i18next`, `react-i18next`
    *   Mobile: Capacitor (Core, Network, potentially others)
    *   **Real-time**: Custom hooks (`useRealtime.ts`) for live data subscriptions
    *   **Quality**: Regression testing with comprehensive auth context mocking

*   **Backend (Complete Supabase Architecture):**
    *   **Database**: Supabase PostgreSQL with comprehensive schema (16 tables)
    *   **Authentication**: Supabase Auth with JWT tokens (complete)
    *   **Storage**: Supabase Storage with 5 buckets (profiles, resources, audio-notes, documents, session-files)
    *   **Real-time**: Supabase real-time subscriptions with authentication-based filtering
    *   **Security**: Row Level Security (RLS) policies for multi-tenant access (complete)
    *   **Functions**: Supabase Edge Functions (for complex operations)
    *   **API**: Express.js backend using Supabase client (all controllers migrated)
    *   **Payment Processing**: Complete payment management system with dedicated controllers and services
    *   **Performance**: Optimized queries, caching, and database indexing

*   **Backend (Legacy - Fully Migrated):**
    *   ✅ All legacy systems successfully migrated to Supabase architecture

*   **Shared:** TypeScript types defined in `shared/` directory (updated for Supabase).

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

## Performance Architecture (NEW)

### **Bundle Optimization**
- **Component Splitting**: Large monolithic components refactored with React.lazy()
- **Example**: 1,672-line `NotesList.tsx` → `NotesListOptimized.tsx` + `NotesListCore.tsx`
- **Lazy Loading**: Heavy components (NoteEditor, NoteViewer, AnalyticsDashboard) loaded on-demand
- **Compression**: Brotli + Gzip achieving 60-70% size reduction
- **Vendor Chunking**: Strategic separation of React, charts, and other vendor libraries

### **Automated Monitoring**
- **CI/CD Integration**: GitHub Actions workflow (`.github/workflows/performance.yml`)
- **Bundle Size Enforcement**: Automated checks prevent performance regressions
- **Lighthouse CI**: Performance, accessibility, and SEO auditing on every PR
- **Performance Budgets**: Strict thresholds for bundle sizes and Core Web Vitals
  - App Components: < 90 kB gzipped
  - Vendor React: < 120 kB gzipped
  - Vendor Charts: < 50 kB gzipped
  - CSS Total: < 25 kB gzipped

### **Documentation & Procedures**
- **Performance Budgets**: Comprehensive guide (`docs/performance-budgets.md`)
- **Optimization Report**: Detailed analysis (`client/performance-optimization-report.md`)
- **Emergency Procedures**: Incident response for performance regressions

## Payment Management System (NEW)

### **Backend Architecture**
- **Controllers**: Dedicated `paymentController.ts` with full CRUD operations
- **Routes**: Comprehensive `paymentRoutes.ts` with RESTful endpoints
- **Service Layer**: Clean API integration with error handling and validation
- **Database Integration**: Proper Supabase relationships between payments, sessions, and users

### **Frontend Architecture**
- **Service Layer**: `paymentService.ts` providing clean API integration
- **Dashboard**: Feature-rich `PaymentDashboard.tsx` with filtering, sorting, and batch operations
- **Management**: Dedicated `PaymentPage.tsx` for comprehensive payment oversight
- **Mobile Optimization**: Responsive design with performance optimizations

### **Features**
- **Status Management**: Comprehensive payment status tracking (paid, pending, overdue, cancelled)
- **Batch Operations**: Efficient bulk status updates for multiple payments
- **Analytics**: Coach-specific payment summaries and insights
- **Client Management**: Payment filtering and search by client
- **History Tracking**: Complete payment history with session linking

## Development Setup & Tools

*   **Package Manager:** npm (using workspaces for `client` and `server`)
*   **Linting:** ESLint (with TypeScript plugin, Prettier integration)
*   **Formatting:** Prettier
*   **Type Checking:** TypeScript (`tsc`)
*   **Database Management:** **Supabase CLI** (`supabase start/stop/db reset/db push`)
*   **Performance Monitoring (NEW):**
    *   **Bundle Analysis**: `bundlesize2`, `size-limit`, `rollup-plugin-visualizer`
    *   **Lighthouse CI**: `@lhci/cli` for automated performance auditing
    *   **GitHub Actions**: Automated performance budget enforcement
*   **Testing:**
    *   Frontend: Vitest with `jsdom`, `@testing-library/react`
    *   **Regression Testing**: Auth context mocking, component testing improvements
    *   Backend: Jest (migrated to Supabase testing)
    *   RLS Tests: Vitest (`supabase/tests/rls.spec.ts`)
    *   Real-time Tests: Vitest (`client/src/tests/realtimeService.test.ts`)
*   **Version Control:** Git hosted on GitHub.
*   **CI/CD:** GitHub Actions (`.github/workflows/ci.yml`, `performance.yml`, `release-mobile.yml`).
*   **Deployment Target:** Vercel (configured via `vercel.json`) + Supabase hosted database.

## Technical Constraints & Considerations

*   **Node.js Version:** Requires v20+.
*   **Monorepo Structure:** Requires careful dependency management and build scripts using npm workspaces.
*   **Bilingual Support (Hebrew RTL):** Requires careful CSS handling (`tailwindcss-rtl`) and i18n implementation.
*   **Supabase Integration:** Environment variables must be configured for Supabase URL and anon key.
*   **TypeScript Strictness:** **Now enabled with complete type safety** across the entire application.
*   **Authentication Flow:** **Complete JWT-based Supabase Auth** with RLS policies.
*   **Database Choice:** **Primary: Supabase PostgreSQL**. Legacy systems fully migrated.
*   **Performance Requirements:** **Automated budgets enforce fast loading times and Core Web Vitals.**
*   **Mobile Performance:** **Optimized for low-end devices with component splitting and lazy loading.**

## Key Libraries & Dependencies (Highlights)

*   **`@supabase/supabase-js`**: Primary backend integration (database, auth, storage, real-time).
*   ~~`@tanstack/react-query`~~: **Fully migrated to Supabase client for data fetching**.
*   `radix-ui`: Foundation for many UI components.
*   `i18next`: Handles internationalization.
*   **Performance (NEW)**: `bundlesize2`, `@lhci/cli`, `rollup-plugin-visualizer`, `vite-plugin-compression2`, `size-limit`.
*   **Migrated/Removed**: ~~`express-session`~~, ~~`connect-pg-simple`~~, ~~`passport`~~, ~~`mongoose`~~, ~~`prisma`~~.
*   `vite`: Frontend build and development server **with performance optimization**.
*   `tailwindcss`: Utility-first CSS framework.
*   `capacitor`: For potential mobile app builds.

## Tool Usage Patterns

*   `npm run dev`: Starts client and server concurrently for local development.
*   `npm run build`: Builds both client and server for production **with performance optimization**.
*   **Performance Commands (NEW):**
    *   `npm run bundlesize`: Check bundle size limits
    *   `npm run lighthouse`: Run Lighthouse CI audits
    *   `npm run build:analyze`: Generate bundle composition analysis
*   `npm run install:all`: Installs dependencies for root and workspaces.
*   `npm run lint`: Runs ESLint checks.
*   `npm test`: Runs backend (Jest) and frontend (Vitest) tests **including regression tests**.
*   `npm run ci-all`: Used in GitHub Actions for linting, type checking, testing, **and performance monitoring**.
*   **`supabase start`**: Starts local Supabase instance for development.
*   **`supabase db reset`**: Applies all migrations to local database.
*   **`supabase db push`**: Pushes schema changes to remote database.
*   **`supabase gen types typescript`**: Generates TypeScript types from database schema.
*   `vercel dev`: Can be used for local testing of Vercel deployment environment.
