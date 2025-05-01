# Active Context

Current work focus: Fixing Supabase connectivity issues, implementing user role selection during signup, and ensuring proper authentication flow in the application.

Recent changes:
*   Fixed Supabase connectivity issues by implementing a new Supabase URL and API key
*   Added a fallback mechanism for development environments when the primary Supabase project is unreachable
*   Improved error handling for Supabase connection issues with clear user messaging
*   Added role selection (coach/client) to the signup form for better user management
*   Updated the profile creation process to store user roles in user metadata
*   Addressed React import issues and TypeScript errors in the AuthContext component
*   Fixed CI/CD pipeline by adding ESLint as a dev dependency to the server package
*   Enhanced GitHub Actions workflow with explicit ESLint installation steps
*   Downgraded ESLint to v8.57.0 to maintain compatibility with existing .eslintrc.json configuration
*   Added required ESLint plugins (eslint-plugin-prettier, prettier, eslint-config-prettier) to fix linting process

Next steps: 
1. Implement database schema for roles (Client, Coach, Admin) & status (pending, active)
2. Complete the "Coach views their Clients" vertical slice
3. Implement Client invitation mechanism (linked to Coach)
4. Enhance the profile management functionality
5. Address remaining TypeScript errors throughout the codebase

Active decisions and considerations:
*   Using a new Supabase project with updated URL and API key
*   Implementing a fallback mechanism for development to ensure continuous productivity
*   Storing user roles in both user metadata and a profiles table/structure
*   Developing with both online and poor-connectivity scenarios in mind
*   Ensuring proper TypeScript configuration for React components

Important patterns and preferences: 
* Robust error handling for network and API operations
* Clear user messaging for connection issues
* Role-based user management from signup
* Centralized Supabase client configuration with fallback options
* Following a specific color scheme (lumea-* colors) for consistent styling
* Using TypeScript for type safety throughout the codebase

Learnings and project insights: 
* Supabase projects can become unavailable, requiring fallback mechanisms for development
* User roles should be captured during signup for proper user management
* Profile data can be stored in both user metadata and a dedicated profiles structure
* Authentication flows need careful TypeScript typing and error handling
* React imports and hook usage need consistent patterns for proper TypeScript compatibility
* Environment variables should be properly managed for different deployment environments