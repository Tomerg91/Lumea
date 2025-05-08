# Tech Context

Technologies used: Frontend: React (`^18.3.1`) with TypeScript (`5.8.3`), Tailwind CSS (`^3.4.11`), i18next, Vite (`^5.4.1`). Backend: **Supabase (PostgreSQL, Auth, Storage, APIs)**, **Redis** for caching, Express with compression middleware. Native Wrapper: Capacitor (`^7.2.0`). Node.js/Express for backend API endpoints and server-side logic.

Development setup: Project structure using npm workspaces (`client`, `server`). Configuration managed via .env files (including Supabase URL/keys). Standard Node.js/npm toolchain for frontend and backend. Supabase CLI or Dashboard for DB management. CI/CD pipeline with GitHub Actions (`.github/workflows/typecheck.yml`). TypeScript (`5.8.3`) for type checking (client check: `npm --workspace client run typecheck`). Client TS config isolated via `client/tsconfig.json` extending `client/tsconfig.base.json`. Root `package.json` uses `overrides` for TS and React types. Performance monitoring via custom metrics collection.

Technical constraints: Application must be bilingual (Hebrew/RTL default, English/LTR secondary). Must meet WCAG 2.1 AA accessibility guidelines. No real-time chat, integrated payments, or automatic calendar sync (within MVP). High security standards required (handled largely by Supabase RLS, HTTPS). Mobile performance optimization required for low-end devices and poor network conditions.

Dependencies:
- **Key Libraries:** `react@^18.3.1`, `react-dom@^18.3.1`, `react-router-dom@^6.30.0`, `tailwindcss@^3.4.11`, `i18next@^25.0.1`, **`@supabase/supabase-js@^2.49.4`**, `typescript@5.8.3`, `vite@^5.4.1`.
- **React Types:** `@types/react@18.3.20`, `@types/react-dom@18.3.7` (exact versions, client dev dep).
- **UI/Utils (Client):** `@radix-ui/*`, `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tailwindcss-animate`, `zod`, `react-hook-form`, `embla-carousel-react`, `react-day-picker`, `date-fns`, `recharts`, `sonner`, `input-otp`, `vaul`.
- **Server/Performance:** `redis`, `compression`, `node-cache`, `express-rate-limit`, `helmet`.
- **Build Optimization:** `rollup-plugin-visualizer`, `vite-plugin-compression2`.
- **Node.js:** `>= 20.0.0` required for development and deployment.
- **Native:** Capacitor (`@capacitor/core@^7.2.0`, `@capacitor/cli@^7.2.0`, etc.).

Tool usage patterns: Development involves interaction with AI code generation tools requiring review. Standard code editors and version control (Git). Supabase Dashboard/CLI for backend configuration and schema management. TypeScript (`5.8.3`) for type checking. ESLint for code quality. GitHub Actions for CI/CD (using `npm --workspace client run typecheck`). Npm workspaces and overrides for dependency management. Redis for caching frequently accessed data. MongoDB Compass for database query optimization. Bundle analyzer for optimizing JS bundle size.

# Technical Context

## Core Technologies

*   **Frontend:**
    *   Framework: React 18 with TypeScript
    *   Build Tool: Vite
    *   Styling: Tailwind CSS (with `tailwindcss-animate`, `tailwindcss-rtl`)
    *   State Management/Data Fetching: `@tanstack/react-query`
    *   Routing: `react-router-dom` v6
    *   Forms: `react-hook-form` with `zod` for validation
    *   UI Components: Radix UI primitives, custom components, `lucide-react` icons, `sonner` for toasts, `recharts` for charts.
    *   i18n: `i18next`, `react-i18next`
    *   Mobile: Capacitor (Core, Network, potentially others)
*   **Backend:**
    *   Runtime: Node.js (>= v20)
    *   Framework: Express.js with TypeScript
    *   Database: MongoDB Atlas (primary), Supabase PostgreSQL (used for RLS example/testing and potentially session storage)
    *   ODM: Mongoose (for MongoDB)
    *   Session Store: `connect-pg-simple` (using PostgreSQL)
    *   Authentication: Passport.js (Local strategy, potentially JWT involved), Session-based auth.
    *   File Storage: AWS S3 (optional), local uploads directory (`server/uploads`) as fallback.
    *   Email: Nodemailer via SMTP configuration.
*   **Shared:** TypeScript types defined in `shared/` directory.

## Development Setup & Tools

*   **Package Manager:** npm (using workspaces for `client` and `server`)
*   **Linting:** ESLint (with TypeScript plugin, Prettier integration)
*   **Formatting:** Prettier
*   **Type Checking:** TypeScript (`tsc`)
*   **Testing:**
    *   Frontend: Vitest with `jsdom`, `@testing-library/react`
    *   Backend: Jest (likely, based on `jest.config.js`)
    *   RLS Tests: Vitest (`supabase/tests/rls.spec.ts`)
*   **Version Control:** Git hosted on GitHub.
*   **CI/CD:** GitHub Actions (`.github/workflows/ci.yml`, `release-mobile.yml`).
*   **Deployment Target:** Vercel (configured via `vercel.json`).

## Technical Constraints & Considerations

*   **Node.js Version:** Requires v20+.
*   **Monorepo Structure:** Requires careful dependency management and build scripts using npm workspaces.
*   **Bilingual Support (Hebrew RTL):** Requires careful CSS handling (`tailwindcss-rtl`) and i18n implementation.
*   **Vercel Deployment:** Backend needs to function as serverless functions (structure initiated with `server/api/index.ts`). Environment variables must be configured in Vercel UI.
*   **TypeScript Strictness:** Currently disabled (`strict: false`). Enabling strict mode is a high-priority task for stability but will require significant code adjustments.
*   **Authentication Flow:** Session-based authentication is used, relying on cookies managed by `express-session` and `connect-pg-simple`.
*   **Database Choice:** Primarily MongoDB via Mongoose, but Supabase PostgreSQL is also involved (RLS testing, session storage). Ensure connection strings and access are correctly configured for deployment.

## Key Libraries & Dependencies (Highlights)

*   `@tanstack/react-query`: Central to frontend data fetching and caching.
*   `radix-ui`: Foundation for many UI components.
*   `i18next`: Handles internationalization.
*   `express-session` / `connect-pg-simple`: Manages user sessions on the backend.
*   `passport`: Handles authentication strategies.
*   `mongoose`: Interacts with MongoDB.
*   `vite`: Frontend build and development server.
*   `tailwindcss`: Utility-first CSS framework.
*   `capacitor`: For potential mobile app builds.

## Tool Usage Patterns

*   `npm run dev`: Starts client and server concurrently for local development.
*   `npm run build`: Builds both client and server for production (currently fails due to server TS errors).
*   `npm run install:all`: Installs dependencies for root and workspaces.
*   `npm run lint`: Runs ESLint checks.
*   `npm test`: Runs backend (Jest) and frontend (Vitest) tests.
*   `npm run ci-all`: Used in GitHub Actions for linting, type checking, and testing.
*   `supabase start/db reset`: Used for managing local Supabase instance.
*   `vercel dev`: Can be used for local testing of Vercel deployment environment.
