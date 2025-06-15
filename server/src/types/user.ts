// Re-export the Drizzle User type to be used across the server application.
// This establishes the Drizzle schema as the single source of truth for the user object.
export { User as AuthenticatedUser } from '../../../shared/schema';
