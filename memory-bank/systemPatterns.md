# System Patterns & Architecture

## Overview

The application follows a Monorepo architecture managed with npm workspaces, containing distinct `client` (frontend) and `server` (backend) applications, along with a `shared` directory for common types.

## Frontend (`client`)

*   **Framework:** React (Vite)
*   **Architecture:** Component-based architecture, likely using feature or page-based organization within `src/components` and `src/pages`.
*   **Data Fetching:** Primarily uses `@tanstack/react-query` for server state management, caching, and synchronization.
*   **Routing:** Client-side routing handled by `react-router-dom`.
*   **Styling:** Tailwind CSS utility-first approach, potentially augmented with custom components styled via `@apply` or CSS-in-JS if needed (though utility-first is preferred). Radix UI provides unstyled primitives.
*   **State Management:** Likely relies on `@tanstack/react-query` for server state and React Context API or potentially Zustand/Jotai for global UI state if needed (though not explicitly listed as a primary tool).
*   **Internationalization:** `i18next` is used for bilingual (Hebrew RTL / English LTR) support.
*   **Build:** Vite handles development server and production builds.

## Backend (`server`)

*   **Framework:** Express.js on Node.js.
*   **Architecture:** Likely a RESTful API structure, with routes defined in `src/routes`, controllers in `src/controllers`, and models in `src/models` (Mongoose).
*   **Authentication:** Session-based authentication managed by `express-session` (with `connect-pg-simple` for PostgreSQL session storage) and `passport` (local strategy).
*   **Database Interaction:** Mongoose ODM for MongoDB. Supabase PostgreSQL used for session storage and potentially RLS testing.
*   **API Structure:** Routes are organized by resource/feature (e.g., `auth`, `sessions`, `admin`).
*   **Middleware:** Custom middleware for authentication (`isAuthenticated`), role checks (`isCoach`, `isAdmin`), potentially caching, and error handling.
*   **Deployment Structure (Vercel):** Designed to run as serverless functions. An entry point `server/api/index.ts` exports the Express app. `vercel.json` routes `/api/*` requests to this entry point.

## Shared (`shared`)

*   Contains TypeScript types and potentially utility functions shared between the client and server to ensure consistency.

## Data Flow

1.  Client makes API requests to the backend (via `client/src/lib/api.ts` using `apiFetch`).
2.  Backend Express routes handle requests, often using middleware for authentication/authorization.
3.  Controllers process requests, interact with services/models.
4.  Models (Mongoose) interact with the MongoDB database.
5.  Backend sends JSON responses back to the client.
6.  Client uses `@tanstack/react-query` to manage the fetched data, caching, and UI updates.

## Key Technical Decisions & Patterns

*   **Monorepo:** Simplifies dependency management and type sharing but requires workspace-aware tooling (npm workspaces).
*   **TypeScript End-to-End:** Enhances type safety but requires careful configuration (`tsconfig.json`) and handling of types, especially with third-party libraries like Express/Passport.
*   **Serverless Backend on Vercel:** Leverages Vercel's platform but requires structuring the Express app accordingly.
*   **Session-Based Authentication with DB Store:** Provides stateful authentication, persisting sessions in PostgreSQL.
*   **Utility-First CSS (Tailwind):** Promotes rapid UI development and consistency.
*   **Query-Based Data Fetching (`@tanstack/react-query`):** Simplifies server state management on the frontend.

## Areas for Improvement / Review

*   **Backend Type Safety:** The current lack of strict TypeScript checking and the build errors related to `req.user` indicate a critical need for refactoring middleware and enforcing stricter types.
*   **Vercel Serverless Adaptation:** The Express server structure needs verification to ensure it functions correctly in a serverless context.
*   **Error Handling:** Centralized error handling exists, but integration with external logging services is needed for production.
*   **Database Schema/Queries:** Not reviewed in detail; potential optimization opportunities exist (see `PERFORMANCE_IMPROVEMENTS.md`).
*   **Testing Strategy:** While unit tests exist, comprehensive integration and E2E tests, especially covering deployed Vercel behavior, are likely needed.
