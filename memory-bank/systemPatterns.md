# System Patterns

## Architecture

Full-stack Progressive Web App (PWA) with a React TypeScript frontend, leveraging **Supabase for backend services (Auth, PostgreSQL DB, Storage, Realtime APIs)**. Node.js/Express backend for API endpoints and server-side logic. **The project is structured as an npm monorepo using workspaces (`client/`, `server/`).**

## Database Schema & Security

The database is designed with a secure, role-based access control system using **Supabase Row-Level Security (RLS)**.

```
┌─────────┐      ┌───────────┐       ┌────────────┐      ┌─────────────┐
│  roles  │◄────►│   users   │◄─────►│  sessions  │◄─────►│ reflections │
└─────────┘      └───────────┘       └────────────┘      └─────────────┘
                                           │
                                           ▼
                                    ┌─────────────┐
                                    │ coach_notes │
                                    └─────────────┘
```

Key tables and relationships:
- **roles**: Defines user types (`admin`, `coach`, `client`)
- **users**: User profiles linked to auth.users via auth_id
- **sessions**: Coaching sessions linking coaches and clients
- **reflections**: Client reflections on sessions
- **coach_notes**: Private coach notes for sessions

## Row-Level Security (RLS) Patterns

1. **Role-Based Access Control**:
   ```sql
   CREATE POLICY users_admin_all ON users
       FOR ALL
       TO authenticated
       USING (get_user_role() = 'admin');
   ```

2. **User-Based Ownership**:
   ```sql
   CREATE POLICY users_read_own ON users
       FOR SELECT
       TO authenticated
       USING (auth_id = auth.uid());
   ```

3. **Helper Functions for RLS**:
   ```sql
   CREATE OR REPLACE FUNCTION get_user_role()
   RETURNS TEXT AS $$
       -- Implementation that gets user role based on auth.uid()
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   ```

4. **Relationship-Based Access Control**:
   ```sql
   CREATE POLICY reflections_coach_all ON reflections
       FOR ALL
       TO authenticated
       USING (
           get_user_role() = 'coach' AND
           session_id IN (
               SELECT id FROM sessions 
               WHERE coach_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
           )
       );
   ```

## Component Implementation Pattern

1. Use TypeScript for all React components (.tsx extension)
2. Use proper type definitions for component props and state
3. Export components as default exports for compatibility with Fast Refresh
4. Use React.FC type sparingly (prefer explicit props interfaces)
5. Follow consistent pattern for hooks:
   ```typescript
   export function useCustomHook(): ReturnType {
     // Implementation
   }
   ```
6. Avoid exporting hooks as const assignments that are later renamed

## Authentication Flow

1. User enters credentials on the Auth page
2. Application performs connectivity checks before authentication attempts
3. Authentication request is sent to Supabase Auth API
4. On success, user session is stored and profile is fetched from the database
5. Role-based redirection occurs (coach vs client dashboard)
6. Role-Based Access Control (RBAC) is enforced via Supabase RLS policies

## Error Handling Pattern

1. Connectivity check before critical API operations
2. DNS resolution testing for network diagnostics
3. User-friendly error messages with troubleshooting steps
4. Retry mechanisms for transient issues
5. Centralized error handling in the authentication context
6. Clear loading states during async operations
7. TypeScript typing for error objects for better error handling

## TypeScript Type Safety Patterns

1. **Avoid `any` Type:** Replace with more specific types:
   ```typescript
   // ❌ Avoid
   function processData(data: any): any { ... }
   
   // ✅ Preferred
   function processData(data: Record<string, unknown>): DataResult { ... }
   ```

2. **Safe Type Casting:** Use two-step casting with `unknown` as intermediate:
   ```typescript
   // ❌ Avoid
   const result = data as ResultType;
   
   // ✅ Preferred 
   const result = data as unknown as ResultType;
   ```

3. **Type Guarding:** Use type guards to narrow unknown types:
   ```typescript
   if (error instanceof Error) {
     console.error(error.message);
   } else {
     console.error('Unknown error occurred');
   }
   ```

4. **Utility Functions for Type Conversion:**
   ```typescript
   // Convert string IDs to numbers safely
   function getNumericUserId(req: Request): number {
     const id = req.user?.id;
     return typeof id === 'string' ? parseInt(id, 10) : id;
   }
   ```

5. **Optional Chaining:** Use `?.` instead of non-null assertions:
   ```typescript
   // ❌ Avoid
   const role = req.user!.role;
   
   // ✅ Preferred
   const role = req.user?.role;
   ```

6. **Dynamic Object Types:** Use `Record<string, unknown>` for objects with dynamic keys:
   ```typescript
   const query: Record<string, unknown> = {};
   if (req.user?.role === 'coach') {
     query.coachId = req.user.id;
   }
   ```

7. **Proper Function Return Types:** Explicitly type function returns:
   ```typescript
   async function createUser(data: UserInput): Promise<Partial<IUser>> { ... }
   ```

8. **Type Declaration Files:** Use .d.ts files to extend existing types:
   ```typescript
   // In express.d.ts
   import 'express';
   
   declare global {
     namespace Express {
       interface User {
         id: string | number;
         role: 'coach' | 'client' | 'admin';
         // Additional properties
       }
     }
   }
   
   export {};
   ```

9. **Interface Augmentation:** Use declaration merging to extend third-party types:
   ```typescript
   // Extend the Session interface
   declare global {
     interface Session extends Express.Session {
       coachReflectionReminderSent?: boolean;
       // Additional properties
     }
   }
   ```

10. **Pragmatic TypeScript Configuration:** Selectively relax type checking for specific scenarios:
    ```json
    // tsconfig.json
    {
      "compilerOptions": {
        "noPropertyAccessFromIndexSignature": false,
        "strictNullChecks": false,
        // Additional options
      }
    }
    ```

11. **Targeted @ts-nocheck Pragmas:** Use selectively for complex files:
    ```typescript
    // @ts-nocheck
    // Complex file with challenging type issues
    ```

## UI Component Pattern

1. Consistent use of shadcn/ui component library
2. Custom Tailwind color scheme (lumea-\*)
3. Responsive design with mobile-first approach
4. Common error display patterns
5. Internationalization support in all components
6. Dark/light theme support
7. Debugging components with clear visibility styles when needed

## State Management

1. React Context API for authentication state
2. Local component state for UI interactions
3. Form state management with React Hook Form
4. Centralized Supabase client instance
5. Session persistence using Supabase auth persistence
6. Strongly typed state with TypeScript interfaces

## Data Flow

1. Supabase Auth for user authentication and session management
2. Database tables with proper relations (users, profiles, sessions)
3. Row Level Security (RLS) for data access control
4. RESTful API patterns for data operations
5. Strict type definitions with TypeScript
6. Type-safe API responses and request payloads

## Development Workflow

1. **Dependency Management:** Use npm workspaces. Enforce single versions of critical shared dependencies (like TS, React types) using root `package.json` `overrides` and exact version pinning in individual `package.json` files.
2. **TypeScript Configuration:** Use separate `tsconfig.json` files for root, client, and server. Isolate client config using `extends "./tsconfig.base.json"` pattern to prevent root interference.
3.  CI/CD pipeline with GitHub Actions for automated testing and deployment.
4.  TypeScript type checking for maintaining code quality (`npm --workspace client run typecheck`).
5.  ESLint for code style enforcement.
6.  Package scripts for common development tasks.
7.  Environment-specific configurations (.env files).

## Critical Implementation Paths

1. Robust authentication flow with proper error handling
2. Secure data access patterns with RLS policies
3. Comprehensive internationalization (i18n) support
4. Responsive UI components with proper accessibility
5. Environment configuration management
6. TypeScript type definitions for key interfaces and API responses

Key technical decisions: Utilizing PWA features for app-like experience and offline capabilities. Choosing React with TypeScript for type safety and better developer experience. Using functional components/hooks for the frontend. Employing Tailwind CSS for utility-first styling. Using i18next for robust internationalization (Hebrew/RTL first). **Relying on Supabase Auth and Row Level Security (RLS) for secure data access.** RESTful principles applied via Supabase auto-generated APIs.

Design patterns in use: MVC/MVVM patterns relevant to React frontend structure. Service Worker caching strategies (Cache First, Network First). State management patterns (Context API or libraries like Zustand/Redux Toolkit) needed for React frontend. TypeScript interface patterns for type safety. **Monorepo workspace pattern.** **Isolated TypeScript configuration pattern (`extends`).** **Role-based access control (RBAC) via RLS policies.**

Component relationships: Clear data relationships managed in Supabase tables: Coach manages Clients (via `coach_id` FK); Sessions link Coach and Client; Reflections link to Sessions/Clients; Resources managed by Coaches. Admin role oversees Coaches. Supabase Auth (`auth.users`) links to user profile data.

Critical implementation paths: Defining robust Supabase RLS policies for all tables. Implementing comprehensive Hebrew/RTL support across the entire UI. Setting up Supabase Storage and policies for secure file uploads. Encrypting sensitive data at rest (potentially using Supabase features or application-level encryption if needed). Implementing functional offline capabilities via Service Worker (primarily for UI shell and read-only data). Ensuring TypeScript type safety throughout the codebase.
