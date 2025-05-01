# Tech Context

Technologies used: Frontend: React with TypeScript, Tailwind CSS, i18next, Vite. Backend: **Supabase (PostgreSQL, Auth, Storage, APIs)**. Native Wrapper: Capacitor. Node.js/Express for backend API endpoints and server-side logic.

Development setup: Project structure with client and server directories. Configuration managed via .env files (including Supabase URL/keys). Standard Node.js/npm toolchain for frontend and backend. Supabase CLI or Dashboard for DB management. CI/CD pipeline with GitHub Actions. TypeScript for type checking and improved developer experience.

Technical constraints: Application must be bilingual (Hebrew/RTL default, English/LTR secondary). Must meet WCAG 2.1 AA accessibility guidelines. No real-time chat, integrated payments, or automatic calendar sync (within MVP). High security standards required (handled largely by Supabase RLS, HTTPS). Must work with TypeScript strictness settings.

Dependencies: Key libraries include react, react-router-dom, tailwindcss, i18next, **@supabase/supabase-js**, typescript, vite. Node.js ≥ 20 required for development and deployment. Capacitor plugins as needed.

Tool usage patterns: Development involves interaction with AI code generation tools requiring review. Standard code editors and version control (Git). Supabase Dashboard/CLI for backend configuration and schema management. TypeScript for type checking. ESLint for code quality. GitHub Actions for CI/CD.