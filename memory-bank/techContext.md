# Tech Context

Technologies used: Frontend: React, Tailwind CSS, i18next, Vite/CRA. Backend: **Supabase (PostgreSQL, Auth, Storage, APIs)**. Native Wrapper: Capacitor. ~~Node.js/Express role TBD (potentially for specific business logic or proxying).~~ (Node.js/Express backend likely deprecated for MVP in favor of Supabase features).

Development setup: Monorepo or separate client/server directories. Configuration managed via .env files (including Supabase URL/keys). Standard Node.js/npm/yarn toolchain for frontend. Supabase CLI or Dashboard for DB management. Basic testing setup likely needed.

Technical constraints: Application must be bilingual (Hebrew/RTL default, English/LTR secondary). Must meet WCAG 2.1 AA accessibility guidelines. No real-time chat, integrated payments, or automatic calendar sync (within MVP). High security standards required (handled largely by Supabase RLS, HTTPS).

Dependencies: Key libraries include react, react-router-dom, tailwindcss, i18next, **@supabase/supabase-js**. Capacitor plugins as needed.

Tool usage patterns: Development involves interaction with AI code generation tools requiring review. Standard code editors and version control (Git). Supabase Dashboard/CLI for backend configuration and schema management.