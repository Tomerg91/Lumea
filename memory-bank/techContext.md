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
