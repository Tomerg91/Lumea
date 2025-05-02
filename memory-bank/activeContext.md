# Active Context

Current work focus: Fixing Supabase connectivity issues, implementing user role selection during signup, and ensuring proper authentication flow in the application.

Recent changes:

- Fixed Supabase connectivity issues by implementing a new Supabase URL and API key
- Added a fallback mechanism for development environments when the primary Supabase project is unreachable
- Improved error handling for Supabase connection issues with clear user messaging
- Added role selection (coach/client) to the signup form for better user management
- Updated the profile creation process to store user roles in user metadata
- Addressed React import issues and TypeScript errors in the AuthContext component
- Fixed CI/CD pipeline by adding ESLint as a dev dependency to the server package
- Enhanced GitHub Actions workflow with explicit ESLint installation steps
- Downgraded ESLint to v8.57.0 to maintain compatibility with existing .eslintrc.json configuration
- Added required ESLint plugins (eslint-plugin-prettier, prettier, eslint-config-prettier) to fix linting process
- Completed extensive linting and formatting fixes: Addressed numerous ESLint/Prettier errors including require() calls, empty interfaces, react/prop-types, react/no-unescaped-entities, no-case-declarations, unused variables, and no-namespace issues.
- Configured ESLint and TypeScript: Adjusted `.eslintrc.json` with overrides for config files and specific rule allowances. Updated `tsconfig.json` include patterns to correctly parse config files. Explicitly set React version in ESLint settings.

Next steps:

- ✅ Address remaining ESLint errors (4): Parsing errors in `server/auth.ts`, `server/config/passport.ts`, and `server/middleware/auth.ts` have been resolved via ESLint overrides.
- 2. Address ESLint warnings (~170): Review and fix warnings, primarily related to `@typescript-eslint/no-explicit-any`.
- 3. Implement database schema for roles (Client, Coach, Admin) & status (pending, active), including RLS policies.
4. Design and implement the `GET /api/my-clients` endpoint (auth checks, role-based access, DB query).
5. Develop the `/dashboard/clients` ClientsPage UI to fetch and display the coach's clients.
6. Implement Client invitation mechanism: backend API, email invites, and frontend invitation UI.
7. Implement Admin creation and setup flows (pending coach approval, admin dashboard).
8. Implement Password Reset flow with email and secure token handling.
9. Refine Login/Signup UI and flow based on user roles, with dynamic redirects and tailored forms.

Active decisions and considerations:

- Using a new Supabase project with updated URL and API key
- Implementing a fallback mechanism for development to ensure continuous productivity
- Storing user roles in both user metadata and a profiles table/structure
- Developing with both online and poor-connectivity scenarios in mind
- Ensuring proper TypeScript configuration for React components
- Using targeted ESLint overrides in `.eslintrc.json` to handle specific file types (e.g., configs, declarations) and rule exceptions (`require`, `namespace`, `empty-interface`).

Important patterns and preferences:

- Robust error handling for network and API operations
- Clear user messaging for connection issues
- Role-based user management from signup
- Centralized Supabase client configuration with fallback options
- Following a specific color scheme (lumea-\* colors) for consistent styling
- Using TypeScript for type safety throughout the codebase
- Including config files (`*.config.ts`) in relevant `tsconfig.json` files.
- Disabling `react/prop-types` ESLint rule in TypeScript projects.
- Escaping HTML entities (like apostrophes, quotes) in JSX text nodes (`&apos;`, `&quot;`).
- Avoiding empty interfaces in TypeScript where `type` aliases can be used, except in declaration merging scenarios (like module/namespace augmentation).

Learnings and project insights:

- Supabase projects can become unavailable, requiring fallback mechanisms for development
- User roles should be captured during signup for proper user management
- Profile data can be stored in both user metadata and a dedicated profiles structure
- Authentication flows need careful TypeScript typing and error handling
- React imports and hook usage need consistent patterns for proper TypeScript compatibility
- Environment variables should be properly managed for different deployment environments
- Complex ESLint/TypeScript project configurations (monorepo structure with overrides and multiple tsconfigs) require careful setup to avoid parsing errors.
- ESLint rule interactions can sometimes mask underlying issues (e.g., React errors appearing after fixing unrelated issues). Explicit configuration (like React version) can help stabilize linting.

## Development Plan

1. Stabilization & Cleanup (1–2 days)
   - Fix ESLint parsing errors and warnings
   - Confirm clean Vercel build/deploy

2. User Roles & Auth Enhancements (3–4 days)
   - Design DB schema for roles (Client, Coach, Admin) & statuses with RLS policies
   - Build Client invitation API + email/UI flows
   - Create Admin approval flow (endpoint + dashboard UI)
   - Implement Password Reset endpoints, token handling, and UI
   - Refine Login/Signup UI based on user roles

3. Coach View Clients (2–3 days)
   - API: GET /api/my-clients with auth/role checks
   - UI: ClientsPage component in /dashboard
   - DB: Ensure users table has coach_id FK

4. Sessions CRUD (3–4 days)
   - DB: sessions table schema and migrations
   - API: REST endpoints for sessions (CRUD)
   - UI: Coach/Client session list and create/edit forms

5. Reflections (Text & Audio) (4–5 days)
   - DB: reflections table (text, audio_url links)
   - API: file upload handling and reflection endpoints
   - UI: text form and audio recording/playback (Capacitor permissions)

6. Private Coach Notes (2–3 days)
   - DB: coach_notes table schema
   - API: CRUD endpoints for coach notes
   - UI: Inline notes editor on session detail pages

7. Admin Approval Dashboard (1–2 days)
   - API: list and approve/reject coaches
   - UI: Simple Admin page for pending approvals

8. Testing & Accessibility (Ongoing)
   - Integration/e2e tests for vertical slices
   - WCAG 2.1 AA compliance audit
   - RTL verification for Hebrew layouts

9. Native App Container Prep (1–2 days)
   - Capacitor setup (icons, splash, permissions for microphone/storage)
   - Service Worker caching strategy review

10. Polish, Docs & Release
   - Update README with new endpoints and env vars
   - Document Cursor rule additions or adjustments
   - Bump version, tag v0.1.0, prepare release notes
