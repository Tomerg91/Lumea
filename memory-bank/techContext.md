# Tech Context

**✅ UPDATE: Deployment Infrastructure Fully Operational**

**Current Status**: Platform fully operational with all deployment configurations working correctly. Recent deployment fixes have resolved all critical infrastructure issues.

**Recent Fixes**: Railway healthcheck and Netlify build issues resolved, ensuring reliable production deployments.

**Operational Endpoints**: All API endpoints fully operational with proper healthcheck monitoring and deployment automation.

## 🎯 **CURRENT TECHNICAL FOCUS AREAS**

### **1. Production Deployment Excellence (COMPLETED)**
- ✅ **Railway Configuration**: Added proper `/health` endpoint matching railway.json healthcheckPath
- ✅ **Netlify Build Process**: Fixed npm commands from `npm run install:all` to `npm install`
- ✅ **Healthcheck Monitoring**: Added comprehensive logging for deployment validation
- ✅ **Multi-Platform Support**: Both Railway and Netlify deployments fully operational

### **2. Platform Feature Development (ONGOING)**
Current development focus on Daily Intention feature integration and UI/UX modernization:
- Mobile loading experience optimization
- Performance testing and accessibility compliance
- Component documentation and design standards

### **3. Bilingual Enhancement (PARTIALLY COMPLETE - 1-2 hours remaining)**
Recent achievements in bilingual infrastructure:
- ✅ **LanguageContext Consolidation**: Replaced dual i18n systems with streamlined approach
- ✅ **Mobile Language Support**: Added Capacitor app restart for proper RTL/LTR switching
- ✅ **Settings Enhancement**: Migrated to proper Tabs component with language switcher
- ✅ **User Experience**: Added loading states and mobile restart notifications

Remaining work:
- Complete translation coverage audit
- RTL/LTR layout polish and mobile optimization
- Final mobile language switching enhancements

Technologies used: Frontend: React (`^18.3.1`) with TypeScript (`5.8.3`), Tailwind CSS (`^3.4.11`), i18next, Vite (`^5.4.1`) **with performance-first architecture**. Backend: **Supabase-first architecture** - **Supabase** for PostgreSQL database, JWT authentication, storage, and real-time features. **CRITICAL: Backend server currently DOWN/DISCONNECTED**. **Legacy systems fully migrated**: Node.js/Express API endpoints (migrated to Supabase), , MongoDB/Mongoose interactions (migrated). **Redis** still used for caching. Native Wrapper: Capacitor (`^7.2.0`). **NEW: Automated performance monitoring, comprehensive payment management system**.

Development setup: Project structure using npm workspaces (`client`, `server`). Configuration managed via .env files (including Supabase URL/keys). **Supabase CLI** for database management and local development. **GitHub Actions CI/CD** with automated performance budgets, bundle analysis, and quality gates. **CRITICAL ISSUE: Backend server connection completely broken, all API endpoints failing**.

**Migration Status**: 
- ✅ **Database schema complete** (Epic 8.1) - Unified Supabase PostgreSQL with RLS policies
- ✅ **Authentication complete** (Epic 8.2) - Full Supabase JWT authentication replacing Passport.js
- ✅ **Data migration complete** (Epic 8.3) - Infrastructure ready for production data transfer
- ✅ **API migration complete** (Epic 8.4) - All backend controllers using Supabase client **BUT INACCESSIBLE**
- ✅ **File storage complete** (Epic 8.5) - Supabase Storage with 5 buckets configured **BUT INACCESSIBLE**
- ✅ **Row Level Security complete** (Epic 8.6) - Comprehensive multi-tenant security policies **BUT INACCESSIBLE**
- ✅ **Real-time features complete** (Epic 8.7) - Full real-time subscription system with React hooks **BUT INACCESSIBLE**
- ✅ **React frontend integration complete** (Epic 8.8) - Full Supabase client integration **BUT BACKEND DOWN**
- ✅ **TypeScript integration complete** (Epic 8.9) - Complete type safety **BUT DATA ACCESS BROKEN**

**NEW TECHNICAL ACHIEVEMENTS (January 2025):**
- ✅ **Performance Optimization Complete** (Epic 8.25) - Bundle analysis, component splitting, automated monitoring
- ✅ **Payment System Complete** (Epic 2) - Full CRUD payment management with dashboard **BUT INACCESSIBLE**
- ✅ **Quality Assurance Enhanced** - Regression testing, performance budgets, CI/CD automation
- ✅ **Bilingual Infrastructure Enhanced** - Streamlined i18n system with mobile support

**Current Architecture (PARTIALLY FUNCTIONAL):**
- **Database**: Supabase PostgreSQL with 16 core tables, RLS policies, performance indexes **INACCESSIBLE**
- **Authentication**: Unified Supabase Auth with JWT tokens **BACKEND CONNECTION BROKEN**
- **API**: Express.js backend with Supabase client **SERVER DOWN/MISCONFIGURED**
- **Storage**: Supabase Storage buckets **INACCESSIBLE VIA BACKEND**
- **Real-time**: Comprehensive subscription system **BACKEND CONNECTION BROKEN**
- **Frontend**: React with Supabase client integration **FUNCTIONAL BUT DATA ACCESS BROKEN**
- **Payment Management**: Complete payment system **INACCESSIBLE**
- **Performance**: Automated bundle analysis, component splitting, CI/CD monitoring **FRONTEND ONLY**
- **Quality**: Regression testing, performance budgets, comprehensive documentation **PARTIALLY FUNCTIONAL**

**Key Files (AFFECTED BY BACKEND FAILURE):**
- Database: `supabase/migrations/*.sql` (5 migration files) **INACCESSIBLE**
- Auth: `server/src/middleware/supabaseAuth.ts`, `client/src/lib/api.ts` **API CALLS FAILING**
- Real-time: `client/src/services/realtimeService.ts`, `client/src/hooks/useRealtime.ts` **CONNECTION BROKEN**
- Storage: `server/src/lib/storageAdapter.ts`, `server/src/lib/supabaseFileStorage.ts` **INACCESSIBLE**
- **Payment**: `server/src/controllers/paymentController.ts`, `client/src/services/paymentService.ts`, `client/src/components/payment/PaymentDashboard.tsx` **API ENDPOINTS FAILING**
- **Performance**: `.github/workflows/performance.yml`, `client/performance-optimization-report.md`, `docs/performance-budgets.md` **FRONTEND MONITORING ONLY**
- **Testing**: `client/src/__tests__/auth-context-regression.test.tsx` **API INTEGRATION TESTS FAILING**
- Config: `supabase/config.toml`, `.env` files, `lighthouserc.json` **BACKEND CONFIG ISSUES**

**Next Phase**: **EMERGENCY BACKEND RECOVERY** → Mock Data Migration → Bilingual Enhancement Completion

Development setup: Project structure using npm workspaces (`client`, `server`). Configuration managed via .env files (including Supabase URL/keys). **Supabase CLI** for database management and local development. **Migration Status**: **Complete infrastructure but INACCESSIBLE due to backend connection failure**. **CI/CD pipeline with GitHub Actions** (`.github/workflows/performance.yml`, `.github/workflows/typecheck.yml`) **with automated performance budget enforcement** **PARTIALLY FUNCTIONAL**. TypeScript (`5.8.3`) for type checking (client check: `npm --workspace client run typecheck`). Client TS config isolated via `client/tsconfig.json` extending `client/tsconfig.base.json`. Root `package.json` uses `overrides` for TS and React types. **Performance monitoring via automated bundle analysis and Lighthouse CI** **FRONTEND ONLY**.

Technical constraints: Application must be bilingual (Hebrew/RTL default, English/LTR secondary). Must meet WCAG 2.1 AA accessibility guidelines. No real-time chat, integrated payments, or automatic calendar sync (within MVP). High security standards required (**now handled by Supabase RLS policies but INACCESSIBLE**, HTTPS). **Mobile performance optimization required for low-end devices and poor network conditions - now optimized with component splitting and bundle analysis**.

Dependencies:
- **Key Libraries:** `react@^18.3.1`, `react-dom@^18.3.1`, `react-router-dom@^6.30.0`, `tailwindcss@^3.4.11`, `i18next@^25.0.1`, **`@supabase/supabase-js@^2.49.4`** (primary **BUT BACKEND CONNECTION BROKEN**), `typescript@5.8.3`, `vite@^5.4.1`.
- **React Types:** `@types/react@18.3.20`, `@types/react-dom@18.3.7` (exact versions, client dev dep).
- **UI/Utils (Client):** `@radix-ui/*`, `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tailwindcss-animate`, `zod`, `react-hook-form`, `embla-carousel-react`, `react-day-picker`, `date-fns`, `recharts`, `sonner`, `input-otp`, `vaul`.
- **Performance (NEW):** `bundlesize2`, `@lhci/cli`, `rollup-plugin-visualizer`, `vite-plugin-compression2`, `size-limit` (bundle analysis and monitoring) **FRONTEND MONITORING FUNCTIONAL**.
- **Server/Performance:** `redis`, `compression`, `node-cache`, `express-rate-limit`, `helmet` **BACKEND SERVICES INACCESSIBLE**.
- **Build Optimization:** `rollup-plugin-visualizer`, `vite-plugin-compression2`.
- **Node.js:** `>= 20.0.0` required for development and deployment.
- **Native:** Capacitor (`@capacitor/core@^7.2.0`, `@capacitor/cli@^7.2.0`, etc.).

Tool usage patterns: Development involves interaction with AI code generation tools requiring review. Standard code editors and version control (Git). **Supabase Dashboard/CLI** for backend configuration and schema management **BACKEND CONNECTION REQUIRED**. TypeScript (`5.8.3`) for type checking. ESLint for code quality. **GitHub Actions for CI/CD** (using `npm --workspace client run typecheck`) **with automated performance budget enforcement via Lighthouse CI and bundle size monitoring** **PARTIALLY FUNCTIONAL**. Npm workspaces and overrides for dependency management. Redis for caching frequently accessed data **INACCESSIBLE**. **Supabase local development** with `supabase start/stop/db reset` **BACKEND CONNECTION ISSUES**. **Bundle analyzer for optimizing JS bundle size - now automated in CI/CD** **FRONTEND ONLY**.

# Technical Context

## 🚨 **CRITICAL ARCHITECTURE FAILURE: Backend Disconnection**

**Current Architecture**: Production-Ready with Performance Optimization **BUT BACKEND INACCESSIBLE**

**Migration Status**: Epic 8 - Technical Excellence & Supabase Migration
- ✅ **8.1: Database Schema Migration** - Complete unified schema **BUT INACCESSIBLE**
- ✅ **8.2: Authentication Migration** - Complete JWT-based Supabase Auth **BUT BACKEND DOWN**
- ✅ **8.3: Data Migration Infrastructure** - Complete migration scripts **BUT CONNECTION BROKEN**
- ✅ **8.4: API Migration** - Complete backend using Supabase client **BUT SERVER DOWN**
- ✅ **8.5: File Storage Migration** - Complete Supabase Storage integration **BUT INACCESSIBLE**
- ✅ **8.6: Row Level Security** - Complete multi-tenant security policies **BUT BACKEND DOWN**
- ✅ **8.7: Real-time Features** - Complete subscription system **BUT CONNECTION BROKEN**
- ✅ **8.8: React Frontend Integration** - Complete Supabase client integration **BUT API CALLS FAILING**
- ✅ **8.9: TypeScript Integration** - Complete type safety **BUT DATA ACCESS BROKEN**

**NEW: Epic 8.25 - Performance Optimization & Technical Excellence**
- ✅ **Bundle Analysis & Optimization** - Comprehensive bundle analysis **FRONTEND FUNCTIONAL**
- ✅ **Component Architecture Refactoring** - Large component splitting **FRONTEND FUNCTIONAL**
- ✅ **Automated Performance Monitoring** - CI/CD enforcement **PARTIALLY FUNCTIONAL**
- ✅ **Performance Documentation** - Comprehensive guides **DOCUMENTATION ACCESSIBLE**

**NEW: Epic 2 - Session & Scheduling Management**
- ✅ **Payment Management System** - Full CRUD operations **BUT API ENDPOINTS FAILING**
- ✅ **Backend Integration** - Complete payment controllers **BUT SERVER DOWN**
- ✅ **Frontend Dashboard** - Feature-rich payment tracking **BUT NO DATA ACCESS**
- ✅ **Database Integration** - Proper Supabase relationships **BUT INACCESSIBLE**

**NEW: Bilingual Infrastructure Enhancement**
- ✅ **LanguageContext Consolidation** - Streamlined dual i18n systems to unified approach
- ✅ **Mobile Language Support** - Added Capacitor app restart for proper RTL/LTR switching
- ✅ **Settings Enhancement** - Migrated to proper Tabs component with language switcher UI
- ✅ **User Experience** - Added loading states and mobile restart notifications

## Core Technologies

*   **Frontend (Performance-Optimized - FUNCTIONAL):**
    *   Framework: React 18 with TypeScript
    *   Build Tool: Vite **with advanced performance optimization**
    *   **Performance**: Bundle analysis, component splitting, lazy loading, compression (brotli/gzip) **FUNCTIONAL**
    *   **Monitoring**: Automated Lighthouse CI, bundle size enforcement, Core Web Vitals tracking **FRONTEND ONLY**
    *   Styling: Tailwind CSS (with `tailwindcss-animate`, `tailwindcss-rtl`)
    *   State Management/Data Fetching: **Supabase client with real-time subscriptions** **BUT BACKEND CONNECTION BROKEN**
    *   Routing: `react-router-dom` v6 **FUNCTIONAL**
    *   Forms: `react-hook-form` with `zod` for validation **FUNCTIONAL**
    *   UI Components: Radix UI primitives, custom components, `lucide-react` icons, `sonner` for toasts, `recharts` for charts **FUNCTIONAL**
    *   i18n: `i18next`, `react-i18next` **ENHANCED WITH MOBILE SUPPORT**
    *   Mobile: Capacitor (Core, Network, potentially others) **FUNCTIONAL**
    *   **Real-time**: Custom hooks (`useRealtime.ts`) for live data subscriptions **BUT CONNECTION BROKEN**
    *   **Quality**: Regression testing with comprehensive auth context mocking **FRONTEND TESTS FUNCTIONAL**

*   **Backend (Complete Supabase Architecture - INACCESSIBLE):**
    *   **Database**: Supabase PostgreSQL with comprehensive schema (16 tables) **INACCESSIBLE**
    *   **Authentication**: Supabase Auth with JWT tokens **BACKEND CONNECTION BROKEN**
    *   **Storage**: Supabase Storage with 5 buckets **INACCESSIBLE VIA BACKEND**
    *   **Real-time**: Supabase real-time subscriptions **CONNECTION BROKEN**
    *   **Security**: Row Level Security (RLS) policies **INACCESSIBLE**
    *   **Functions**: Supabase Edge Functions **INACCESSIBLE**
    *   **API**: Express.js backend using Supabase client **SERVER DOWN/MISCONFIGURED**
    *   **Payment Processing**: Complete payment management system **API ENDPOINTS FAILING**
    *   **Performance**: Optimized queries, caching, and database indexing **INACCESSIBLE**

*   **Backend (Legacy - Fully Migrated):**
    *   ✅ All legacy systems successfully migrated to Supabase architecture **BUT CURRENTLY INACCESSIBLE**

*   **Shared:** TypeScript types defined in `shared/` directory **FUNCTIONAL BUT DATA TYPES UNUSED DUE TO BACKEND FAILURE**.

## **Supabase Schema Overview (INACCESSIBLE)**

**16 Core Tables with Full RLS** **ALL INACCESSIBLE DUE TO BACKEND CONNECTION FAILURE**:
- `users` (extends auth.users), `sessions`, `payments`, `reflections`, `resources`, `resource_users`
- `coach_notes`, `files`, `notifications`, `calendar_integrations`, `calendar_events`
- `audit_logs`, `consents`, `password_reset_tokens`, `performance_metrics`, `session_feedback`

**Security Features** **INACCESSIBLE**:
- Multi-tenant RLS policies for coach-client data separation
- Comprehensive audit logging for compliance
- Automated triggers for data consistency
- Business logic functions for metrics and operations

**Storage Buckets** **INACCESSIBLE**:
- `profiles` (public), `resources` (private), `audio-notes` (private), `documents` (private), `session-files` (private)

**Real-time Features** **CONNECTION BROKEN**:
- Authentication-based automatic subscriptions
- Role-based filtering (coach vs client access)
- Privacy controls for coach notes (private vs shared)
- Connection management and cleanup
- Generic table subscription method

## Performance Architecture (PARTIALLY FUNCTIONAL)

### **Bundle Optimization (FUNCTIONAL)**
- **Component Splitting**: Large monolithic components refactored with React.lazy()
- **Example**: 1,672-line `NotesList.tsx` → `NotesListOptimized.tsx` + `NotesListCore.tsx`
- **Lazy Loading**: Heavy components (NoteEditor, NoteViewer, AnalyticsDashboard) loaded on-demand
- **Compression**: Brotli + Gzip achieving 60-70% size reduction
- **Vendor Chunking**: Strategic separation of React, charts, and other vendor libraries

### **Automated Monitoring (PARTIALLY FUNCTIONAL)**
- **CI/CD Integration**: GitHub Actions workflow (`.github/workflows/performance.yml`) **FUNCTIONAL**
- **Bundle Size Enforcement**: Automated checks prevent performance regressions **FUNCTIONAL**
- **Lighthouse CI**: Performance, accessibility, and SEO auditing **FRONTEND ONLY**
- **Performance Budgets**: Strict thresholds for bundle sizes and Core Web Vitals **FRONTEND MONITORING ONLY**

### **Documentation & Procedures (ACCESSIBLE)**
- **Performance Budgets**: Comprehensive guide (`docs/performance-budgets.md`)
- **Optimization Report**: Detailed analysis (`client/performance-optimization-report.md`)
- **Emergency Procedures**: Incident response for performance regressions

## Payment Management System (INACCESSIBLE)

### **Backend Architecture (SERVER DOWN)**
- **Controllers**: Dedicated `paymentController.ts` **INACCESSIBLE**
- **Routes**: Comprehensive `paymentRoutes.ts` **API ENDPOINTS FAILING**
- **Service Layer**: Clean API integration **CONNECTION BROKEN**
- **Database Integration**: Proper Supabase relationships **INACCESSIBLE**

### **Frontend Architecture (FUNCTIONAL BUT NO DATA)**
- **Service Layer**: `paymentService.ts` **API CALLS FAILING**
- **Dashboard**: Feature-rich `PaymentDashboard.tsx` **NO DATA ACCESS**
- **Management**: Dedicated `PaymentPage.tsx` **SHOWING MOCK DATA OR ERRORS**
- **Mobile Optimization**: Responsive design **FUNCTIONAL BUT NO DATA**

### **Features (INACCESSIBLE)**
- **Status Management**: Comprehensive payment status tracking **API CALLS FAILING**
- **Batch Operations**: Efficient bulk status updates **BACKEND DOWN**
- **Analytics**: Coach-specific payment summaries **NO DATA ACCESS**
- **Client Management**: Payment filtering and search **BACKEND INACCESSIBLE**
- **History Tracking**: Complete payment history **API ENDPOINTS FAILING**

## Development Setup & Tools

*   **Package Manager:** npm (using workspaces for `client` and `server`)
*   **Linting:** ESLint (with TypeScript plugin, Prettier integration) **FUNCTIONAL**
*   **Formatting:** Prettier **FUNCTIONAL**
*   **Type Checking:** TypeScript (`tsc`) **FUNCTIONAL**
*   **Database Management:** **Supabase CLI** (`supabase start/stop/db reset/db push`) **BACKEND CONNECTION REQUIRED**
*   **Performance Monitoring:**
    *   **Bundle Analysis**: `bundlesize2`, `size-limit`, `rollup-plugin-visualizer` **FUNCTIONAL**
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
*   **Migrated/Removed**: ~~`express-session`~~, ~~`connect-pg-simple`~~, ~~`passport`~~, ~~`mongoose`~~, 
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
