import { AuthenticatedUser } from './user';

declare global {
  namespace Express {
    // Augment the Express User type to be our Drizzle-based AuthenticatedUser
    // This makes req.user strongly-typed across the application.
    interface User extends AuthenticatedUser {}

    // Augment the Express Request type
    interface Request {
      user?: User;
    }
  }
}

export {};
