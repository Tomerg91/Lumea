# System Patterns & Architecture

## Overview

The application follows a Monorepo architecture managed with npm workspaces, containing distinct `client` (frontend) and `server` (backend) applications, along with a `shared` directory for common types. **The system now implements enterprise-grade security patterns with comprehensive vulnerability remediation.**

## Security Architecture (Enterprise-Grade)

### 🔒 **Encryption & Data Protection**
- **Encryption Service**: Custom `EncryptionService` using AES-256-CBC with random IV generation
- **Data-at-Rest**: All sensitive data (coach notes) encrypted with unique IVs per operation
- **Key Management**: 32-byte hex encryption keys with format validation
- **Migration Support**: Secure migration scripts for transitioning existing encrypted data

### 🛡️ **Authentication & Authorization**
- **Strong Password Policy**: 12+ character minimum with complexity requirements
  - Uppercase, lowercase, number, and special character mandatory
  - Applied to registration, password reset, and updates
- **Secret Management**: Zero default fallbacks, mandatory environment configuration
- **JWT Security**: Separate access/refresh tokens with secure random secrets
- **Session Security**: Hardened session configuration with secure cookies

### 🌐 **Network Security**
- **CORS Hardening**: Strict origin validation
  - Production: Only specific CLIENT_URL allowed
  - Development: Controlled localhost access only
  - No permissive origin allowance
- **Request Validation**: Comprehensive input validation and sanitization
- **Rate Limiting**: Multi-tier protection against abuse

### 🔍 **Environment & Configuration Security**
- **Startup Validation**: Comprehensive environment variable checks
- **Production Safeguards**: Specific validation for production deployments
- **Secret Validation**: Detection and rejection of default/weak secrets
- **Fail-Fast Approach**: Application terminates if security requirements not met

### 📋 **Security Documentation & Migration**
- **Setup Guides**: Complete security configuration instructions
- **Migration Scripts**: Safe transition tools for existing data
- **Audit Reports**: Detailed vulnerability analysis and remediation
- **Emergency Procedures**: Critical fix guides for immediate response

## Frontend (`client`)

*   **Framework:** React (Vite)
*   **Architecture:** Component-based architecture, likely using feature or page-based organization within `src/components` and `src/pages`.
*   **Data Fetching:** Primarily uses `@tanstack/react-query` for server state management, caching, and synchronization.
*   **Routing:** Client-side routing handled by `react-router-dom`.
*   **Styling:** Tailwind CSS utility-first approach, potentially augmented with custom components styled via `@apply` or CSS-in-JS if needed (though utility-first is preferred). Radix UI provides unstyled primitives.
*   **State Management:** Likely relies on `@tanstack/react-query` for server state and React Context API or potentially Zustand/Jotai for global UI state if needed (though not explicitly listed as a primary tool).
*   **Internationalization:** `i18next` is used for bilingual (Hebrew RTL / English LTR) support.
*   **Build:** Vite handles development server and production builds.
*   **Security:** CORS-protected API communication, secure authentication flows

## Backend (`server`)

*   **Framework:** Express.js on Node.js.
*   **Architecture:** Likely a RESTful API structure, with routes defined in `src/routes`, controllers in `src/controllers`. Models in `src/models` (Mongoose) are for legacy data structures, while newer developments, particularly around user management and authentication, utilize Prisma (`prisma/schema.prisma`).
*   **Authentication:** Session-based authentication managed by `express-session` (with `connect-pg-simple` for PostgreSQL session storage) and `passport`. Newer Passport strategies (e.g., local strategy for login) are increasingly implemented using Prisma for user data retrieval and validation.
*   **Database Interaction:** Mongoose ODM for MongoDB (legacy parts). Prisma ORM for PostgreSQL is used for core user data management (authentication, user profiles) and session storage. Supabase PostgreSQL also serves for RLS testing.
*   **API Structure:** Routes are organized by resource/feature (e.g., `auth`, `sessions`, `admin`, `users`).
*   **Middleware:** Custom middleware for authentication (`isAuthenticated`), role checks (`isCoach`, `isAdmin`), potentially caching, and error handling.
*   **Deployment Structure (Vercel):** Designed to run as serverless functions. An entry point `server/api/index.ts` exports the Express app. `vercel.json` routes `/api/*` requests to this entry point.
*   **Security:** Enterprise-grade encryption, environment validation, secure secret management

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
*   **Dual ORM/ODM Strategy:** The project currently utilizes Mongoose for some existing data models and Prisma for newer user management and authentication features. This requires careful management of data consistency and type compatibility (e.g., via shared interfaces like `AuthenticatedUserPayload`).
*   **Serverless Backend on Vercel:** Leverages Vercel's platform but requires structuring the Express app accordingly.
*   **Session-Based Authentication with DB Store:** Provides stateful authentication, persisting sessions in PostgreSQL.
*   **Utility-First CSS (Tailwind):** Promotes rapid UI development and consistency.
*   **Query-Based Data Fetching (`@tanstack/react-query`):** Simplifies server state management on the frontend.
*   **Security-First Architecture:** Enterprise-grade security patterns with defense-in-depth approach
*   **Zero-Default Security:** No fallback values, mandatory secure configuration

## Security Implementation Patterns

### **Encryption Pattern**
```typescript
// Secure encryption with random IV
const { encrypted, iv } = EncryptionService.encrypt(sensitiveData);
// Store both encrypted data and IV
model.encryptedField = encrypted;
model.encryptionIV = iv;
```

### **Environment Validation Pattern**
```typescript
// Fail-fast validation at startup
if (!process.env.REQUIRED_SECRET) {
  console.error('FATAL ERROR: Required secret missing');
  process.exit(1);
}
```

### **CORS Security Pattern**
```typescript
// Strict origin validation
origin: (origin, callback) => {
  if (process.env.NODE_ENV === 'production') {
    return origin === process.env.CLIENT_URL ? 
      callback(null, true) : callback(new Error('Not allowed by CORS'));
  }
  // Development: controlled access only
}
```

### **Password Validation Pattern**
```typescript
// Strong password requirements
password: z.string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, 
         'Must contain uppercase, lowercase, number, and special character')
```

## Areas for Improvement / Review

*   **Backend Type Safety:** While recent efforts resolved critical build errors related to `req.user` and aligned `AuthenticatedUserPayload` with Prisma, ongoing vigilance is needed. The coexistence of Mongoose and Prisma presents potential complexities for type consistency.
*   **Mongoose to Prisma Migration:** Consideration should be given to a long-term strategy for migrating remaining Mongoose models to Prisma if full consistency is desired, or clearly delineating the responsibilities of each ORM/ODM.
*   **Vercel Serverless Adaptation:** The Express server structure needs verification to ensure it functions correctly in a serverless context.
*   **Error Handling:** Centralized error handling exists, but integration with external logging services is needed for production.
*   **Database Schema/Queries:** Not reviewed in detail; potential optimization opportunities exist (see `PERFORMANCE_IMPROVEMENTS.md`).
*   **Testing Strategy:** While unit tests exist, comprehensive integration and E2E tests, especially covering deployed Vercel behavior, are likely needed.
*   **Security Monitoring:** Consider implementing security event logging and monitoring for production environments.
*   **Secret Rotation:** Implement automated secret rotation procedures for long-term security maintenance.

## Security Compliance & Standards

*   **Data Protection:** AES-256-CBC encryption with random IVs meets enterprise security standards
*   **Authentication:** Strong password policies exceed common security requirements
*   **Network Security:** Strict CORS policies prevent cross-origin attacks
*   **Configuration Security:** Mandatory environment validation prevents misconfigurations
*   **Documentation:** Comprehensive security setup and migration guides ensure proper implementation
